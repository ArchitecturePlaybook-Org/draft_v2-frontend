import { useState, useEffect } from "react";
import { webhooksApi, WebhookEndpoint } from "@/domains/core/api";

export function WebhooksView({ orgId }: { orgId: number }) {
    const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [showCreate, setShowCreate] = useState(false);
    const [url, setUrl] = useState("");
    const [events, setEvents] = useState<string[]>([]);
    
    const availableEvents = [
        { id: "project.created", label: "Project Created" },
        { id: "task.status_changed", label: "Task Status Changed" },
        { id: "lead.created", label: "Lead Created" }
    ];

    useEffect(() => {
        loadWebhooks();
    }, [orgId]);

    const loadWebhooks = async () => {
        setIsLoading(true);
        try {
            const data = await webhooksApi.list();
            setWebhooks(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await webhooksApi.create({
                account: orgId,
                url,
                events,
                is_active: true
            });
            setShowCreate(false);
            setUrl("");
            setEvents([]);
            loadWebhooks();
        } catch (error) {
            alert("Failed to create webhook.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this webhook?")) return;
        try {
            await webhooksApi.delete(id);
            loadWebhooks();
        } catch (error) {
            alert("Failed to delete webhook.");
        }
    };

    const handleRegenerateSecret = async (id: number) => {
        if (!confirm("Are you sure you want to regenerate the HMAC secret? This will invalidate the previous secret.")) return;
        try {
            await webhooksApi.regenerateSecret(id);
            loadWebhooks();
        } catch (error) {
            alert("Failed to regenerate secret.");
        }
    };

    const toggleEvent = (eventId: string) => {
        if (events.includes(eventId)) {
            setEvents(events.filter(e => e !== eventId));
        } else {
            setEvents([...events, eventId]);
        }
    };

    if (isLoading) {
        return <div className="p-10 text-center text-primary font-bold animate-pulse tracking-widest uppercase">Loading Webhooks...</div>;
    }

    return (
        <div className="max-w-4xl space-y-10">
            <section className="bg-surface-100 border-surface-200 p-12 border border-surface-200 rounded-2xl shadow-sm space-y-12">
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.3em]">Outbound Event Bus</h3>
                        <p className="text-xs text-surface-400 uppercase tracking-widest font-medium">Configure webhooks to sync events to your external systems.</p>
                    </div>
                    <button 
                        onClick={() => setShowCreate(!showCreate)}
                        className={`px-8 h-12 font-bold uppercase text-[10px] tracking-[0.3em] transition-all shadow-xl ${
                            showCreate ? "bg-surface-200 text-surface-600 text-surface-300" : "bg-accent text-background hover:bg-accent shadow-primary/20"
                        }`}
                    >
                        {showCreate ? "Cancel" : "Add Webhook"}
                    </button>
                </div>

                {showCreate && (
                    <form onSubmit={handleCreate} className="bg-surface-50 p-8 rounded-2xl border border-surface-200 space-y-8 animate-in slide-in-from-top-4 duration-300">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-surface-500 text-surface-400 uppercase tracking-widest">Payload URL</label>
                            <input 
                                type="url" 
                                required 
                                value={url} 
                                onChange={(e) => setUrl(e.target.value)}
                                className="w-full h-12 bg-surface-100 border-surface-200 border border-surface-200 px-5 rounded-xl outline-none focus:border-accent text-sm"
                                placeholder="https://api.yourdomain.com/webhook"
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-bold text-surface-500 text-surface-400 uppercase tracking-widest">Subscribed Events</label>
                            <div className="space-y-3">
                                {availableEvents.map(evt => (
                                    <label key={evt.id} className="flex items-center gap-4 cursor-pointer group">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                            events.includes(evt.id) ? "bg-accent border-accent" : "bg-surface-100 border-surface-200 border-surface-300 group-hover:border-accent"
                                        }`}>
                                            {events.includes(evt.id) && (
                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-sm font-bold text-surface-700">{evt.label}</span>
                                        <span className="text-[10px] font-mono text-surface-400 bg-surface-100 px-2 py-1 rounded ml-auto">{evt.id}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end border-t border-surface-200">
                            <button 
                                type="submit"
                                disabled={isSaving || events.length === 0} 
                                className="px-10 h-12 bg-accent text-background font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-accent disabled:opacity-50 transition-all"
                            >
                                {isSaving ? "Saving..." : "Create Webhook"}
                            </button>
                        </div>
                    </form>
                )}

                <div className="space-y-4">
                    {webhooks.length === 0 ? (
                        <div className="text-center py-10 bg-surface-50 rounded-2xl border border-surface-200 border-dashed">
                            <p className="text-xs text-surface-500 text-surface-400 font-bold uppercase tracking-widest">No webhooks configured.</p>
                        </div>
                    ) : (
                        webhooks.map(webhook => (
                            <div key={webhook.id} className="bg-surface-100 border-surface-200 border border-surface-200 p-6 rounded-2xl space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-2 h-2 rounded-full ${webhook.is_active ? 'bg-emerald-500' : 'bg-surface-300'}`} />
                                            <h4 className="font-mono text-sm font-bold text-primary">{webhook.url}</h4>
                                        </div>
                                        <p className="text-[10px] text-surface-400 uppercase tracking-widest">Added {new Date(webhook.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <button onClick={() => handleDelete(webhook.id)} className="text-surface-400 hover:text-red-500 transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-surface-400 uppercase tracking-[0.2em]">HMAC Secret (X-AP-Signature)</label>
                                    <div className="flex items-center gap-4 bg-surface-50 p-3 rounded-lg border border-surface-200">
                                        <code className="text-xs font-mono text-surface-600 text-surface-300 truncate flex-1">{webhook.secret}</code>
                                        <button 
                                            onClick={() => handleRegenerateSecret(webhook.id)}
                                            className="text-[9px] font-bold uppercase tracking-widest text-accent hover:text-primary transition-colors shrink-0"
                                        >
                                            Regenerate
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {webhook.events.map(e => (
                                        <span key={e} className="px-2 py-1 bg-primary/5 text-primary text-[10px] font-mono rounded border border-primary/10">
                                            {e}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
