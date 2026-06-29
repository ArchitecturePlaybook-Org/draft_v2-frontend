import React, { useState, useEffect } from 'react';
import { useReactTable, getCoreRowModel, getGroupedRowModel, getExpandedRowModel, flexRender, ColumnDef, GroupingState } from '@tanstack/react-table';
import { useEstimationStore } from '@/store/estimation-store';
import { TakeoffItem } from '@/types/estimation.types';
import { Trash2 } from 'lucide-react';

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
      className="w-full h-full min-h-[24px] cursor-text px-1" 
      onClick={() => setIsEditing(true)}
    >
      {value}
    </div>
  );
};

export const EstimationGrid = () => {
  const { items, updateItem, deleteItem, setHover, setSelection, selectedItemId, hoveredItemId } = useEstimationStore();

  const columns: ColumnDef<TakeoffItem>[] = [
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
        <div className={`px-1 font-mono text-xs text-primary ${info.row.getIsGrouped() ? 'font-bold' : ''}`}>
          {Number(info.getValue()).toFixed(2)}
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
      cell: EditableCell
    },
    {
      header: 'Total',
      accessorKey: 'total_cost',
      aggregationFn: 'sum',
      cell: (info) => (
        <div className={`px-1 font-mono text-xs text-semantic-green ${info.row.getIsGrouped() ? 'font-black' : 'font-bold'}`}>
          ${Number(info.getValue()).toFixed(2)}
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
          className="text-red-500 hover:bg-red-100 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      )
    }
  ];

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
    meta: {
      updateData: (itemId: string, columnId: string, value: any) => {
        updateItem(itemId, { [columnId]: value });
      }
    }
  });

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden font-sans">
      <div className="h-10 border-b border-surface-200 bg-surface-100 flex items-center justify-between px-4 shrink-0">
        <span className="text-xs font-bold uppercase tracking-widest text-surface-500">Spreadsheet Mode</span>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold uppercase text-surface-400">Group By Item Code</label>
          <input 
            type="checkbox" 
            checked={grouping.length > 0} 
            onChange={e => setGrouping(e.target.checked ? ['item_code'] : [])} 
            className="w-3 h-3 accent-accent"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse excel-table">
          <thead className="bg-surface-50 border-b-2 border-surface-200 sticky top-0 z-20">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                <th className="w-8 border-r border-b border-surface-200 bg-surface-100"></th>
                {hg.headers.map(header => (
                  <th key={header.id} className="p-2 border-r border-b border-surface-200 text-left font-bold text-primary text-xs bg-surface-100 whitespace-nowrap">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => {
              const isGroupRow = row.getIsGrouped();
              return (
                <tr 
                  key={row.id}
                  className={`group border-b border-surface-200 transition-colors ${
                    isGroupRow ? 'bg-surface-200 text-primary' :
                    selectedItemId === row.original?.id ? 'bg-accent/10 border-l-2 border-l-accent text-primary' : 
                    hoveredItemId === row.original?.id ? 'bg-surface-300 text-primary' : 'bg-surface-50 text-primary'
                  }`}
                  onMouseEnter={() => !isGroupRow && setHover(row.original.id)}
                  onMouseLeave={() => !isGroupRow && setHover(null)}
                  onClick={() => !isGroupRow && setSelection(row.original.id)}
                >
                  <td className={`border-r border-surface-200 text-center text-[10px] font-mono select-none ${isGroupRow ? 'bg-surface-200 text-transparent' : 'bg-surface-100 text-primary'}`}>
                    {isGroupRow ? '' : row.index + 1}
                  </td>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="p-1 border-r border-surface-200 relative">
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
          <div className="flex flex-col items-center justify-center h-48 text-surface-400">
            <span className="text-3xl mb-2 opacity-50">📋</span>
            <p className="text-xs font-bold uppercase tracking-widest">No Takeoffs Found</p>
            <p className="text-[10px] mt-1">Use the tools on the canvas to start drawing</p>
          </div>
        )}
      </div>
    </div>
  );
};
