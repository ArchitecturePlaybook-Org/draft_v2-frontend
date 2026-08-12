export interface ExtractedPdfSheet {
  pageNumber: number;
  title: string;
  blob: Blob;
  previewUrl: string;
  selected: boolean;
}

const CDN_PDF_SCRIPTS = [
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js",
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
];

const CDN_WORKER_SCRIPTS = [
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
];

async function ensurePdfJsLoaded(): Promise<any> {
  if ((window as any).pdfjsLib) {
    return (window as any).pdfjsLib;
  }

  for (let i = 0; i < CDN_PDF_SCRIPTS.length; i++) {
    const src = CDN_PDF_SCRIPTS[i];
    try {
      await new Promise<void>((resolve, reject) => {
        // Remove old failing scripts if present
        const oldScript = document.querySelector(`script[src="${src}"]`);
        if (oldScript) oldScript.remove();

        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
          script.remove();
          reject(new Error(`Failed to load ${src}`));
        };
        document.head.appendChild(script);
      });

      if ((window as any).pdfjsLib) {
        // Set worker source
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = CDN_WORKER_SCRIPTS[i] || CDN_WORKER_SCRIPTS[0];
        return (window as any).pdfjsLib;
      }
    } catch (err) {
      console.warn(`PDF.js CDN load failed for ${src}, trying fallback...`, err);
    }
  }

  throw new Error(
    "Failed to load PDF.js engine from CDNs (unpkg, jsdelivr, cloudflare). Please check network/ad-blocker connection."
  );
}

/**
 * Loads PDF.js dynamically with multi-CDN fallbacks in the browser.
 * Converts each page of a PDF File into high-resolution JPEG blobs.
 */
export async function convertPdfToJpegSheets(
  pdfFile: File,
  baseTitle?: string
): Promise<ExtractedPdfSheet[]> {
  if (typeof window === "undefined") return [];

  const pdfjsLib = await ensurePdfJsLoaded();

  const arrayBuffer = await pdfFile.arrayBuffer();
  
  let pdfDoc: any;
  try {
    const loadingTask = pdfjsLib.getDocument({ 
      data: new Uint8Array(arrayBuffer),
      cMapUrl: "https://unpkg.com/pdfjs-dist@3.11.174/cmaps/",
      cMapPacked: true,
    });
    pdfDoc = await loadingTask.promise;
  } catch (e) {
    // Retry with worker disabled in main thread if worker load failed
    console.warn("Retrying PDF document load without WebWorker...", e);
    const loadingTask = pdfjsLib.getDocument({ 
      data: new Uint8Array(arrayBuffer),
      disableWorker: true,
    });
    pdfDoc = await loadingTask.promise;
  }

  const numPages = pdfDoc.numPages;
  const sheets: ExtractedPdfSheet[] = [];
  const cleanBaseTitle = baseTitle || pdfFile.name.replace(/\.[^/.]+$/, "");

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    // 2x scale for crisp architectural floor plan details
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
        },
        "image/jpeg",
        0.92
      );
    });

    const previewUrl = URL.createObjectURL(blob);
    const sheetTitle = numPages > 1 
      ? `${cleanBaseTitle} - Sheet ${pageNum}` 
      : cleanBaseTitle;

    sheets.push({
      pageNumber: pageNum,
      title: sheetTitle,
      blob,
      previewUrl,
      selected: true
    });
  }

  return sheets;
}
