"use client";

import React, { useState, useEffect } from 'react';
import { projectsApi } from '@/domains/projects/api';
import { Spinner } from '@/components/ui/Spinner';
import { MasterCatalogItem } from '@/store/estimation-store';
import { Download, Upload, Plus } from 'lucide-react';
import { MasterCatalogGrid } from '@/components/catalog/MasterCatalogGrid';
import { MasterCatalogItemModal } from '@/components/catalog/MasterCatalogItemModal';

export default function MasterCatalogPage() {
  const [items, setItems] = useState<MasterCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterCatalogItem | null>(null);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const data = await projectsApi.getMasterCatalog();
      setItems(data);
    } catch (err: any) {
      setError(err.message || "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleDownloadTemplate = () => {
    projectsApi.downloadMasterCatalogTemplate();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      await projectsApi.importMasterCatalog(file);
      await fetchCatalog();
      // Reset input
      e.target.value = '';
    } catch (err: any) {
      alert("Failed to import: " + (err.message || "Unknown error"));
    } finally {
      setImporting(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MasterCatalogItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (data: any) => {
    if (editingItem) {
      await projectsApi.updateMasterCatalogItem(Number(editingItem.id), data);
    } else {
      await projectsApi.createMasterCatalogItem(data);
    }
    await fetchCatalog();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="flex items-center justify-between p-8 border-b border-surface-200 bg-surface-card/60 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Master Catalog</h1>
          <p className="text-sm text-surface-500 mt-1">Manage global cost codes and materials across all projects.</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-surface-50 dark:bg-surface-100/40 border border-surface-200 text-surface-600 dark:text-surface-300 font-bold text-xs uppercase tracking-widest rounded-xl hover:text-accent hover:border-accent transition-colors cursor-pointer"
          >
            <Download size={16} />
            Template
          </button>
          
          <label className="flex items-center gap-2 px-4 py-2 bg-surface-50 dark:bg-surface-100/40 border border-surface-200 text-surface-600 dark:text-surface-300 font-bold text-xs uppercase tracking-widest rounded-xl hover:text-accent hover:border-accent transition-colors cursor-pointer">
            {importing ? <Spinner size="sm" /> : <Upload size={16} />}
            <span>{importing ? 'Importing...' : 'Import'}</span>
            <input 
              type="file" 
              accept=".xlsx,.xls" 
              className="hidden" 
              onChange={handleImport}
              disabled={importing}
            />
          </label>
          
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20 cursor-pointer"
          >
            <Plus size={16} />
            Add Material
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-8">
        <div className="bg-surface-card rounded-2xl border border-surface-200 shadow-sm h-full flex flex-col overflow-hidden">
           <MasterCatalogGrid items={items} onRefresh={fetchCatalog} onEdit={handleOpenEdit} />
        </div>
      </div>
      
      <MasterCatalogItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingItem}
      />
    </div>
  );
}
