"use client";

import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Layers, 
  Lock, 
  Sparkles, 
  Edit3, 
  Trash2, 
  Copy, 
  FolderPlus, 
  ChevronDown, 
  ChevronUp,
  RotateCcw,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { useCustomItemsStore, CustomWorkItem } from '@/domains/infralens-boq/custom-items';
import { getUnifiedGroupedItems, UnifiedWorkItem } from '@/domains/infralens-boq/items-registry';
import { CustomItemModal } from '@/components/estimation/CustomItemModal';
import { CustomSectionModal } from '@/components/estimation/CustomSectionModal';
import { formatINR } from '@/domains/infralens-boq/engine';

export default function ItemsOfWorkPage() {
  const { 
    customItems, 
    customSections, 
    deleteCustomItem, 
    duplicateCustomItem, 
    deleteCustomSection,
    resetToDefaults
  } = useCustomItemsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'system' | 'custom'>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomWorkItem | null>(null);
  const [targetSectionForNewItem, setTargetSectionForNewItem] = useState<string | undefined>(undefined);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);

  // Grouped items
  const groupedData = useMemo(() => {
    return getUnifiedGroupedItems(customItems, customSections);
  }, [customItems, customSections]);

  // Total counts
  const totalCustomCount = customItems.length;
  const totalSystemCount = useMemo(() => {
    return groupedData.reduce((acc, g) => acc + g.items.filter(i => !i.isCustom).length, 0);
  }, [groupedData]);
  const totalCount = totalCustomCount + totalSystemCount;

  // Filtered groups
  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return groupedData
      .map(group => {
        // Section filter
        if (selectedSection !== 'all' && group.group !== selectedSection) {
          return null;
        }

        // Filter items within group
        const matchingItems = group.items.filter(item => {
          // Type filter
          if (selectedType === 'system' && item.isCustom) return false;
          if (selectedType === 'custom' && !item.isCustom) return false;

          // Search query
          if (q) {
            const matchName = item.name.toLowerCase().includes(q);
            const matchSlug = item.slug.toLowerCase().includes(q);
            const matchDesc = item.description?.toLowerCase().includes(q);
            const matchGroup = item.group.toLowerCase().includes(q);
            if (!matchName && !matchSlug && !matchDesc && !matchGroup) return false;
          }

          return true;
        });

        if (matchingItems.length === 0 && q) return null;

        return {
          ...group,
          items: matchingItems
        };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);
  }, [groupedData, searchQuery, selectedType, selectedSection]);

  const toggleCollapse = (groupName: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const handleOpenAddCustomItem = (sectionName?: string) => {
    setEditingItem(null);
    setTargetSectionForNewItem(sectionName);
    setIsItemModalOpen(true);
  };

  const handleEditCustomItem = (item: UnifiedWorkItem) => {
    const custom = customItems.find(c => c.id === item.id || c.slug === item.slug);
    if (custom) {
      setEditingItem(custom);
      setIsItemModalOpen(true);
    }
  };

  const handleDeleteItem = (id?: string) => {
    if (!id) return;
    if (confirm("Are you sure you want to delete this custom item of work?")) {
      deleteCustomItem(id);
    }
  };

  const handleDuplicateItem = (id?: string) => {
    if (!id) return;
    duplicateCustomItem(id);
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Items of Work Catalog
              </h1>
              <p className="text-xs text-text-secondary">
                CPWD Standard Items & Custom Specifications for Bill of Quantities (BOQ)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsSectionModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-foreground bg-surface-100 hover:bg-surface-200 border border-surface-200 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-accent" />
            <span>+ New Section</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddCustomItem()}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-accent to-accent-hover text-background text-xs font-black rounded-xl shadow-xs hover:opacity-95 transition-transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Custom Item</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-card border border-surface-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary">
            Total Items of Work
          </span>
          <div className="text-2xl font-mono font-black text-foreground mt-1">
            {totalCount}
          </div>
          <span className="text-[10px] text-text-secondary">In active catalog</span>
        </div>

        <div className="bg-surface-card border border-surface-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary">
            CPWD Standard Items
          </span>
          <div className="text-2xl font-mono font-black text-primary mt-1">
            {totalSystemCount}
          </div>
          <span className="text-[10px] text-text-secondary">Fixed benchmark</span>
        </div>

        <div className="bg-surface-card border border-amber-500/30 rounded-2xl p-4 shadow-xs bg-amber-500/5">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Custom Items
          </span>
          <div className="text-2xl font-mono font-black text-amber-600 dark:text-amber-300 mt-1">
            {totalCustomCount}
          </div>
          <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80">User created & editable</span>
        </div>

        <div className="bg-surface-card border border-surface-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary">
            Sections / Categories
          </span>
          <div className="text-2xl font-mono font-black text-foreground mt-1">
            {groupedData.length}
          </div>
          <span className="text-[10px] text-text-secondary">Including custom categories</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-surface-card border border-surface-200 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items by name, specification, section..."
              className="w-full bg-surface-50 border border-surface-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-foreground outline-none focus:border-accent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1 bg-surface-100 p-1 rounded-xl border border-surface-200 text-xs">
            <button
              type="button"
              onClick={() => setSelectedType('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                selectedType === 'all' ? 'bg-surface-card text-foreground shadow-xs' : 'text-text-secondary hover:text-foreground'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('system')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                selectedType === 'system' ? 'bg-surface-card text-foreground shadow-xs' : 'text-text-secondary hover:text-foreground'
              }`}
            >
              Default Fixed ({totalSystemCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('custom')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                selectedType === 'custom' ? 'bg-surface-card text-amber-600 dark:text-amber-400 shadow-xs' : 'text-text-secondary hover:text-foreground'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Custom ({totalCustomCount})</span>
            </button>
          </div>
        </div>

        {/* Section Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Section:
          </span>
          <button
            type="button"
            onClick={() => setSelectedSection('all')}
            className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors ${
              selectedSection === 'all'
                ? 'bg-accent text-background font-black'
                : 'bg-surface-100 text-text-secondary hover:text-foreground'
            }`}
          >
            All Sections
          </button>
          {groupedData.map(g => (
            <button
              key={g.group}
              type="button"
              onClick={() => setSelectedSection(g.group)}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors flex items-center gap-1 ${
                selectedSection === g.group
                  ? 'bg-accent text-background font-black'
                  : 'bg-surface-100 text-text-secondary hover:text-foreground'
              }`}
            >
              <span>{g.group}</span>
              <span className="text-[10px] opacity-70">({g.items.length})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Grouped Accordion View */}
      <div className="space-y-4">
        {filteredGroups.length === 0 ? (
          <div className="p-12 text-center bg-surface-card rounded-3xl border border-surface-200 space-y-3">
            <Layers className="w-10 h-10 text-surface-400 mx-auto" />
            <h3 className="text-base font-black text-foreground">No Items Match Your Filter</h3>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              Try adjusting your search keywords or section filter, or add a new custom item of work.
            </p>
            <button
              type="button"
              onClick={() => handleOpenAddCustomItem()}
              className="px-4 py-2 bg-accent text-background rounded-xl text-xs font-black"
            >
              + Create Custom Item
            </button>
          </div>
        ) : (
          filteredGroups.map(group => {
            const isCollapsed = collapsedSections[group.group] || false;
            const customItemsInGroup = group.items.filter(i => i.isCustom);

            return (
              <div
                key={group.group}
                className="bg-surface-card rounded-3xl border border-surface-200 overflow-hidden shadow-xs transition-shadow hover:shadow-sm"
              >
                {/* Section Header */}
                <div className="p-3.5 sm:px-5 border-b border-surface-200 bg-surface-50/70 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleCollapse(group.group)}
                      className="text-text-secondary hover:text-foreground p-1 rounded-lg"
                      title={isCollapsed ? "Expand Section" : "Collapse Section"}
                    >
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-black text-foreground tracking-tight">
                          {group.group}
                        </h3>
                        {group.isCustomSection ? (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            Custom Section
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-text-secondary bg-surface-200 dark:bg-surface-800 px-2 py-0.5 rounded-full">
                            CPWD Standard
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                        {customItemsInGroup.length > 0 && ` • ${customItemsInGroup.length} custom`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAddCustomItem(group.group)}
                      className="flex items-center gap-1 text-[11px] font-black text-accent hover:underline px-2.5 py-1 rounded-lg border border-surface-200 bg-surface-card hover:bg-surface-100 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add Item Here
                    </button>

                    {group.isCustomSection && group.items.length === 0 && (
                      <button
                        type="button"
                        onClick={() => deleteCustomSection(group.group)}
                        className="text-[11px] font-bold text-red-600 hover:text-red-700 p-1"
                        title="Delete empty section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Section Items Table */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-surface-100/50 text-[10px] font-black uppercase tracking-wider text-surface-400 border-b border-surface-200">
                          <th className="py-2.5 px-4 w-[42%]">Item of Work & Specifications</th>
                          <th className="py-2.5 px-3 w-[12%]">Unit</th>
                          <th className="py-2.5 px-3 w-[20%]">Estimation Mode</th>
                          <th className="py-2.5 px-3 w-[14%]">Catalog Status</th>
                          <th className="py-2.5 px-4 text-right w-[12%]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                        {group.items.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-text-secondary">
                              No items in this section yet. Click &quot;+ Add Item Here&quot; to create one.
                            </td>
                          </tr>
                        ) : (
                          group.items.map(item => (
                            <tr 
                              key={item.slug} 
                              className={`transition-colors ${
                                item.isCustom 
                                  ? 'bg-amber-500/5 hover:bg-amber-500/10' 
                                  : 'hover:bg-surface-50/70'
                              }`}
                            >
                              {/* Item Name & Details */}
                              <td className="py-3 px-4">
                                <div className="space-y-0.5">
                                  <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                                    {item.isCustom && <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />}
                                    <span>{item.name}</span>
                                  </div>
                                  <div className="text-[11px] text-text-secondary leading-snug">
                                    {item.description || (
                                      <span className="font-mono text-[10px] text-surface-400">
                                        Slug: {item.slug}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Unit */}
                              <td className="py-3 px-3">
                                <span className="font-mono font-bold uppercase text-[11px] bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded-md text-text-secondary">
                                  {item.unit}
                                </span>
                              </td>

                              {/* Pricing / Mode */}
                              <td className="py-3 px-3">
                                {item.isCustom && item.pricingMode === 'direct' ? (
                                  <div>
                                    <span className="text-xs font-mono font-black text-foreground">
                                      {formatINR(item.baseRate || 0)}
                                    </span>
                                    <span className="text-[10px] text-text-secondary block">
                                      Direct Unit Rate
                                    </span>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="text-xs font-bold text-accent flex items-center gap-1">
                                      <Layers className="w-3 h-3" /> CPWD Rate Analysis
                                    </span>
                                    <span className="text-[10px] text-text-secondary block">
                                      {(item.materials?.length || 0)} materials • {(item.labour?.length || 0)} trades
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Status Badge */}
                              <td className="py-3 px-3">
                                {item.isCustom ? (
                                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5" /> Custom
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-surface-500 dark:text-surface-400 bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1" title="Protected System CPWD Recipe">
                                    <Lock className="w-2.5 h-2.5 text-surface-400" /> Fixed (CPWD)
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 text-right">
                                {item.isCustom ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleEditCustomItem(item)}
                                      className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-surface-100 transition-colors"
                                      title="Edit item"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDuplicateItem(item.id)}
                                      className="p-1.5 rounded-lg text-text-secondary hover:text-foreground hover:bg-surface-100 transition-colors"
                                      title="Duplicate item"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="p-1.5 rounded-lg text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                      title="Delete item"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-surface-400 font-medium">
                                    Read-only
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <CustomItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        editingItem={editingItem}
        defaultSection={targetSectionForNewItem}
      />

      <CustomSectionModal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        onSectionCreated={(sec) => setSelectedSection(sec)}
      />
    </div>
  );
}
