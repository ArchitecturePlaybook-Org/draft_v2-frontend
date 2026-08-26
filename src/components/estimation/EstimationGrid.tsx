import React, { useState, useEffect } from 'react';
import { useReactTable, getCoreRowModel, getGroupedRowModel, getExpandedRowModel, flexRender, ColumnDef, GroupingState } from '@tanstack/react-table';
import { useEstimationStore } from '@/store/estimation-store';
import { TakeoffItem } from '@/types/estimation.types';
import { Trash2, LayoutGrid, Calculator, Layers, FileSpreadsheet } from 'lucide-react';

const CodeCell = (props: any) => {
  const { row, getValue, table } = props;
  if (row.getIsGrouped()) {
    return (
      <div className="flex items-center gap-2 cursor-pointer font-bold text-accent" onClick={row.getToggleExpandedHandler()}>
        <span className="w-4">{row.getIsExpanded() ? '▼' : '▶'}</span>
        {getValue() as string} ({row.subRows.length})
      </div>
    );
  }
  return <EditableCell {...props} column={{ id: 'item_code' }} />;
};

const EditableCell = ({ getValue, row: { index, original }, column: { id }, table }: any) => {
  const initialValue = getValue();
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);

  // Sync state if external changes occur
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const onBlur = () => {
    table.options.meta?.updateData(original.id, id, value);
    setIsEditing(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      table.options.meta?.updateData(original.id, id, value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className="w-full bg-surface-200/50 text-primary outline-none px-1 border border-accent rounded"
      />
    );
  }

  // Non-editable view (click to edit)
  return (
    <div 
      className="w-full h-full min-h-[24px] cursor-text px-1 flex items-center" 
      onClick={() => setIsEditing(true)}
    >
      {value}
    </div>
  );
};

