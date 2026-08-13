import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { MasterCatalogItem } from '@/store/estimation-store';
import { Trash2, Pencil, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { projectsApi } from '@/domains/projects/api';

const columnHelper = createColumnHelper<MasterCatalogItem>();

interface Props {
  items: MasterCatalogItem[];
  onRefresh: () => void;
  onEdit: (item: MasterCatalogItem) => void;
}

export const MasterCatalogGrid: React.FC<Props> = ({ items, onRefresh, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'length' | 'area' | 'count'>('all');
  const [presetFilter, setPresetFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);

  // Helper to extract measurement type and material preset from item description JSON
  const getItemDetails = (item: MasterCatalogItem) => {
    let textDesc = item.description || '';
    let mType = 'length';
    let matType = 'generic';

    try {
      const json = JSON.parse(item.description);
      if (json) {
        if (json.text_description) textDesc = json.text_description;
        if (json.measurement_type) mType = json.measurement_type;
        if (json.material_type) matType = json.material_type;
      }
    } catch (e) {
      const u = (item.unit || '').toLowerCase();
      if (u.includes('sq') || u.includes('m2')) mType = 'area';
      else if (u.includes('ea') || u.includes('pcs')) mType = 'count';
    }

    return { textDesc, mType, matType };
  };

  // Metric stats
  const stats = useMemo(() => {
    let lengthCount = 0;
    let areaCount = 0;
    let countCount = 0;

    items.forEach(item => {
      const { mType } = getItemDetails(item);
      if (mType === 'length') lengthCount++;
      else if (mType === 'area') areaCount++;
      else if (mType === 'count') countCount++;
    });

    return { total: items.length, lengthCount, areaCount, countCount };
  }, [items]);

  // Filtered items
  const filteredData = useMemo(() => {
    return items.filter(item => {
      const { textDesc, mType, matType } = getItemDetails(item);

      // Search match
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query || 
        item.item_code.toLowerCase().includes(query) ||
        textDesc.toLowerCase().includes(query) ||
        (item.unit || '').toLowerCase().includes(query);

      // Type match
      const matchesType = typeFilter === 'all' || mType === typeFilter;

      // Preset match
      const matchesPreset = presetFilter === 'all' || matType === presetFilter;

      return matchesSearch && matchesType && matchesPreset;
    });
  }, [items, searchTerm, typeFilter, presetFilter]);

  const columns = useMemo(() => [
    columnHelper.accessor('color', {
      header: '',
      cell: (info) => (
        <div 
          className="w-4 h-4 rounded-full border border-surface-200 m-auto shadow-2xs shrink-0" 
          style={{ backgroundColor: info.getValue() }}
        ></div>
      ),
      size: 40,
    }),
    columnHelper.accessor('item_code', {
      header: 'Item Code',
      cell: (info) => <span className="font-black text-xs text-primary bg-surface-100 px-2 py-0.5 rounded border border-surface-200">{info.getValue()}</span>,
    }),
    columnHelper.display({
      id: 'type_preset',
      header: 'Type & Preset',
      cell: (info) => {
        const { mType, matType } = getItemDetails(info.row.original);

        const label = matType === 'brick' ? '🧱 Brick Wall'
                    : matType === 'tile' ? '🧱 Tile Floor'
                    : matType === 'concrete' ? '🪨 Concrete Slab'
                    : matType === 'count' ? '📍 Count Item'
                    : mType === 'area' ? '🔲 Generic Area'
                    : '📏 Generic Line';

        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
            {label}
          </span>
        );
      }
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      cell: (info) => {
        const { textDesc } = getItemDetails(info.row.original);
        return <span className="font-bold text-foreground truncate block max-w-md">{textDesc}</span>;
      },
    }),
    columnHelper.accessor('unit', {
      header: 'Unit',
      cell: (info) => <span className="uppercase text-xs font-black text-surface-500">{info.getValue()}</span>,
    }),
    columnHelper.accessor('unit_cost', {
      header: 'Unit Cost',
      cell: (info) => (
        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
          ₹{Number(info.getValue()).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    }),
    columnHelper.accessor('multiplier', {
      header: 'Waste Multiplier',
      cell: (info) => (
        <span className="font-mono text-surface-500 font-bold">
          {Number(info.getValue()).toFixed(2)}x
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      cell: (info) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => onEdit(info.row.original)}
            className="p-1.5 text-surface-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors cursor-pointer"
            title="Edit Material"
          >
            <Pencil size={15} />
          </button>
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
            className="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
            title="Delete Material"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
      size: 80,
    })
  ], [onRefresh, onEdit]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const nextState = updater({ pageIndex, pageSize });
        setPageIndex(nextState.pageIndex);
        setPageSize(nextState.pageSize);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pageCount = table.getPageCount();
  const pageRows = table.getRowModel().rows;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-surface-card text-foreground rounded-2xl border border-surface-200 shadow-xs">
      
      {/* 📊 Summary Metrics Cards Header */}
      <div className="p-4 bg-surface-50/60 dark:bg-surface-100/30 border-b border-surface-200 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        <div className="bg-surface-card dark:bg-surface-100/50 p-3 rounded-xl border border-surface-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-surface-500 dark:text-surface-400">Total Materials</p>
            <p className="text-lg font-black text-foreground mt-0.5">{stats.total}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-200/50 flex items-center justify-center text-accent text-sm font-bold">📦</div>
        </div>
        <div className="bg-surface-card dark:bg-surface-100/50 p-3 rounded-xl border border-surface-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-surface-500 dark:text-surface-400">📏 Length Templates</p>
            <p className="text-lg font-black text-foreground mt-0.5">{stats.lengthCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-sm font-bold">📏</div>
        </div>
        <div className="bg-surface-card dark:bg-surface-100/50 p-3 rounded-xl border border-surface-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-surface-500 dark:text-surface-400">🔲 Area Templates</p>
            <p className="text-lg font-black text-foreground mt-0.5">{stats.areaCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 text-sm font-bold">🔲</div>
        </div>
        <div className="bg-surface-card dark:bg-surface-100/50 p-3 rounded-xl border border-surface-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-surface-500 dark:text-surface-400">📍 Count Presets</p>
            <p className="text-lg font-black text-foreground mt-0.5">{stats.countCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-sm font-bold">📍</div>
        </div>
      </div>

      {/* 🔍 Search & Filter Controls Header */}
      <div className="p-3 border-b border-surface-200 bg-surface-card flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shrink-0">
        
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Search material code, description, or unit..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPageIndex(0);
            }}
            className="w-full pl-9 pr-3 py-1.5 bg-surface-50 dark:bg-surface-100/40 border border-surface-200 rounded-xl text-xs outline-none focus:border-accent font-medium text-foreground placeholder:text-surface-400"
          />
        </div>

        {/* Filter options */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          
          {/* Measurement Type Segmented Button */}
          <div className="flex items-center gap-1 p-0.5 bg-surface-100 dark:bg-surface-100/60 rounded-xl border border-surface-200">
            <button
              onClick={() => { setTypeFilter('all'); setPageIndex(0); }}
              className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                typeFilter === 'all' ? 'bg-surface-card text-foreground shadow-2xs border border-surface-200' : 'text-surface-500 dark:text-surface-400 hover:text-foreground'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => { setTypeFilter('length'); setPageIndex(0); }}
              className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                typeFilter === 'length' ? 'bg-surface-card text-foreground shadow-2xs border border-surface-200' : 'text-surface-500 dark:text-surface-400 hover:text-foreground'
              }`}
            >
              📏 Length
            </button>
            <button
              onClick={() => { setTypeFilter('area'); setPageIndex(0); }}
              className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                typeFilter === 'area' ? 'bg-surface-card text-foreground shadow-2xs border border-surface-200' : 'text-surface-500 dark:text-surface-400 hover:text-foreground'
              }`}
            >
              🔲 Area
            </button>
            <button
              onClick={() => { setTypeFilter('count'); setPageIndex(0); }}
              className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                typeFilter === 'count' ? 'bg-surface-card text-foreground shadow-2xs border border-surface-200' : 'text-surface-500 dark:text-surface-400 hover:text-foreground'
              }`}
            >
              📍 Count
            </button>
          </div>

          {/* Preset dropdown filter */}
          <div className="flex items-center gap-1.5 bg-surface-50 dark:bg-surface-100/40 border border-surface-200 rounded-xl px-2 py-1">
            <Filter size={12} className="text-surface-400" />
            <select
              value={presetFilter}
              onChange={(e) => { setPresetFilter(e.target.value); setPageIndex(0); }}
              className="bg-transparent text-xs font-bold text-foreground outline-none cursor-pointer"
            >
              <option value="all" className="bg-surface-card dark:bg-surface-100 text-foreground">All Presets</option>
              <option value="brick" className="bg-surface-card dark:bg-surface-100 text-foreground">🧱 Brick Wall</option>
              <option value="tile" className="bg-surface-card dark:bg-surface-100 text-foreground">🧱 Tile Floor</option>
              <option value="concrete" className="bg-surface-card dark:bg-surface-100 text-foreground">🪨 Concrete Slab</option>
              <option value="count" className="bg-surface-card dark:bg-surface-100 text-foreground">📍 Count Item</option>
              <option value="generic" className="bg-surface-card dark:bg-surface-100 text-foreground">⚙️ Generic</option>
            </select>
          </div>

          {/* Items Per Page dropdown */}
          <div className="flex items-center gap-1.5 bg-surface-50 dark:bg-surface-100/40 border border-surface-200 rounded-xl px-2 py-1">
            <span className="text-[9px] font-black text-surface-500 dark:text-surface-400 uppercase tracking-widest">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPageIndex(0);
              }}
              className="bg-transparent text-xs font-bold text-foreground outline-none cursor-pointer"
            >
              <option value={10} className="bg-surface-card dark:bg-surface-100 text-foreground">10</option>
              <option value={25} className="bg-surface-card dark:bg-surface-100 text-foreground">25</option>
              <option value={50} className="bg-surface-card dark:bg-surface-100 text-foreground">50</option>
              <option value={100} className="bg-surface-card dark:bg-surface-100 text-foreground">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* 📋 Table Display */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-surface-50 dark:bg-surface-100/80 backdrop-blur-md z-10 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th 
                    key={header.id}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : 'auto' }}
                    className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-surface-500 dark:text-surface-400"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {pageRows.map(row => (
              <tr 
                key={row.id}
                className="border-b border-surface-100 dark:border-surface-200/40 hover:bg-surface-50/70 dark:hover:bg-surface-100/40 transition-colors group"
              >
                {row.getVisibleCells().map(cell => (
                  <td 
                    key={cell.id}
                    className="px-4 py-3 text-sm text-foreground font-medium"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-surface-400 text-sm">
                  <span className="text-3xl mb-2 block opacity-40">🔍</span>
                  No materials match your search or filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 📑 Pagination Footer */}
      <div className="px-4 py-3 border-t border-surface-200 bg-surface-50/60 dark:bg-surface-100/30 flex items-center justify-between shrink-0">
        <div className="text-xs font-bold text-surface-500 dark:text-surface-400">
          Showing {filteredData.length === 0 ? 0 : pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, filteredData.length)} of {filteredData.length} materials
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPageIndex(prev => Math.max(0, prev - 1))}
            disabled={!table.getCanPreviousPage()}
            className="p-1.5 rounded-lg border border-surface-200 bg-surface-card text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-100 transition-colors cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-xs font-black text-foreground px-2">
            Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
          </span>

          <button
            onClick={() => setPageIndex(prev => Math.min(pageCount - 1, prev + 1))}
            disabled={!table.getCanNextPage()}
            className="p-1.5 rounded-lg border border-surface-200 bg-surface-card text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-100 transition-colors cursor-pointer"
            title="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
