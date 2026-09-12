import JSZip from 'jszip';
import { ConsolidatedBOQResult, BOQItemRow } from '@/domains/infralens-boq/types';
import { midpoint } from '@/domains/infralens-boq/engine';

export interface BOQExportOptions {
  projectName?: string;
  cityLabel: string;
  verifiedDate: string;
  result: ConsolidatedBOQResult;
  allBoqItems?: BOQItemRow[];
}

/**
 * Escapes XML special characters for OpenXML cells.
 */
function escapeXml(unsafe: unknown): string {
  if (unsafe === null || unsafe === undefined) return '';
  const str = String(unsafe);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Converts a 0-indexed column index to Excel column letters (0 -> A, 1 -> B, 26 -> AA).
 */
function colIndexToLetters(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export type CellStyle = 
  | 'default' 
  | 'title' 
  | 'metaLabel' 
  | 'metaVal' 
  | 'sectionHeader' 
  | 'tableHeader' 
  | 'cellText' 
  | 'cellTextBold'
  | 'cellNum' 
  | 'cellNumBold' 
  | 'cellCenter' 
  | 'totalText' 
  | 'totalNum'
  | 'subtotalText'
  | 'subtotalNum';

const STYLE_INDEX_MAP: Record<CellStyle, number> = {
  default: 0,
  title: 1,
  tableHeader: 2,
  cellText: 3,
  cellNum: 4,
  cellCenter: 5,
  sectionHeader: 6,
  totalText: 7,
  totalNum: 8,
  metaLabel: 9,
  metaVal: 10,
  cellTextBold: 11,
  cellNumBold: 12,
  subtotalText: 13,
  subtotalNum: 14,
};

export interface SheetCell {
  val: string | number | null | undefined;
  formula?: string; // e.g. "D6*F6" or "SUM(G5:G24)"
  style?: CellStyle;
}

export interface SheetMerge {
  fromCol: number;
  fromRow: number;
  toCol: number;
  toRow: number;
}

export interface SheetDefinition {
  name: string;
  colWidths: number[];
  rows: SheetCell[][];
  merges?: SheetMerge[];
  freezeRow?: number; // 1-indexed row number up to which view is frozen
}

/**
 * Builds OpenXML styles.xml with professional fonts, borders, fills, and standard cellStyles.
 */
function buildStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="#,##0.00"/>
    <numFmt numFmtId="165" formatCode="#,##0"/>
  </numFmts>
  <fonts count="5">
    <!-- 0: Normal Regular -->
    <font>
      <sz val="10"/>
      <color rgb="FF1E293B"/>
      <name val="Segoe UI"/>
    </font>
    <!-- 1: Normal Bold -->
    <font>
      <b/>
      <sz val="10"/>
      <color rgb="FF0F172A"/>
      <name val="Segoe UI"/>
    </font>
    <!-- 2: Large Title Bold -->
    <font>
      <b/>
      <sz val="14"/>
      <color rgb="FF064E3B"/>
      <name val="Segoe UI"/>
    </font>
    <!-- 3: Table Header White Bold -->
    <font>
      <b/>
      <sz val="10"/>
      <color rgb="FFFFFFFF"/>
      <name val="Segoe UI"/>
    </font>
    <!-- 4: Section Subheader Bold -->
    <font>
      <b/>
      <sz val="11"/>
      <color rgb="FF065F46"/>
      <name val="Segoe UI"/>
    </font>
  </fonts>
  <fills count="7">
    <!-- 0: None -->
    <fill><patternFill patternType="none"/></fill>
    <!-- 1: Gray125 -->
    <fill><patternFill patternType="gray125"/></fill>
    <!-- 2: Emerald Dark Header (0F766E) -->
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F766E"/></patternFill></fill>
    <!-- 3: Light Emerald Tint (F0FDF4) -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFF0FDF4"/></patternFill></fill>
    <!-- 4: Total Row Amber (FEF3C7) -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/></patternFill></fill>
    <!-- 5: Meta Ice Blue (F8FAFC) -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>
    <!-- 6: Subtotal Soft Green (E6F4EA) -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFE6F4EA"/></patternFill></fill>
  </fills>
  <borders count="3">
    <!-- 0: None -->
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <!-- 1: Thin Gray Border -->
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
    </border>
    <!-- 2: Total Row Double Bottom Border -->
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="double"><color rgb="FF0F172A"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="15">
    <!-- 0: default -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <!-- 1: title -->
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1">
      <alignment vertical="center" indent="1"/>
    </xf>
    <!-- 2: tableHeader -->
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <!-- 3: cellText -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 4: cellNum -->
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 5: cellCenter -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 6: sectionHeader -->
    <xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1">
      <alignment vertical="center" indent="1"/>
    </xf>
    <!-- 7: totalText -->
    <xf numFmtId="0" fontId="1" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 8: totalNum -->
    <xf numFmtId="164" fontId="1" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 9: metaLabel -->
    <xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 10: metaVal -->
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyBorder="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 11: cellTextBold -->
    <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 12: cellNumBold -->
    <xf numFmtId="164" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 13: subtotalText -->
    <xf numFmtId="0" fontId="1" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 14: subtotalNum -->
    <xf numFmtId="164" fontId="1" fillId="6" borderId="1" xfId="0" applyFont="1" applyBorder="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
  </cellXfs>
  <!-- Required by ISO/IEC 29500 to prevent Excel repair warning -->
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;
}

/**
 * Builds the XML content for an individual worksheet.
 */
function buildWorksheetXml(sheet: SheetDefinition, isFirstSheet: boolean): string {
  let colsXml = '';
  if (sheet.colWidths && sheet.colWidths.length > 0) {
    colsXml = '<cols>' + sheet.colWidths.map((w, idx) => 
      `<col min="${idx + 1}" max="${idx + 1}" width="${w}" customWidth="1"/>`
    ).join('') + '</cols>';
  }

  let sheetViewsXml = '';
  if (isFirstSheet && (!sheet.freezeRow || sheet.freezeRow <= 0)) {
    sheetViewsXml = `
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0"/>
  </sheetViews>`;
  } else if (sheet.freezeRow && sheet.freezeRow > 0) {
    const tabSelectedAttr = isFirstSheet ? ' tabSelected="1"' : '';
    sheetViewsXml = `
  <sheetViews>
    <sheetView${tabSelectedAttr} workbookViewId="0">
      <pane ySplit="${sheet.freezeRow}" topLeftCell="A${sheet.freezeRow + 1}" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>`;
  } else {
    sheetViewsXml = `
  <sheetViews>
    <sheetView workbookViewId="0"/>
  </sheetViews>`;
  }

  let sheetDataXml = '<sheetData>';
  sheet.rows.forEach((row, rIdx) => {
    const rowNum = rIdx + 1;
    let rowCellsXml = '';
    row.forEach((cell, cIdx) => {
      if (!cell || (cell.val === undefined && cell.formula === undefined && !cell.style)) return;
      const ref = `${colIndexToLetters(cIdx)}${rowNum}`;
      const sIdx = cell.style ? (STYLE_INDEX_MAP[cell.style] ?? 0) : 0;

      if (cell.formula) {
        const valXml = (cell.val !== undefined && cell.val !== null) ? `<v>${cell.val}</v>` : '';
        rowCellsXml += `<c r="${ref}" s="${sIdx}"><f>${escapeXml(cell.formula)}</f>${valXml}</c>`;
      } else if (cell.val === null || cell.val === undefined || cell.val === '') {
        rowCellsXml += `<c r="${ref}" s="${sIdx}"/>`;
      } else if (typeof cell.val === 'number') {
        rowCellsXml += `<c r="${ref}" s="${sIdx}"><v>${cell.val}</v></c>`;
      } else {
        rowCellsXml += `<c r="${ref}" t="inlineStr" s="${sIdx}"><is><t>${escapeXml(cell.val)}</t></is></c>`;
      }
    });
    sheetDataXml += `<row r="${rowNum}" spans="1:${Math.max(sheet.colWidths.length, row.length)}">${rowCellsXml}</row>`;
  });
  sheetDataXml += '</sheetData>';

  let mergesXml = '';
  if (sheet.merges && sheet.merges.length > 0) {
    mergesXml = `<mergeCells count="${sheet.merges.length}">` + sheet.merges.map(m => {
      const ref = `${colIndexToLetters(m.fromCol)}${m.fromRow + 1}:${colIndexToLetters(m.toCol)}${m.toRow + 1}`;
      return `<mergeCell ref="${ref}"/>`;
    }).join('') + '</mergeCells>';
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${sheetViewsXml}
  <sheetFormatPr defaultRowHeight="20"/>
  ${colsXml}
  ${sheetDataXml}
  ${mergesXml}
</worksheet>`;
}

/**
 * Creates an OpenXML multi-tab .xlsx workbook as a Blob.
 */
async function generateExcelBlob(sheets: SheetDefinition[]): Promise<Blob> {
  const zip = new JSZip();

  // 1. [Content_Types].xml
  let contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`;

  sheets.forEach((_, idx) => {
    contentTypesXml += `\n  <Override PartName="/xl/worksheets/sheet${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
  });
  contentTypesXml += '\n</Types>';
  zip.file('[Content_Types].xml', contentTypesXml);

  // 2. _rels/.rels
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);

  // 3. xl/workbook.xml
  let workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>`;
  sheets.forEach((s, idx) => {
    workbookXml += `\n    <sheet name="${escapeXml(s.name)}" sheetId="${idx + 1}" r:id="rId${idx + 1}"/>`;
  });
  workbookXml += '\n  </sheets>\n</workbook>';
  zip.file('xl/workbook.xml', workbookXml);

  // 4. xl/_rels/workbook.xml.rels
  let workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`;
  sheets.forEach((_, idx) => {
    workbookRelsXml += `\n  <Relationship Id="rId${idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${idx + 1}.xml"/>`;
  });
  workbookRelsXml += `\n  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
  workbookRelsXml += '\n</Relationships>';
  zip.file('xl/_rels/workbook.xml.rels', workbookRelsXml);

  // 5. xl/styles.xml
  zip.file('xl/styles.xml', buildStylesXml());

  // 6. xl/worksheets/sheet{N}.xml
  sheets.forEach((sheet, idx) => {
    zip.file(`xl/worksheets/sheet${idx + 1}.xml`, buildWorksheetXml(sheet, idx === 0));
  });

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Trigger browser file download from Blob.
 * Converts to Data URL for files under 50MB to completely eliminate Chrome Blob URL
 * revocation timing bugs, which otherwise cause Chrome to save files as raw UUIDs
 * without file extensions in temporary cache.
 */
function triggerDownload(blob: Blob, filename: string) {
  // Sanitize filename for Windows filesystem safety
  const safeFilename = filename.trim().replace(/[<>:"/\\|?*]/g, '_');

  if (typeof window !== 'undefined' && typeof FileReader !== 'undefined') {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const link = document.createElement('a');
      link.style.display = 'none';
      link.setAttribute('href', dataUrl);
      link.setAttribute('download', safeFilename);
      link.download = safeFilename;
      link.rel = 'noopener';

      document.body.appendChild(link);

      try {
        link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      } catch {
        link.click();
      }

      // Keep link in DOM for 10 seconds so browser download manager has time to capture attributes
      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      }, 10000);
    };
    reader.readAsDataURL(blob);
  } else if (typeof window !== 'undefined') {
    // Fallback for environments without FileReader
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.setAttribute('href', url);
    link.setAttribute('download', safeFilename);
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();
    // Do NOT revoke immediately — wait 60 seconds
    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 60000);
  }
}

/**
 * Builds Sheet 1: Cost Summary
 */
function buildCostSummarySheet(options: BOQExportOptions): SheetDefinition {
  const { projectName = 'Project Estimate', cityLabel, verifiedDate, result } = options;
  const colWidths = [8, 38, 22, 24, 32];
  const rows: SheetCell[][] = [];
  const merges: SheetMerge[] = [];

  // Row: Title Block Header
  const titleRow = rows.length;
  rows.push([
    { val: 'PROJECT COST ESTIMATION & SUMMARY', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
  ]);
  merges.push({ fromCol: 0, fromRow: titleRow, toCol: 4, toRow: titleRow });

  // Row: Meta 1
  rows.push([
    { val: 'Project Name:', style: 'metaLabel' },
    { val: projectName, style: 'metaVal' },
    { val: 'Market Baseline:', style: 'metaLabel' },
    { val: `${cityLabel} (As of ${verifiedDate})`, style: 'metaVal' },
    { val: 'Currency: INR (₹)', style: 'metaVal' },
  ]);

  // Row: Meta 2
  rows.push([
    { val: 'Estimation Method:', style: 'metaLabel' },
    { val: 'CPWD Analysis of Rates Benchmark (Material + Labour + Machinery)', style: 'metaVal' },
    { val: 'Report Type:', style: 'metaLabel' },
    { val: 'Consolidated BOQ & Cost Waterfall', style: 'metaVal' },
    { val: 'Architecture Playbook v2', style: 'metaVal' },
  ]);

  // Row: Blank separator
  rows.push([]);

  // Section 1 Header (tracked dynamically)
  const sec1Row = rows.length;
  rows.push([
    { val: '1. DIRECT PROCUREMENT COSTS (BASE)', style: 'sectionHeader' },
    { val: '', style: 'sectionHeader' },
    { val: '', style: 'sectionHeader' },
    { val: '', style: 'sectionHeader' },
    { val: '', style: 'sectionHeader' },
  ]);
  merges.push({ fromCol: 0, fromRow: sec1Row, toCol: 4, toRow: sec1Row });

  // Table Header
  rows.push([
    { val: 'S.No', style: 'tableHeader' },
    { val: 'Cost Component', style: 'tableHeader' },
    { val: 'Market Benchmark Range (₹)', style: 'tableHeader' },
    { val: 'Active Procurement Cost (₹)', style: 'tableHeader' },
    { val: 'Component Notes / Basis', style: 'tableHeader' },
  ]);

  // Data rows
  const matEffective = result.materials.reduce((acc, m) => acc + m.effectiveCost, 0);
  const labEffective = result.labour.reduce((acc, l) => acc + l.effectiveCost, 0);
  const machCost = result.machineryTotal[0];

  const matRowIndex = rows.length + 1; // 1-indexed for Excel formula
  rows.push([
    { val: 1, style: 'cellCenter' },
    { val: 'Material Procurement Total', style: 'cellTextBold' },
    { val: `₹${result.marketMaterialTotal[0].toLocaleString('en-IN')} - ₹${result.marketMaterialTotal[1].toLocaleString('en-IN')}`, style: 'cellCenter' },
    { val: matEffective, style: 'cellNumBold' },
    { val: 'Aggregated raw material schedule with local market pricing', style: 'cellText' },
  ]);

  const labRowIndex = rows.length + 1;
  rows.push([
    { val: 2, style: 'cellCenter' },
    { val: 'Labour Deployment Total', style: 'cellTextBold' },
    { val: `₹${result.marketLabourTotal[0].toLocaleString('en-IN')} - ₹${result.marketLabourTotal[1].toLocaleString('en-IN')}`, style: 'cellCenter' },
    { val: labEffective, style: 'cellNumBold' },
    { val: 'Trade-wise man-day coefficients and city minimum daily wages', style: 'cellText' },
  ]);

  const machRowIndex = rows.length + 1;
  rows.push([
    { val: 3, style: 'cellCenter' },
    { val: 'Machinery & Equipment Sundries', style: 'cellText' },
    { val: `₹${machCost.toLocaleString('en-IN')}`, style: 'cellCenter' },
    { val: machCost, style: 'cellNum' },
    { val: 'Vibrators, mixers, scaffolding and specialized plant allocation', style: 'cellText' },
  ]);

  // Subtotal row with formula =SUM(D{matRowIndex}:D{machRowIndex})
  const baseSubtotalRowIndex = rows.length + 1;
  rows.push([
    { val: '', style: 'subtotalText' },
    { val: 'Base Direct Costs Sub-Total', style: 'subtotalText' },
    { val: `₹${result.marketSubtotal[0].toLocaleString('en-IN')} - ₹${result.marketSubtotal[1].toLocaleString('en-IN')}`, style: 'subtotalText' },
    { val: result.subtotal[0], formula: `SUM(D${matRowIndex}:D${machRowIndex})`, style: 'subtotalNum' },
    { val: 'Direct construction execution costs before markups', style: 'subtotalText' },
  ]);

  // Blank separator
  rows.push([]);

  // Section 2 Header (tracked dynamically)
  const sec2Row = rows.length;
  rows.push([
    { val: '2. STATUTORY MARKUPS & CONTRACTOR OVERHEADS', style: 'sectionHeader' },
    { val: '', style: 'sectionHeader' },
    { val: '', style: 'sectionHeader' },
    { val: '', style: 'sectionHeader' },
    { val: '', style: 'sectionHeader' },
  ]);
  merges.push({ fromCol: 0, fromRow: sec2Row, toCol: 4, toRow: sec2Row });

  rows.push([
    { val: 'S.No', style: 'tableHeader' },
    { val: 'Markup Head', style: 'tableHeader' },
    { val: 'Market Baseline Range (₹)', style: 'tableHeader' },
    { val: 'Active Amount (₹)', style: 'tableHeader' },
    { val: 'Markup Standard / Formula', style: 'tableHeader' },
  ]);

  const waterRowIndex = rows.length + 1;
  rows.push([
    { val: 4, style: 'cellCenter' },
    { val: 'Water Charges (1.0%)', style: 'cellText' },
    { val: `₹${Math.round(result.marketWater[0]).toLocaleString('en-IN')} - ₹${Math.round(result.marketWater[1]).toLocaleString('en-IN')}`, style: 'cellCenter' },
    { val: Math.round(result.water[0]), formula: `ROUND(D${baseSubtotalRowIndex}*0.01, 0)`, style: 'cellNum' },
    { val: '1% on Base Direct Costs as per CPWD DSR standard', style: 'cellText' },
  ]);

  const cpohRowIndex = rows.length + 1;
  rows.push([
    { val: 5, style: 'cellCenter' },
    { val: "Contractor's Profit & Overheads (15.0%)", style: 'cellText' },
    { val: `₹${Math.round(result.marketCpoh[0]).toLocaleString('en-IN')} - ₹${Math.round(result.marketCpoh[1]).toLocaleString('en-IN')}`, style: 'cellCenter' },
    { val: Math.round(result.cpoh[0]), formula: `ROUND((D${baseSubtotalRowIndex}+D${waterRowIndex})*0.15, 0)`, style: 'cellNum' },
    { val: '15% on Base + Water Charges (CPOH)', style: 'cellText' },
  ]);

  // Blank separator
  rows.push([]);

  // Section 3 Header (tracked dynamically)
  const sec3Row = rows.length;
  rows.push([
    { val: '3. CONSOLIDATED GRAND TOTAL & VARIANCE ANALYSIS', style: 'sectionHeader' },
    { val: '', style: 'sectionHeader' },
    { val: '', style: 'sectionHeader' },
    { val: '', style: 'sectionHeader' },
    { val: '', style: 'sectionHeader' },
  ]);
  merges.push({ fromCol: 0, fromRow: sec3Row, toCol: 4, toRow: sec3Row });

  rows.push([
    { val: 'Metric', style: 'tableHeader' },
    { val: 'Description', style: 'tableHeader' },
    { val: 'Benchmark Rate (₹)', style: 'tableHeader' },
    { val: 'Amount (₹)', style: 'tableHeader' },
    { val: 'Variance Status', style: 'tableHeader' },
  ]);

  rows.push([
    { val: 'Estimated Cost', style: 'cellTextBold' },
    { val: 'BOQ Line Items Total (City Market Benchmark)', style: 'cellText' },
    { val: `₹${Math.round(midpoint(result.marketTotal)).toLocaleString('en-IN')}`, style: 'cellCenter' },
    { val: result.estimatedTotal, style: 'cellNumBold' },
    { val: 'Standard baseline without custom rate edits', style: 'cellText' },
  ]);

  const diff = result.actualGrandTotal - Math.round(midpoint(result.marketTotal));
  const diffSign = diff > 0 ? `+₹${diff.toLocaleString('en-IN')}` : diff < 0 ? `-₹${Math.abs(diff).toLocaleString('en-IN')}` : '₹0 (Par)';
  const diffStatus = diff > 0 ? 'Cost Increase (+ Over Baseline)' : diff < 0 ? 'Savings (- Under Baseline)' : 'Exact Market Match';

  rows.push([
    { val: 'Rate Adjustments', style: 'cellTextBold' },
    { val: 'Net effect of custom site procurement rates vs market midpoint', style: 'cellText' },
    { val: diffSign, style: 'cellCenter' },
    { val: result.rateAdjustment, style: 'cellNum' },
    { val: diffStatus, style: 'cellText' },
  ]);

  rows.push([
    { val: 'ACTUAL GRAND TOTAL', style: 'totalText' },
    { val: 'Net Total Procurement & Execution Budget (Excl. GST)', style: 'totalText' },
    { val: `₹${result.actualTotal[0].toLocaleString('en-IN')} - ₹${result.actualTotal[1].toLocaleString('en-IN')}`, style: 'totalText' },
    { val: result.actualGrandTotal, formula: `D${baseSubtotalRowIndex}+D${waterRowIndex}+D${cpohRowIndex}`, style: 'totalNum' },
    { val: 'Certified Project Procurement Budget', style: 'totalText' },
  ]);

  return {
    name: 'Cost Summary',
    colWidths,
    rows,
    merges,
    freezeRow: 0,
  };
}

/**
 * Builds Sheet 2: Bill of Quantities
 */
function buildBOQSheet(options: BOQExportOptions): SheetDefinition {
  const { projectName = 'Project Estimate', cityLabel, verifiedDate, result, allBoqItems = [] } = options;
  const colWidths = [8, 42, 20, 14, 12, 18, 22, 24];
  const rows: SheetCell[][] = [];

  const groupMap = new Map<string, string>();
  allBoqItems.forEach(item => {
    if (item.id && item.group) groupMap.set(item.id, item.group);
    if (item.slug && item.group) groupMap.set(item.slug, item.group);
  });

  // Title Row
  rows.push([
    { val: 'BILL OF QUANTITIES (ITEMS OF WORK)', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
  ]);

  // Meta Rows
  rows.push([
    { val: 'Project:', style: 'metaLabel' },
    { val: projectName, style: 'metaVal' },
    { val: 'Market Baseline:', style: 'metaLabel' },
    { val: `${cityLabel} (As of ${verifiedDate})`, style: 'metaVal' },
    { val: '', style: 'metaVal' },
    { val: 'Currency:', style: 'metaLabel' },
    { val: 'INR (₹)', style: 'metaVal' },
    { val: `Items Count: ${result.lineItems.length}`, style: 'metaVal' },
  ]);

  rows.push([]);

  // Table Header (Row 4 in 1-indexed Excel)
  rows.push([
    { val: 'S.No', style: 'tableHeader' },
    { val: 'Item Description', style: 'tableHeader' },
    { val: 'Work Stage / Group', style: 'tableHeader' },
    { val: 'Quantity', style: 'tableHeader' },
    { val: 'Unit', style: 'tableHeader' },
    { val: 'Unit Rate (₹)', style: 'tableHeader' },
    { val: 'Total Amount (₹)', style: 'tableHeader' },
    { val: 'Rate Status', style: 'tableHeader' },
  ]);

  const firstItemRow = 5; // First data row in Excel
  let totalAmount = 0;
  result.lineItems.forEach((item, idx) => {
    totalAmount += item.amount;
    const stage = groupMap.get(item.id) || groupMap.get(item.slug) || 'General Construction';
    const rateStatus = item.isOverridden ? 'Custom Rate (User Edited)' : 'Auto City Rate';
    const excelRow = firstItemRow + idx;

    rows.push([
      { val: idx + 1, style: 'cellCenter' },
      { val: item.name, style: 'cellTextBold' },
      { val: stage, style: 'cellText' },
      { val: item.qty, style: 'cellNum' },
      { val: item.unit, style: 'cellCenter' },
      { val: item.effectiveRate, style: 'cellNum' },
      { val: item.amount, formula: `ROUND(D${excelRow}*F${excelRow}, 0)`, style: 'cellNumBold' },
      { val: rateStatus, style: 'cellText' },
    ]);
  });

  const lastItemRow = Math.max(firstItemRow, firstItemRow + result.lineItems.length - 1);
  const totalFormula = result.lineItems.length > 0 ? `SUM(G${firstItemRow}:G${lastItemRow})` : undefined;

  // Total Row
  rows.push([
    { val: '', style: 'totalText' },
    { val: 'TOTAL BILL OF QUANTITIES (ITEMS OF WORK)', style: 'totalText' },
    { val: '', style: 'totalText' },
    { val: '', style: 'totalText' },
    { val: '', style: 'totalText' },
    { val: '', style: 'totalText' },
    { val: totalAmount, formula: totalFormula, style: 'totalNum' },
    { val: `${result.lineItems.length} items evaluated`, style: 'totalText' },
  ]);

  const merges: SheetMerge[] = [
    { fromCol: 0, fromRow: 0, toCol: 7, toRow: 0 },
  ];

  return {
    name: 'Bill of Quantities',
    colWidths,
    rows,
    merges,
    freezeRow: 4,
  };
}

/**
 * Builds Sheet 3: Material Schedule
 */
function buildMaterialSheet(options: BOQExportOptions): SheetDefinition {
  const { projectName = 'Project Estimate', cityLabel, verifiedDate, result } = options;
  const colWidths = [8, 36, 16, 12, 18, 22, 26, 22];
  const rows: SheetCell[][] = [];

  rows.push([
    { val: 'CONSOLIDATED MATERIAL PROCUREMENT SCHEDULE', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
  ]);

  rows.push([
    { val: 'Project:', style: 'metaLabel' },
    { val: projectName, style: 'metaVal' },
    { val: 'Market Baseline:', style: 'metaLabel' },
    { val: `${cityLabel} (As of ${verifiedDate})`, style: 'metaVal' },
    { val: '', style: 'metaVal' },
    { val: 'Currency:', style: 'metaLabel' },
    { val: 'INR (₹)', style: 'metaVal' },
    { val: `Materials Count: ${result.materials.length}`, style: 'metaVal' },
  ]);

  rows.push([]);

  // Table Header (Row 4)
  rows.push([
    { val: 'S.No', style: 'tableHeader' },
    { val: 'Material Name', style: 'tableHeader' },
    { val: 'Required Qty', style: 'tableHeader' },
    { val: 'Unit', style: 'tableHeader' },
    { val: 'Effective Rate (₹)', style: 'tableHeader' },
    { val: 'Total Cost (₹)', style: 'tableHeader' },
    { val: 'Market Benchmark Range (₹)', style: 'tableHeader' },
    { val: 'Rate Status', style: 'tableHeader' },
  ]);

  const firstItemRow = 5;
  let totalCost = 0;
  result.materials.forEach((m, idx) => {
    totalCost += m.effectiveCost;
    const rateStatus = m.isOverridden ? 'Custom Procurement Rate' : 'City Benchmark Midpoint';
    const rangeText = `₹${m.marketRate[0].toLocaleString('en-IN')} - ₹${m.marketRate[1].toLocaleString('en-IN')}`;
    const excelRow = firstItemRow + idx;

    rows.push([
      { val: idx + 1, style: 'cellCenter' },
      { val: m.label, style: 'cellTextBold' },
      { val: m.qty, style: 'cellNum' },
      { val: m.unit, style: 'cellCenter' },
      { val: m.effectiveRate, style: 'cellNum' },
      { val: m.effectiveCost, formula: `ROUND(C${excelRow}*E${excelRow}, 0)`, style: 'cellNumBold' },
      { val: rangeText, style: 'cellCenter' },
      { val: rateStatus, style: 'cellText' },
    ]);
  });

  const lastItemRow = Math.max(firstItemRow, firstItemRow + result.materials.length - 1);
  const totalFormula = result.materials.length > 0 ? `SUM(F${firstItemRow}:F${lastItemRow})` : undefined;
  const rangeTotal = `₹${result.materialTotal[0].toLocaleString('en-IN')} - ₹${result.materialTotal[1].toLocaleString('en-IN')}`;

  rows.push([
    { val: '', style: 'totalText' },
    { val: 'TOTAL MATERIAL PROCUREMENT COST', style: 'totalText' },
    { val: '', style: 'totalText' },
    { val: '', style: 'totalText' },
    { val: '', style: 'totalText' },
    { val: totalCost, formula: totalFormula, style: 'totalNum' },
    { val: rangeTotal, style: 'totalText' },
    { val: `${result.materials.length} material categories`, style: 'totalText' },
  ]);

  const merges: SheetMerge[] = [
    { fromCol: 0, fromRow: 0, toCol: 7, toRow: 0 },
  ];

  return {
    name: 'Material Schedule',
    colWidths,
    rows,
    merges,
    freezeRow: 4,
  };
}

/**
 * Builds Sheet 4: Labour Schedule
 */
function buildLabourSheet(options: BOQExportOptions): SheetDefinition {
  const { projectName = 'Project Estimate', cityLabel, verifiedDate, result } = options;
  const colWidths = [8, 36, 16, 12, 18, 22, 26, 22];
  const rows: SheetCell[][] = [];

  rows.push([
    { val: 'CONSOLIDATED LABOUR DEPLOYMENT SCHEDULE', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
    { val: '', style: 'title' },
  ]);

  rows.push([
    { val: 'Project:', style: 'metaLabel' },
    { val: projectName, style: 'metaVal' },
    { val: 'Market Baseline:', style: 'metaLabel' },
    { val: `${cityLabel} (As of ${verifiedDate})`, style: 'metaVal' },
    { val: '', style: 'metaVal' },
    { val: 'Currency:', style: 'metaLabel' },
    { val: 'INR (₹)', style: 'metaVal' },
    { val: `Trades Count: ${result.labour.length}`, style: 'metaVal' },
  ]);

  rows.push([]);

  // Table Header (Row 4)
  rows.push([
    { val: 'S.No', style: 'tableHeader' },
    { val: 'Trade / Skill Category', style: 'tableHeader' },
    { val: 'Required Man-Days', style: 'tableHeader' },
    { val: 'Unit', style: 'tableHeader' },
    { val: 'Daily Wage Rate (₹)', style: 'tableHeader' },
    { val: 'Total Cost (₹)', style: 'tableHeader' },
    { val: 'Market Benchmark Range (₹)', style: 'tableHeader' },
    { val: 'Rate Status', style: 'tableHeader' },
  ]);

  const firstItemRow = 5;
  let totalCost = 0;
  result.labour.forEach((l, idx) => {
    totalCost += l.effectiveCost;
    const rateStatus = l.isOverridden ? 'Custom Daily Wage' : 'City Benchmark Midpoint';
    const rangeText = `₹${l.marketRate[0].toLocaleString('en-IN')} - ₹${l.marketRate[1].toLocaleString('en-IN')}`;
    const excelRow = firstItemRow + idx;

    rows.push([
      { val: idx + 1, style: 'cellCenter' },
      { val: l.label, style: 'cellTextBold' },
      { val: l.qty, style: 'cellNum' },
      { val: l.unit, style: 'cellCenter' },
      { val: l.effectiveRate, style: 'cellNum' },
      { val: l.effectiveCost, formula: `ROUND(C${excelRow}*E${excelRow}, 0)`, style: 'cellNumBold' },
      { val: rangeText, style: 'cellCenter' },
      { val: rateStatus, style: 'cellText' },
    ]);
  });

  const lastItemRow = Math.max(firstItemRow, firstItemRow + result.labour.length - 1);
  const totalFormula = result.labour.length > 0 ? `SUM(F${firstItemRow}:F${lastItemRow})` : undefined;
  const rangeTotal = `₹${result.labourTotal[0].toLocaleString('en-IN')} - ₹${result.labourTotal[1].toLocaleString('en-IN')}`;

  rows.push([
    { val: '', style: 'totalText' },
    { val: 'TOTAL LABOUR DEPLOYMENT COST', style: 'totalText' },
    { val: '', style: 'totalText' },
    { val: '', style: 'totalText' },
    { val: '', style: 'totalText' },
    { val: totalCost, formula: totalFormula, style: 'totalNum' },
    { val: rangeTotal, style: 'totalText' },
    { val: `${result.labour.length} trades evaluated`, style: 'totalText' },
  ]);

  const merges: SheetMerge[] = [
    { fromCol: 0, fromRow: 0, toCol: 7, toRow: 0 },
  ];

  return {
    name: 'Labour Schedule',
    colWidths,
    rows,
    merges,
    freezeRow: 4,
  };
}

/**
 * Extracts attachment filename from the Content-Disposition HTTP header.
 */
function extractFilenameFromHeader(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {}
  }
  const match = header.match(/filename="?([^";]+)"?/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return fallback;
}

/**
 * Exports the project BOQ and schedules as a multi-tab Microsoft Excel (.xlsx) workbook.
 * Streams directly from the backend Django server for 100% download reliability,
 * with automatic client-side fallback if offline or unreachable.
 */
export async function exportProjectBOQToExcel(options: BOQExportOptions): Promise<void> {
  const cleanName = (options.projectName || 'Project').trim().replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const defaultFilename = `${cleanName}_BOQ_Estimate.xlsx`;

  try {
    // 1. Primary: Server-Streamed Excel Endpoint (Option 1)
    const res = await fetch('/api/v1/projects/estimation/export-excel/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
      credentials: 'include',
    });

    if (res.ok) {
      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition');
      const filename = extractFilenameFromHeader(disposition, defaultFilename);
      triggerDownload(blob, filename);
      return;
    } else {
      console.warn(`[BOQ Exporter] Server export returned HTTP ${res.status}. Falling back to client generator.`);
    }
  } catch (netErr) {
    console.warn('[BOQ Exporter] Server export network error. Falling back to client generator:', netErr);
  }

  // 2. Fallback: Client-Side OpenXML Generation
  const sheets: SheetDefinition[] = [
    buildCostSummarySheet(options),
    buildBOQSheet(options),
    buildMaterialSheet(options),
    buildLabourSheet(options),
  ];

  const blob = await generateExcelBlob(sheets);
  triggerDownload(blob, defaultFilename);
}

/**
 * Escapes a cell value for standard RFC 4180 CSV.
 * Pure numbers remain unquoted so spreadsheet applications (Excel, Google Sheets, Calc)
 * natively parse them as numeric values rather than text strings.
 */
function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '""';
  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) return '0';
    return String(value);
  }
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Exports the project BOQ and schedules as an RFC 4180 UTF-8 CSV file with BOM.
 * All rows maintain a consistent 8-column width for seamless spreadsheet viewing.
 */
export function exportProjectBOQToCSV(options: BOQExportOptions): void {
  const { projectName = 'Project Estimate', cityLabel, verifiedDate, result, allBoqItems = [] } = options;
  const groupMap = new Map<string, string>();
  allBoqItems.forEach(item => {
    if (item.id && item.group) groupMap.set(item.id, item.group);
    if (item.slug && item.group) groupMap.set(item.slug, item.group);
  });

  const lines: string[] = [];

  // Title Block (8 columns)
  lines.push([
    escapeCsvCell('ARCHITECTURE PLAYBOOK - CONSOLIDATED PROJECT ESTIMATE & BOQ'),
    escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell('')
  ].join(','));

  lines.push([
    escapeCsvCell('Project:'),
    escapeCsvCell(projectName),
    escapeCsvCell('Market Rates Baseline:'),
    escapeCsvCell(`${cityLabel} (As of ${verifiedDate})`),
    escapeCsvCell('Currency:'),
    escapeCsvCell('INR (₹)'),
    escapeCsvCell(''),
    escapeCsvCell(''),
  ].join(','));

  lines.push([
    escapeCsvCell('Estimation Engine:'),
    escapeCsvCell('CPWD Analysis of Rates Benchmark (Material + Labour + Machinery)'),
    escapeCsvCell('Overheads & Profit:'),
    escapeCsvCell('1% Water + 15% CPOH'),
    escapeCsvCell(''),
    escapeCsvCell(''),
    escapeCsvCell(''),
    escapeCsvCell(''),
  ].join(','));
  lines.push([escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell('')].join(','));

  // SECTION 1: COST SUMMARY WATERFALL (8 columns)
  lines.push([escapeCsvCell('========================================================================================'), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell('')].join(','));
  lines.push([escapeCsvCell('1. COST SUMMARY WATERFALL'), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell('')].join(','));
  lines.push([escapeCsvCell('========================================================================================'), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell('')].join(','));
  lines.push([
    escapeCsvCell('S.No'),
    escapeCsvCell('Cost Component / Head'),
    escapeCsvCell('Market Benchmark Range (₹)'),
    escapeCsvCell('Active Procurement Cost (₹)'),
    escapeCsvCell('Status / Formula Basis'),
    escapeCsvCell(''),
    escapeCsvCell(''),
    escapeCsvCell(''),
  ].join(','));

  const matEffective = result.materials.reduce((acc, m) => acc + m.effectiveCost, 0);
  const labEffective = result.labour.reduce((acc, l) => acc + l.effectiveCost, 0);

  lines.push([
    escapeCsvCell(1),
    escapeCsvCell('Material Total'),
    escapeCsvCell(`₹${result.marketMaterialTotal[0]} - ₹${result.marketMaterialTotal[1]}`),
    escapeCsvCell(matEffective),
    escapeCsvCell('Aggregated raw materials at local market rates'),
    escapeCsvCell(''),
    escapeCsvCell(''),
    escapeCsvCell(''),
  ].join(','));

  lines.push([
    escapeCsvCell(2),
    escapeCsvCell('Labour Total'),
    escapeCsvCell(`₹${result.marketLabourTotal[0]} - ₹${result.marketLabourTotal[1]}`),
    escapeCsvCell(labEffective),
    escapeCsvCell('Trade-wise man-day coefficients at daily wage rates'),
    escapeCsvCell(''),
    escapeCsvCell(''),
    escapeCsvCell(''),
  ].join(','));

  lines.push([
    escapeCsvCell(3),
    escapeCsvCell('Machinery & Equipment Sundries'),
    escapeCsvCell(`₹${result.machineryTotal[0]}`),
    escapeCsvCell(result.machineryTotal[0]),
    escapeCsvCell('Standard CPWD machinery and sundries allowance'),
    escapeCsvCell(''),
    escapeCsvCell(''),
    escapeCsvCell(''),
  ].join(','));

  lines.push([
    escapeCsvCell(''),
    escapeCsvCell('Base Direct Costs Subtotal'),
    escapeCsvCell(`₹${result.marketSubtotal[0]} - ₹${result.marketSubtotal[1]}`),
    escapeCsvCell(result.subtotal[0]),
    escapeCsvCell('Base direct construction execution cost'),
    escapeCsvCell(''),
    escapeCsvCell(''),
    escapeCsvCell(''),
  ].join(','));

  lines.push([
    escapeCsvCell(4),
    escapeCsvCell('Water Charges (1%)'),
    escapeCsvCell(`₹${Math.round(result.marketWater[0])} - ₹${Math.round(result.marketWater[1])}`),
    escapeCsvCell(Math.round(result.water[0])),
    escapeCsvCell('1% of Base Subtotal'),
    escapeCsvCell(''),
    escapeCsvCell(''),
    escapeCsvCell(''),
  ].join(','));

  lines.push([
    escapeCsvCell(5),
    escapeCsvCell("Contractor's Profit & Overheads (15%)"),
    escapeCsvCell(`₹${Math.round(result.marketCpoh[0])} - ₹${Math.round(result.marketCpoh[1])}`),
    escapeCsvCell(Math.round(result.cpoh[0])),
    escapeCsvCell('15% on Base + Water Charges'),
    escapeCsvCell(''),
    escapeCsvCell(''),
    escapeCsvCell(''),
  ].join(','));

  lines.push([
    escapeCsvCell(''),
    escapeCsvCell('Estimated Project Cost (Baseline)'),
    escapeCsvCell(`₹${Math.round(midpoint(result.marketTotal))}`),
    escapeCsvCell(result.estimatedTotal),
    escapeCsvCell('Line items baseline without custom site edits'),
    escapeCsvCell(''),
    escapeCsvCell(''),
    escapeCsvCell(''),
  ].join(','));

  lines.push([
    escapeCsvCell(''),
    escapeCsvCell('Rate Adjustments (Your edits vs baseline)'),
    escapeCsvCell('-'),
    escapeCsvCell(result.rateAdjustment),
    escapeCsvCell('Net effect of custom site procurement rates'),
    escapeCsvCell(''),
    escapeCsvCell(''),
    escapeCsvCell(''),
  ].join(','));

  lines.push([
    escapeCsvCell('TOTAL'),
    escapeCsvCell('ACTUAL GRAND TOTAL PROJECT COST'),
    escapeCsvCell(`₹${result.actualTotal[0]} - ₹${result.actualTotal[1]}`),
    escapeCsvCell(result.actualGrandTotal),
    escapeCsvCell('Net Total Procurement & Execution Budget (Excl. GST)'),
    escapeCsvCell(''),
    escapeCsvCell(''),
    escapeCsvCell(''),
  ].join(','));

  lines.push([escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell('')].join(','));

  // SECTION 2: BILL OF QUANTITIES (8 columns)
  lines.push([escapeCsvCell('========================================================================================'), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell('')].join(','));
  lines.push([escapeCsvCell('2. BILL OF QUANTITIES (ITEMS OF WORK)'), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell('')].join(','));
  lines.push([escapeCsvCell('========================================================================================'), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell('')].join(','));
  lines.push([
    escapeCsvCell('S.No'),
    escapeCsvCell('Item Description'),
    escapeCsvCell('Stage / Group'),
    escapeCsvCell('Quantity'),
    escapeCsvCell('Unit'),
    escapeCsvCell('Unit Rate (₹)'),
    escapeCsvCell('Total Amount (₹)'),
    escapeCsvCell('Rate Status'),
  ].join(','));

  let boqTotalAmount = 0;
  result.lineItems.forEach((item, idx) => {
    boqTotalAmount += item.amount;
    const stage = groupMap.get(item.id) || groupMap.get(item.slug) || 'General';
    const rateStatus = item.isOverridden ? 'Custom Rate (User Overridden)' : 'Auto City Rate';
    lines.push([
      escapeCsvCell(idx + 1),
      escapeCsvCell(item.name),
      escapeCsvCell(stage),
      escapeCsvCell(item.qty),
      escapeCsvCell(item.unit),
      escapeCsvCell(item.effectiveRate),
      escapeCsvCell(item.amount),
      escapeCsvCell(rateStatus),
    ].join(','));
  });

  lines.push([
    escapeCsvCell('TOTAL'),
    escapeCsvCell('TOTAL BILL OF QUANTITIES'),
    escapeCsvCell(''),
    escapeCsvCell(''),
    escapeCsvCell(''),
    escapeCsvCell(''),
    escapeCsvCell(boqTotalAmount),
    escapeCsvCell(`${result.lineItems.length} items evaluated`),
  ].join(','));

  lines.push([escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell('')].join(','));

  // SECTION 3: MATERIAL SCHEDULE (8 columns)
  lines.push([escapeCsvCell('========================================================================================'), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell('')].join(','));
  lines.push([escapeCsvCell('3. CONSOLIDATED MATERIAL PROCUREMENT SCHEDULE'), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell('')].join(','));
  lines.push([escapeCsvCell('========================================================================================'), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell('')].join(','));
  lines.push([
    escapeCsvCell('S.No'),
    escapeCsvCell('Material Name'),
    escapeCsvCell('Required Qty'),
    escapeCsvCell('Unit'),
    escapeCsvCell('Effective Rate (₹)'),
    escapeCsvCell('Total Cost (₹)'),
    escapeCsvCell('Market Benchmark Range (₹)'),
    escapeCsvCell('Rate Status'),
  ].join(','));

  let matTotalCost = 0;
  result.materials.forEach((m, idx) => {
    matTotalCost += m.effectiveCost;
    const rateStatus = m.isOverridden ? 'Custom Rate' : 'Market Midpoint';
    const rangeStr = `₹${m.marketRate[0]} - ₹${m.marketRate[1]}`;
    lines.push([
      escapeCsvCell(idx + 1),
      escapeCsvCell(m.label),
      escapeCsvCell(m.qty),
      escapeCsvCell(m.unit),
      escapeCsvCell(m.effectiveRate),
      escapeCsvCell(m.effectiveCost),
      escapeCsvCell(rangeStr),
      escapeCsvCell(rateStatus),
    ].join(','));
  });

  lines.push([
    escapeCsvCell('TOTAL'),
    escapeCsvCell('TOTAL MATERIAL PROCUREMENT COST'),
    escapeCsvCell(''),
    escapeCsvCell(''),
    escapeCsvCell(''),
    escapeCsvCell(matTotalCost),
    escapeCsvCell(`₹${result.materialTotal[0]} - ₹${result.materialTotal[1]}`),
    escapeCsvCell(`${result.materials.length} material categories`),
  ].join(','));

  lines.push([escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell('')].join(','));

  // SECTION 4: LABOUR SCHEDULE (8 columns)
  lines.push([escapeCsvCell('========================================================================================'), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell('')].join(','));
  lines.push([escapeCsvCell('4. CONSOLIDATED LABOUR DEPLOYMENT SCHEDULE'), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell('')].join(','));
  lines.push([escapeCsvCell('========================================================================================'), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell(''), escapeCsvCell('')].join(','));
  lines.push([
    escapeCsvCell('S.No'),
    escapeCsvCell('Trade / Skill Category'),
    escapeCsvCell('Required Man-Days'),
    escapeCsvCell('Unit'),
    escapeCsvCell('Daily Wage Rate (₹)'),
    escapeCsvCell('Total Cost (₹)'),
    escapeCsvCell('Market Benchmark Range (₹)'),
    escapeCsvCell('Rate Status'),
  ].join(','));

  let labTotalCost = 0;
  result.labour.forEach((l, idx) => {
    labTotalCost += l.effectiveCost;
    const rateStatus = l.isOverridden ? 'Custom Wage Rate' : 'Market Midpoint';
    const rangeStr = `₹${l.marketRate[0]} - ₹${l.marketRate[1]}`;
    lines.push([
      escapeCsvCell(idx + 1),
      escapeCsvCell(l.label),
      escapeCsvCell(l.qty),
      escapeCsvCell(l.unit),
      escapeCsvCell(l.effectiveRate),
      escapeCsvCell(l.effectiveCost),
      escapeCsvCell(rangeStr),
      escapeCsvCell(rateStatus),
    ].join(','));
  });

  lines.push([
    escapeCsvCell('TOTAL'),
    escapeCsvCell('TOTAL LABOUR DEPLOYMENT COST'),
    escapeCsvCell(''),
    escapeCsvCell(''),
    escapeCsvCell(''),
    escapeCsvCell(labTotalCost),
    escapeCsvCell(`₹${result.labourTotal[0]} - ₹${result.labourTotal[1]}`),
    escapeCsvCell(`${result.labour.length} trades evaluated`),
  ].join(','));

  // Prepend UTF-8 Byte Order Mark (\uFEFF) and join with CRLF (\r\n) for Windows Excel compatibility
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const cleanName = (projectName || 'Project').trim().replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  triggerDownload(blob, `${cleanName}_BOQ_Estimate.csv`);
}