export const EstimationGrid = () => {
  const { items, updateItem, deleteItem, setHover, setSelection, selectedItemId, hoveredItemId } = useEstimationStore();

  const totalQuantitySum = items.reduce((acc, item) => acc + (Number(item.net_qty) || 0), 0);
  const totalCostSum = items.reduce((acc, item) => acc + (Number(item.total_cost) || 0), 0);

  const columns = React.useMemo<ColumnDef<TakeoffItem>[]>(() => [
    {
      header: 'Code',
      accessorKey: 'item_code',
      cell: CodeCell
    },
    {
      header: 'Description',
      accessorKey: 'description',
      cell: EditableCell
    },
    {
      header: 'Formula',
      accessorKey: 'multiplier',
      cell: EditableCell
    },
    {
      header: 'Qty',
      accessorKey: 'net_qty',
      aggregationFn: 'sum',
      cell: (info) => (
        <div className={`px-1 font-mono text-[11px] text-primary ${info.row.getIsGrouped() ? 'font-black text-accent' : 'font-bold'}`}>
          {Number(info.getValue() || 0).toFixed(2)}
        </div>
      )
    },
    {
      header: 'Unit',
      accessorKey: 'unit',
      cell: EditableCell
    },
    {
      header: 'Unit Cost',
      accessorKey: 'unit_cost',
      cell: (info) => (
        <div className="px-1 font-mono text-[11px] text-surface-600 dark:text-surface-300 font-medium">
          ₹{Number(info.getValue() || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      )
    },
    {
      header: 'Total',
      accessorKey: 'total_cost',
      aggregationFn: 'sum',
      cell: (info) => (
        <div className={`px-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 ${info.row.getIsGrouped() ? 'font-black' : 'font-bold'}`}>
          ₹{Number(info.getValue() || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      )
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            deleteItem(row.original.id);
          }} 
          className="text-red-500 hover:bg-red-500/10 p-1 rounded-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
          title="Delete item"
        >
          <Trash2 size={13} />
        </button>
      )
    }
  ], [deleteItem]);

  const [grouping, setGrouping] = useState<GroupingState>([]);

  const table = useReactTable({
    data: items,
    columns,
    state: {
      grouping,
    },
    onGroupingChange: setGrouping,
    getCoreRowModel: getCoreRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    autoResetPageIndex: false,
    autoResetExpanded: false,
    meta: {
      updateData: (itemId: string, columnId: string, value: any) => {
        updateItem(itemId, { [columnId]: value });
      }
    }
  });

  return (
    <div className="w-full h-full flex flex-col bg-surface-card overflow-hidden font-sans border border-surface-200/80 rounded-xl shadow-xs">
      
      {/* Control Bar */}
      <div className="h-10 border-b border-surface-200 bg-surface-100/90 backdrop-blur-md px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-3.5 h-3.5 text-accent" />
          <span className="text-[10px] font-black uppercase tracking-wider text-foreground">Spreadsheet Grid</span>
          <span className="text-[9px] bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full font-extrabold text-accent">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <label className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wider text-text-secondary cursor-pointer select-none hover:text-foreground transition-colors">
          <input 
            type="checkbox" 
            checked={grouping.length > 0} 
            onChange={e => setGrouping(e.target.checked ? ['item_code'] : [])} 
            className="w-3.5 h-3.5 rounded accent-accent cursor-pointer"
          />
          Group By Code
        </label>
      </div>
      
      {/* Table Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-surface-100 border-b border-surface-200 sticky top-0 z-20 shadow-2xs">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                <th className="w-7 border-r border-surface-200 bg-surface-100 text-[9px] font-black text-text-secondary text-center uppercase">#</th>
                {hg.headers.map(header => (
                  <th key={header.id} className="p-2 border-r border-surface-200 text-left font-black text-foreground text-[10px] uppercase tracking-wider bg-surface-100 whitespace-nowrap">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const isGroupRow = row.getIsGrouped();
              return (
                <tr 
                  key={row.id}
                  className={`group border-b border-surface-200/80 transition-all ${
                    isGroupRow ? 'bg-accent/10 font-bold text-foreground' :
                    selectedItemId === row.original?.id ? 'bg-accent/15 border-l-4 border-l-accent text-foreground font-semibold' : 
                    hoveredItemId === row.original?.id ? 'bg-surface-100 text-foreground' : 'bg-surface-card hover:bg-surface-50 text-foreground'
                  }`}
                  onMouseEnter={() => !isGroupRow && setHover(row.original.id)}
                  onMouseLeave={() => !isGroupRow && setHover(null)}
                  onClick={() => !isGroupRow && setSelection(row.original.id)}
                >
                  <td className={`border-r border-surface-200/80 text-center text-[9px] font-mono select-none ${isGroupRow ? 'bg-accent/10 text-transparent' : 'bg-surface-100/50 text-text-secondary'}`}>
                    {isGroupRow ? '' : row.index + 1}
                  </td>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="p-1.5 border-r border-surface-200/80 relative text-[11px]">
                      {cell.getIsGrouped() ? (
                         flexRender(cell.column.columnDef.cell, cell.getContext())
                      ) : cell.getIsAggregated() ? (
                         flexRender(cell.column.columnDef.cell, cell.getContext())
                      ) : cell.getIsPlaceholder() ? null : (
                         flexRender(cell.column.columnDef.cell, cell.getContext())
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-44 text-surface-400 p-6 text-center">
            <div className="w-10 h-10 rounded-2xl bg-surface-100 border border-surface-200 flex items-center justify-center mb-2 text-accent">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <p className="text-xs font-black uppercase tracking-wider text-surface-600">No Takeoffs Measured Yet</p>
            <p className="text-[10px] text-surface-400 mt-1 max-w-[220px]">Use the drawing toolbar above to measure lines, polygons, & item counts</p>
          </div>
        )}
      </div>

      {/* Sticky Bottom Totals Bar */}
      {items.length > 0 && (
        <div className="h-10 border-t border-surface-200/80 bg-surface-100/95 backdrop-blur-xl px-3 flex items-center justify-between shrink-0 text-[10px] font-black uppercase tracking-wider text-foreground">
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Calculator className="w-3.5 h-3.5 text-accent" />
            <span>Plan Total</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-surface-500">
              Qty: <strong className="font-mono text-foreground font-bold">{totalQuantitySum.toFixed(2)}</strong>
            </span>
            <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-black text-xs flex items-center gap-1 shadow-2xs">
              <span>Total:</span>
              <span>₹{totalCostSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
