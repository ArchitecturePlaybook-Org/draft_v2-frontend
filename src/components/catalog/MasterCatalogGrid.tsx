import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { MasterCatalogItem } from '@/store/estimation-store';
import { Trash2 } from 'lucide-react';
import { projectsApi } from '@/domains/projects/api';

const columnHelper = createColumnHelper<MasterCatalogItem>();

interface Props {
  items: MasterCatalogItem[];
  onRefresh: () => void;
}

export const MasterCatalogGrid: React.FC<Props> = ({ items, onRefresh }) => {
  const columns = React.useMemo(() => [
    columnHelper.accessor('color', {
      header: '',
      cell: (info) => (
        <div 
          className="w-4 h-4 rounded-full border border-surface-200 m-auto" 
          style={{ backgroundColor: info.getValue() }}
        ></div>
      ),
      size: 40,
    }),
    columnHelper.accessor('item_code', {
      header: 'Item Code',
      cell: (info) => <span className="font-bold">{info.getValue()}</span>,
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor('unit', {
      header: 'Unit',
      cell: (info) => <span className="uppercase text-xs font-bold text-surface-500">{info.getValue()}</span>,
    }),
    columnHelper.accessor('unit_cost', {
      header: 'Unit Cost',
      cell: (info) => (
        <span className="font-mono text-emerald-600 dark:text-emerald-400">
          ${Number(info.getValue()).toFixed(2)}
        </span>
      ),
    }),
    columnHelper.accessor('multiplier', {
      header: 'Waste Multiplier',
      cell: (info) => (
        <span className="font-mono text-surface-500">
          {Number(info.getValue()).toFixed(2)}x
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      cell: (info) => (
        <button
          onClick={async () => {
            if (confirm("Are you sure you want to delete this template?")) {
              try {
                await projectsApi.deleteMasterCatalogItem(Number(info.row.original.id));
                onRefresh();
              } catch (e) {
                alert("Failed to delete item.");
              }
            }
          }}
          className="p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <Trash2 size={16} />
        </button>
      ),
      size: 60,
    })
  ], [onRefresh]);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-surface-50 z-10 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th 
                  key={header.id}
                  style={{ width: header.getSize() !== 150 ? header.getSize() : 'auto' }}
                  className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-surface-500"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr 
              key={row.id}
              className="border-b border-surface-100 hover:bg-surface-50/50 transition-colors group"
            >
              {row.getVisibleCells().map(cell => (
                <td 
                  key={cell.id}
                  className="px-4 py-3 text-sm text-surface-700"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-surface-400 text-sm">
                No catalog items found. Download the template and import your items to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
