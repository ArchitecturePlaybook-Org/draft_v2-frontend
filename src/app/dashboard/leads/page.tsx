"use client";

import React, { useState, useEffect } from 'react';
import { leadsApi, Lead } from '@/domains/leads/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const data = await leadsApi.listLeads(activeTab);
      setLeads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [activeTab]);

  const handleStatusUpdate = async (id: number, status: Lead['status']) => {
    try {
      await leadsApi.updateLeadStatus(id, status);
      fetchLeads();
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      <div className="bg-white p-10 border border-surface-200 rounded-2xl shadow-sm space-y-8">
        <div>
          <h1 className="text-4xl font-extrabold text-primary mb-3 tracking-tight">Business Opportunity Pipeline</h1>
          <p className="text-sm text-surface-500 max-w-2xl leading-relaxed">
            {activeTab === 'received' 
              ? "Manage architectural inquiries and project leads generated from your professional portfolio." 
              : "Track your active inquiries and project interests sent to other professionals."}
          </p>
        </div>

        <div className="flex gap-4 border-b border-surface-100">
          <button 
            onClick={() => setActiveTab('received')}
            className={`pb-4 px-2 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'received' ? 'text-accent border-accent' : 'text-surface-400 border-transparent'}`}
          >
            Incoming Leads
          </button>
          <button 
            onClick={() => setActiveTab('sent')}
            className={`pb-4 px-2 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'sent' ? 'text-accent border-accent' : 'text-surface-400 border-transparent'}`}
          >
            My Inquiries
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white border border-surface-200 rounded-2xl">
          <Spinner size="lg" label="Synchronizing pipeline data..." />
        </div>
      ) : leads.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {leads.map((lead) => (
              <Card key={lead.id} className="p-8 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between group hover:border-accent/50 transition-all">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-lg font-bold text-primary">
                      {activeTab === 'received' ? lead.client_name.charAt(0) : lead.professional_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-primary">
                        {activeTab === 'received' ? lead.client_name : `Recipient: ${lead.professional_name}`}
                      </h3>
                      <p className="text-[10px] text-surface-400 uppercase tracking-[0.2em] font-mono">ID: {lead.id} • {new Date(lead.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={lead.status === 'PENDING' ? 'warning' : lead.status === 'ACCEPTED' ? 'success' : lead.status === 'REJECTED' ? 'secondary' : 'info'}>
                      {lead.status}
                    </Badge>
                  </div>
                  
                  <div className="bg-surface-50 p-4 rounded-xl border border-surface-100">
                    <p className="text-sm text-surface-600 italic leading-relaxed">"{lead.message}"</p>
                  </div>
                  
                  {lead.metadata && (
                    <div className="flex flex-wrap gap-2">
                      {lead.metadata.project_type && (
                        <div className="px-3 py-1 bg-surface-100 rounded-full text-[10px] font-bold text-surface-600 uppercase tracking-widest border border-surface-200">
                          📁 {lead.metadata.project_type}
                        </div>
                      )}
                      {lead.metadata.timeline && (
                        <div className="px-3 py-1 bg-surface-100 rounded-full text-[10px] font-bold text-surface-600 uppercase tracking-widest border border-surface-200">
                          ⏱ {lead.metadata.timeline}
                        </div>
                      )}
                      {lead.metadata.budget_range && (
                        <div className="px-3 py-1 bg-surface-100 rounded-full text-[10px] font-bold text-surface-600 uppercase tracking-widest border border-surface-200">
                          💰 {lead.metadata.budget_range}
                        </div>
                      )}
                    </div>
                  )}

                  {lead.portfolio_item_title && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-surface-400 uppercase tracking-widest">{activeTab === 'received' ? 'Inquiry Source:' : 'Target Project:'}</span>
                      <span className="text-[9px] font-bold text-accent uppercase tracking-widest bg-accent/5 px-2 py-1 rounded">{lead.portfolio_item_title}</span>
                    </div>
                  )}
                </div>

                {activeTab === 'received' && (
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {lead.status === 'PENDING' && (
                      <>
                        <Button variant="primary" className="px-8 h-12" onClick={() => handleStatusUpdate(lead.id, 'ACCEPTED')}>
                          Accept Inquiry
                        </Button>
                        <Button variant="outline" className="px-8 h-12" onClick={() => handleStatusUpdate(lead.id, 'REJECTED')}>
                          Reject
                        </Button>
                      </>
                    )}
                    {lead.status === 'ACCEPTED' && (
                      <div className="flex gap-2">
                        <Button 
                          className="px-8 h-12 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => {
                            window.location.href = `/dashboard/projects?lead_id=${lead.id}&client_name=${encodeURIComponent(lead.client_name)}&title=${encodeURIComponent(lead.portfolio_item_title || '')}`;
                          }}
                        >
                          Convert to Project
                        </Button>
                        <Button
                          variant="outline"
                          className="px-6 h-12 border-accent text-accent hover:bg-accent/5"
                          onClick={() => {
                            window.location.href = `/dashboard/inbox?user=${lead.client_name}`;
                          }}
                        >
                          Message
                        </Button>
                      </div>
                    )}
                    {lead.status === 'CONVERTED' && (
                      <Badge variant="success" className="px-6 py-2">Converted to Active Project</Badge>
                    )}
                  </div>
                )}

                {activeTab === 'sent' && (
                   <div className="flex flex-col items-end gap-3">
                     <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Status Tracking</span>
                     <div className={`px-6 py-2 rounded-xl border font-bold text-xs ${
                       lead.status === 'PENDING' ? 'bg-surface-50 text-surface-400 border-surface-200' :
                       lead.status === 'ACCEPTED' ? 'bg-green-50 text-green-600 border-green-200' :
                       lead.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-200' :
                       'bg-accent/5 text-accent border-accent/20'
                     }`}>
                       {lead.status === 'PENDING' ? 'Waiting for Professional...' : 
                        lead.status === 'ACCEPTED' ? 'Interest Accepted!' :
                        lead.status === 'REJECTED' ? 'Inquiry Declined' : 'Project Established'}
                     </div>
                     <Button
                        variant="ghost"
                        className="text-[10px] font-bold uppercase tracking-widest text-accent hover:bg-accent/5"
                        onClick={() => {
                          window.location.href = `/dashboard/inbox?user=${lead.professional_name}`;
                        }}
                      >
                        Open Message Channel
                      </Button>
                   </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-32 bg-white border border-surface-200 rounded-2xl shadow-sm">
          <div className="text-5xl mb-6 opacity-20">💼</div>
          <h3 className="text-xl font-bold text-primary mb-2 tracking-tight">Pipeline Empty</h3>
          <p className="text-sm text-surface-400 max-w-sm mx-auto leading-relaxed">
            No business inquiries have been detected yet. Ensure your professional portfolio is populated with high-quality visual assets to attract potential clients.
          </p>
        </div>
      )}
    </div>
  );
}
