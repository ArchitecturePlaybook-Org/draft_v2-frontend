"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Star,
  Phone,
  Mail,
  MapPin,
  Package,
  CheckCircle,
  XCircle,
  RefreshCw,
  UserCheck,
  UserPlus,
  Send,
  ShieldCheck,
  Check,
} from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";
import { Vendor } from "@/domains/inventory/types";
import { OnboardGlobalSupplierModal } from "@/components/inventory/OnboardGlobalSupplierModal";
import { useAuthStore } from "@/store/auth-store";

const CATEGORIES = ["CEMENT","SAND_AGGREGATE","STRUCTURAL","MASONRY","FINISHING","MEP","WATERPROOFING","SAFETY","TOOLS","CONSUMABLE","OTHER"];

const emptyVendor: Partial<Vendor> = { name:"", code:"", contact_person:"", phone:"", email:"", gstin:"", address:"", categories:[], rating:5, payment_terms_days:30, is_active:true };

export function VendorsTab() {
  const { user } = useAuthStore();
  const rawRole = String((user as any)?.role?.name || (user as any)?.role_name || (user as any)?.role || "").toLowerCase();
  const rawAccount = String((user as any)?.account?.account_type || (user as any)?.account_type || "").toLowerCase();
  const isMaterialSupplier = rawRole.includes("supplier") || rawAccount.includes("supplier");

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showGlobalSearchModal, setShowGlobalSearchModal] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState<Partial<Vendor>>(emptyVendor);
  const [saving, setSaving] = useState(false);
  const [viewVendor, setViewVendor] = useState<Vendor | null>(null);
  const [error, setError] = useState("");

  // Onboarding modal states
  const [onboardVendorTarget, setOnboardVendorTarget] = useState<Vendor | null>(null);
  const [onboardForm, setOnboardForm] = useState({ admin_email: "", admin_name: "" });
  const [onboarding, setOnboarding] = useState(false);
  const [onboardSuccessMsg, setOnboardSuccessMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setVendors(await inventoryApi.getVendors({ search })); }
    catch(e) { setError("Failed to load vendors"); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(emptyVendor); setShowModal(true); };
  const openEdit = (v: Vendor) => { setEditing(v); setForm({...v}); setShowModal(true); };

  const openOnboardModal = (v: Vendor) => {
    setOnboardVendorTarget(v);
    setOnboardForm({
      admin_email: v.email || "",
      admin_name: v.contact_person || v.name,
    });
    setOnboardSuccessMsg("");
  };

  const executeOnboarding = async () => {
    if (!onboardVendorTarget) return;
    if (!onboardForm.admin_email) {
      setError("Vendor Admin email address is required for onboarding.");
      return;
    }
    setOnboarding(true);
    setError("");
    try {
      const res = await inventoryApi.onboardVendor(onboardVendorTarget.id, onboardForm);
      setOnboardSuccessMsg(`Invitation email sent to ${res.email_sent_to}. Account connected with role 'Vendor Admin'.`);
      await load();
      if (viewVendor?.id === onboardVendorTarget.id) {
        setViewVendor(res.vendor);
      }
    } catch (e: any) {
      setError(e?.message || "Onboarding failed");
    } finally {
      setOnboarding(false);
    }
  };

  const save = async () => {
    setSaving(true); setError("");
    try {
      if (editing) await inventoryApi.updateVendor(editing.id, form);
      else await inventoryApi.createVendor(form);
      setShowModal(false); load();
    } catch(e: any) { setError(e?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this vendor?")) return;
    try { await inventoryApi.deleteVendor(id); load(); }
    catch { setError("Delete failed"); }
  };

  const filtered = vendors.filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-100 font-sans animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Vendor Master & Onboarding</h1>
            <p className="text-xs text-zinc-400">Approved suppliers, material dealers & Vendor Admin user onboarding</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search vendors..." className="h-9 pl-9 pr-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 w-56" />
          </div>
          <button onClick={load} className="h-9 w-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-400 transition-colors"><RefreshCw className="w-4 h-4" /></button>
          {!isMaterialSupplier && (
            <button onClick={() => setShowGlobalSearchModal(true)} className="h-9 px-4 flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/20 cursor-pointer">
              <Search className="w-4 h-4" /> Search & Onboard Global Suppliers
            </button>
          )}
          {!isMaterialSupplier && (
            <button onClick={openCreate} className="h-9 px-4 flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black transition-all shadow-lg shadow-amber-500/20 cursor-pointer">
              <Plus className="w-4 h-4" /> Add Vendor
            </button>
          )}
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between"><span>{error}</span><button onClick={()=>setError("")}>✕</button></div>}
      {onboardSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{onboardSuccessMsg}</span>
          <button onClick={()=>setOnboardSuccessMsg("")} className="ml-auto text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:"Total Vendors", value: vendors.length, color:"text-zinc-200" },
          { label:"Active Suppliers", value: vendors.filter(v=>v.is_active).length, color:"text-emerald-400" },
          { label:"Vendor Admins Onboarded", value: vendors.filter(v=>v.onboarding_status==="ONBOARDED"||v.onboarding_status==="INVITED").length, color:"text-amber-400" },
          { label:"Avg Rating", value: vendors.length ? (vendors.reduce((s,v)=>s+Number(v.rating),0)/vendors.length).toFixed(1):"—", color:"text-blue-400" },
        ].map(s=>(
          <div key={s.label} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 shadow-md">
        <div className="p-3 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between text-xs font-bold text-zinc-200">
          <span>Vendor Registry & Role Credentials — {filtered.length} Vendors</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/60 text-zinc-400 uppercase text-[10px] font-semibold border-b border-zinc-800">
              <tr>
                {["Code","Vendor Name","Contact Person","GSTIN","Categories","Rating","Role Status","Actions"].map(h=>(
                  <th key={h} className="py-2.5 px-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-zinc-500">Loading vendors...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-zinc-500">No vendors found. Add your first vendor.</td></tr>
              ) : filtered.map(v=>(
                <tr key={v.id} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-amber-400 font-bold">{v.code}</td>
                  <td className="py-2.5 px-3 font-medium text-white">
                    <div>{v.name}</div>
                    {v.email && <div className="text-[10px] text-zinc-500">{v.email}</div>}
                  </td>
                  <td className="py-2.5 px-3 text-zinc-300">
                    <div>{v.contact_person || "—"}</div>
                    <div className="text-zinc-500 text-[10px]">{v.phone}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[10px] text-zinc-400">{v.gstin || "—"}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {(v.categories||[]).slice(0,2).map(c=>(
                        <span key={c} className="px-1.5 py-0.5 rounded text-[9px] bg-zinc-800 text-zinc-400 border border-zinc-700">{c}</span>
                      ))}
                      {(v.categories||[]).length > 2 && <span className="text-[9px] text-zinc-500">+{v.categories.length-2}</span>}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1 text-amber-400 font-bold">
                      <Star className="w-3 h-3 fill-amber-400" />{Number(v.rating).toFixed(1)}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    {v.onboarding_status === "ONBOARDED" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                        <ShieldCheck className="w-3 h-3"/> Vendor Admin Active
                      </span>
                    ) : v.onboarding_status === "INVITED" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit">
                        <Send className="w-3 h-3"/> Invite Sent
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700 w-fit block">
                        Not Onboarded
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1">
                      {!isMaterialSupplier && (
                        <button onClick={()=>openOnboardModal(v)} title="Onboard & Invite Vendor Admin User" className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 font-bold text-[10px] flex items-center gap-1 transition-all">
                          <UserPlus className="w-3 h-3"/> Onboard
                        </button>
                      )}
                      <button onClick={()=>setViewVendor(v)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition-colors"><Eye className="w-3.5 h-3.5"/></button>
                      {!isMaterialSupplier && (
                        <button onClick={()=>openEdit(v)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition-colors"><Edit2 className="w-3.5 h-3.5"/></button>
                      )}
                      {!isMaterialSupplier && (
                        <button onClick={()=>del(v.id)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard Vendor Modal */}
      {onboardVendorTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-950 border border-amber-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-sm">Onboard Vendor & Assign 'Vendor Admin' Role</h2>
                  <p className="text-[11px] text-zinc-400">{onboardVendorTarget.name} ({onboardVendorTarget.code})</p>
                </div>
              </div>
              <button onClick={()=>setOnboardVendorTarget(null)} className="text-zinc-400 hover:text-white text-lg">✕</button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400"/>
                  Role Assignment: Vendor Admin
                </div>
                <p className="text-[11px] text-amber-300/80">
                  This action connects this vendor to a dedicated user account assigned the official <strong>Vendor Admin</strong> role. An email invite with setup instructions will be sent automatically.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">Vendor Admin Contact Name *</label>
                <input
                  type="text"
                  value={onboardForm.admin_name}
                  onChange={e=>setOnboardForm(p=>({...p, admin_name: e.target.value}))}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">Vendor Admin Email Address (Invitation Recipient) *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"/>
                  <input
                    type="email"
                    value={onboardForm.admin_email}
                    onChange={e=>setOnboardForm(p=>({...p, admin_email: e.target.value}))}
                    placeholder="vendor.admin@company.com"
                    className="w-full h-9 pl-9 pr-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1 font-mono text-[11px]">
                <div className="text-zinc-400 text-[10px] font-semibold uppercase">Invitation Details</div>
                <div className="text-zinc-300">Recipient: <span className="text-white font-bold">{onboardForm.admin_email || "—"}</span></div>
                <div className="text-zinc-300">Account Role: <span className="text-amber-400 font-bold">Vendor Admin</span></div>
                <div className="text-zinc-300">Setup URL: <span className="text-zinc-500">http://localhost:3000/auth/setup-password</span></div>
              </div>
            </div>

            <div className="p-5 border-t border-zinc-800 bg-zinc-900/40 flex gap-3 justify-end">
              <button onClick={()=>setOnboardVendorTarget(null)} className="h-9 px-4 rounded-xl border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800">
                Cancel
              </button>
              <button
                onClick={executeOnboarding}
                disabled={onboarding || !onboardForm.admin_email}
                className="h-9 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4"/>
                {onboarding ? "Sending Invitation..." : "Send Onboarding Mail & Link Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="font-bold text-white text-sm">{editing ? "Edit Vendor" : "Add New Vendor"}</h2>
              <button onClick={()=>setShowModal(false)} className="text-zinc-500 hover:text-zinc-200 text-lg">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {label:"Vendor Name *",key:"name",type:"text",span:2},
                  {label:"Vendor Code *",key:"code",type:"text",span:1},
                  {label:"GSTIN",key:"gstin",type:"text",span:1},
                  {label:"Contact Person",key:"contact_person",type:"text",span:1},
                  {label:"Phone",key:"phone",type:"text",span:1},
                  {label:"Email",key:"email",type:"email",span:1},
                  {label:"Payment Terms (Days)",key:"payment_terms_days",type:"number",span:1},
                  {label:"Rating (0-5)",key:"rating",type:"number",span:1},
                ].map(f=>(
                  <div key={f.key} className={f.span===2?"col-span-2":""}>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">{f.label}</label>
                    <input type={f.type} value={(form as any)[f.key]||""} onChange={e=>setForm(p=>({...p,[f.key]:f.type==="number"?Number(e.target.value):e.target.value}))}
                      className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">Address</label>
                <textarea value={form.address||""} onChange={e=>setForm(p=>({...p,address:e.target.value}))} rows={2}
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 resize-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-2">Supply Categories</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c=>{
                    const sel = (form.categories||[]).includes(c);
                    return (
                      <button key={c} type="button" onClick={()=>setForm(p=>({...p,categories:sel?(p.categories||[]).filter(x=>x!==c):[...(p.categories||[]),c]}))}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${sel?"bg-amber-500/20 border-amber-500/50 text-amber-300":"bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="vendor-active" checked={form.is_active||false} onChange={e=>setForm(p=>({...p,is_active:e.target.checked}))} className="rounded border-zinc-600 bg-zinc-900 text-amber-500" />
                <label htmlFor="vendor-active" className="text-xs text-zinc-300">Active Vendor</label>
              </div>
            </div>
            <div className="p-5 border-t border-zinc-800 flex gap-3 justify-end">
              <button onClick={()=>setShowModal(false)} className="h-9 px-4 rounded-xl border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="h-9 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer">
                {saving?"Saving...":editing?"Update Vendor":"Create Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Drawer */}
      {viewVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm" onClick={()=>setViewVendor(null)}>
          <div className="bg-zinc-950 border-l border-zinc-800 h-full w-full max-w-md shadow-2xl p-6 overflow-y-auto space-y-5" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white text-sm">Vendor Profile & Credentials</h2>
              <button onClick={()=>setViewVendor(null)} className="text-zinc-500 hover:text-zinc-200">✕</button>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="font-black text-lg text-white">{viewVendor.name}</div>
              <div className="font-mono text-xs text-amber-400">{viewVendor.code}</div>
              <div className="flex items-center gap-1 text-amber-400 text-sm font-bold"><Star className="w-4 h-4 fill-amber-400"/>{Number(viewVendor.rating).toFixed(1)} / 5.0</div>
              {viewVendor.is_active ? <span className="px-2 py-1 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">✓ Active Supplier</span>
                : <span className="px-2 py-1 rounded-full text-[10px] bg-red-500/10 text-red-400 font-bold border border-red-500/20">✗ Inactive</span>}
            </div>

            {/* Onboarding Credentials Box */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Vendor Onboarding Status
              </div>
              <div className="text-xs text-zinc-300">
                Status: <strong className="text-white">{viewVendor.onboarding_status || "NOT_ONBOARDED"}</strong>
              </div>
              {viewVendor.onboarded_user_email && (
                <div className="text-xs text-zinc-300">
                  Vendor Admin Email: <span className="font-mono text-amber-400">{viewVendor.onboarded_user_email}</span>
                </div>
              )}
              <div className="text-xs text-zinc-300">
                Assigned Role: <span className="font-bold text-amber-400">Vendor Admin</span>
              </div>
              <button
                onClick={()=>{
                  const v = viewVendor;
                  setViewVendor(null);
                  openOnboardModal(v);
                }}
                className="mt-2 w-full h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/20"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {viewVendor.onboarding_status === "ONBOARDED" || viewVendor.onboarding_status === "INVITED" ? "Resend Vendor Admin Invite ✉️" : "Onboard Vendor Admin User"}
              </button>
            </div>

            {[
              {icon:<Phone className="w-4 h-4"/>, label:"Contact Person", value:`${viewVendor.contact_person || "Not set"} · ${viewVendor.phone || "No phone"}`},
              {icon:<Mail className="w-4 h-4"/>, label:"Email Address", value:viewVendor.email || "Not set"},
              {icon:<Package className="w-4 h-4"/>, label:"GSTIN", value:viewVendor.gstin||"Not provided"},
              {icon:<MapPin className="w-4 h-4"/>, label:"Address", value:viewVendor.address||"Not provided"},
            ].map(r=>(
              <div key={r.label} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <div className="text-zinc-500 mt-0.5">{r.icon}</div>
                <div>
                  <div className="text-[10px] text-zinc-500 font-semibold uppercase">{r.label}</div>
                  <div className="text-xs text-zinc-200 mt-0.5">{r.value}</div>
                </div>
              </div>
            ))}
            <div>
              <div className="text-[10px] text-zinc-500 font-semibold uppercase mb-2">Supply Categories</div>
              <div className="flex flex-wrap gap-2">
                {(viewVendor.categories||[]).map(c=><span key={c} className="px-2 py-1 rounded-lg text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700">{c}</span>)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
              Payment Terms: <span className="text-white font-bold">{viewVendor.payment_terms_days} days</span>
            </div>
          </div>
        </div>
      )}

      {/* Global Supplier Directory Search & Instant Onboarding Modal */}
      {showGlobalSearchModal && (
        <OnboardGlobalSupplierModal
          isOpen={showGlobalSearchModal}
          onClose={() => setShowGlobalSearchModal(false)}
          existingVendors={vendors}
          onOnboarded={load}
        />
      )}
    </div>
  );
}
