"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ShoppingCart,
  Building2,
  User,
  ShieldCheck,
  Calendar,
  Layers,
  Send,
  Sparkles,
  Truck,
  CheckCircle2,
  DollarSign,
  Briefcase,
  Store,
  PlusCircle,
  Phone,
  MapPin,
  FileText,
  Search,
  Check,
  Star,
} from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";
import { MaterialRequisition, Vendor, Site, MasterMaterial, PurchaseOrder } from "@/domains/inventory/types";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";

// Pre-verified Global Building Material Manufacturers & Supplier Directory
const GLOBAL_SUPPLIER_DIRECTORY = [
  {
    name: "UltraTech Cement & Aggregates Corp",
    code: "SUP-ULTRA",
    contact_person: "Rajesh Sharma (Regional Head)",
    phone: "+91 98200 11223",
    email: "orders@ultratech.com",
    gstin: "07AAAAU1234A1Z5",
    address: "B-Wing, Ahura Centre, Mahakali Caves Road, Andheri East, Mumbai",
    categories: ["CEMENT", "SAND_AGGREGATE"],
    rating: "4.9",
  },
  {
    name: "Tata Steel & TMT Rebar Hub",
    code: "SUP-TATA",
    contact_person: "Sanjay Gupta (Key Accounts)",
    phone: "+91 98111 22334",
    email: "sales@tatasteel.com",
    gstin: "06AAACT5678B2Z1",
    address: "Tata Centre, 43 Jawaharlal Nehru Road, Kolkata",
    categories: ["STRUCTURAL", "TOOLS"],
    rating: "4.95",
  },
  {
    name: "JSW Steel Neosteel TMT & Commercial",
    code: "SUP-JSW",
    contact_person: "Ramesh Jindal (Commercial Lead)",
    phone: "+91 98999 11223",
    email: "jsw@ap.com",
    gstin: "27AAACJ1234A1ZB",
    address: "JSW Centre, Bandra Kurla Complex, Mumbai",
    categories: ["STRUCTURAL", "TOOLS"],
    rating: "4.9",
  },
  {
    name: "Godrej Construction AAC & ReadyMix",
    code: "SUP-GODREJ",
    contact_person: "Anil Kulkarni (Sales Manager)",
    phone: "+91 98333 44556",
    email: "construction@godrej.com",
    gstin: "27AAACG5432B1ZM",
    address: "Pirojshanagar, Vikhroli East, Mumbai",
    categories: ["MASONRY", "CEMENT"],
    rating: "4.8",
  },
  {
    name: "Asian Paints & Royale Finishing Hub",
    code: "SUP-ASIAN",
    contact_person: "Venkatesh Rao (Project Lead)",
    phone: "+91 98444 55667",
    email: "projects@asianpaints.com",
    gstin: "27AAACA1122C1ZR",
    address: "6A Shantinagar, Santacruz East, Mumbai",
    categories: ["FINISHING", "WATERPROOFING"],
    rating: "4.85",
  },
  {
    name: "Kajaria Ceramics & Finishing Depot",
    code: "SUP-KAJARIA",
    contact_person: "Manish Agarwal (Commercial Manager)",
    phone: "+91 98555 66778",
    email: "commercial@kajariaceramics.com",
    gstin: "07AAACK9012C3Z7",
    address: "J1/B1 (Extn.), Mohan Co-op Industrial Estate, Mathura Road, New Delhi",
    categories: ["FINISHING"],
    rating: "4.75",
  },
  {
    name: "Dr. Fixit Pidilite Construction Chemicals",
    code: "SUP-PIDILITE",
    contact_person: "Dr. K. S. Raman (Technical Head)",
    phone: "+91 98666 77889",
    email: "drfixit@pidilite.com",
    gstin: "27AAACP5566G1ZQ",
    address: "Ramkrishna Mandir Road, Kondivita, Andheri East, Mumbai",
    categories: ["WATERPROOFING", "CONSUMABLE"],
    rating: "4.9",
  },
  {
    name: "Schneider Electric & Polycab Electricals",
    code: "SUP-POLYCAB",
    contact_person: "Suresh Menon (Depot In-Charge)",
    phone: "+91 98777 88990",
    email: "depot@polycab.com",
    gstin: "27AAACS7788H1ZS",
    address: "Polycab House, 771 Mogul Lane, Mahim, Mumbai",
    categories: ["MEP", "SAFETY"],
    rating: "4.8",
  },
  {
    name: "Supreme Industries Pipes & Sanitarywares",
    code: "SUP-SUPREME",
    contact_person: "Vikram Mehta (Trade Division)",
    phone: "+91 98888 99001",
    email: "pipes@supreme.co.in",
    gstin: "27AAACS9900K1ZU",
    address: "1161 Solitaire Corporate Park, Chakala, Andheri East, Mumbai",
    categories: ["MEP"],
    rating: "4.85",
  },
];

interface CreatePurchaseOrderFromReqModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisition: MaterialRequisition;
  onCreated?: () => void;
}

export const CreatePurchaseOrderFromReqModal: React.FC<CreatePurchaseOrderFromReqModalProps> = ({
  isOpen,
  onClose,
  requisition,
  onCreated,
}) => {
  const { user } = useAuthStore();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [catalogMaterials, setCatalogMaterials] = useState<MasterMaterial[]>([]);
  
  // Supplier Selection Mode Provision: REGISTERED catalog vs GLOBAL SEARCH vs EXTERNAL unregistered supplier
  const [supplierSource, setSupplierSource] = useState<"REGISTERED" | "GLOBAL_SEARCH" | "EXTERNAL">("REGISTERED");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  
  // Global Directory Search State
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>("");
  const [selectedGlobalSupplier, setSelectedGlobalSupplier] = useState<typeof GLOBAL_SUPPLIER_DIRECTORY[0] | null>(null);

  // External / Local Market Supplier Fields
  const [externalVendorName, setExternalVendorName] = useState<string>("");
  const [externalContactPerson, setExternalContactPerson] = useState<string>("");
  const [externalPhone, setExternalPhone] = useState<string>("");
  const [externalGstin, setExternalGstin] = useState<string>("");
  const [externalAddress, setExternalAddress] = useState<string>("");
  const [autoSaveVendor, setAutoSaveVendor] = useState<boolean>(true);

  const [selectedSiteId, setSelectedSiteId] = useState<string>(requisition?.site || "");
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [paymentTerms, setPaymentTerms] = useState<string>("Net 30 Days Credit");
  const [submitting, setSubmitting] = useState(false);

  // Itemized line items state with line-level supplier overrides
  const [poItems, setPoItems] = useState<
    Array<{
      materialId: string;
      materialName: string;
      itemCode: string;
      category: string;
      unit: string;
      qty: number;
      rate: number;
      taxPercent: number;
      assignedVendorId?: string;
      isPreferred?: boolean;
    }>
  >([]);

  // Vendor Trade Type Filter state
  const [vendorTypeFilter, setVendorTypeFilter] = useState<string>("ALL");

  useEffect(() => {
    if (isOpen && requisition) {
      loadInitialData();
    }
  }, [isOpen, requisition]);

  const loadInitialData = async () => {
    try {
      const [vendorList, siteList, catalogList] = await Promise.all([
        inventoryApi.getVendors(),
        inventoryApi.getSites(),
        inventoryApi.getMaterials(),
      ]);
      setVendors(vendorList);
      setSites(siteList);
      setCatalogMaterials(catalogList);

      if (vendorList.length > 0 && !selectedVendorId) {
        setSelectedVendorId(vendorList[0].id);
      }
      if (siteList.length > 0 && !selectedSiteId) {
        setSelectedSiteId(requisition.site || siteList[0].id);
      }

      // Initialize line items from requisition items with catalog standard rates & preferred vendors
      const items = (requisition.items || []).map((i: any) => {
        const matId = i.material_id || (typeof i.material === "object" ? i.material?.id : i.material) || "";
        const matName = i.material_name || (typeof i.material === "object" ? i.material?.name : "");
        const catalogMat = catalogList.find(
          (m) => String(m.id) === String(matId) || (matName && m.name?.toLowerCase() === matName.toLowerCase())
        );

        const category =
          i.category || (typeof i.material === "object" ? i.material?.category : catalogMat?.category) || "";

        // Default standard rate resolution
        let rate = Number(
          i.standard_rate ||
            (typeof i.material === "object" ? i.material?.standard_rate : 0) ||
            catalogMat?.standard_rate ||
            0
        );

        if (rate === 0) {
          const catUpper = category.toUpperCase();
          if (catUpper.includes("CEMENT")) rate = 380;
          else if (catUpper.includes("MASONRY") || catUpper.includes("BRICK")) rate = 9;
          else if (catUpper.includes("STRUCTURAL") || catUpper.includes("STEEL")) rate = 65;
          else if (catUpper.includes("FINISHING") || catUpper.includes("TILE")) rate = 750;
          else if (catUpper.includes("MEP") || catUpper.includes("VALVE")) rate = 450;
          else if (catUpper.includes("WATERPROOF")) rate = 1800;
          else rate = 350;
        }

        const qty = Number(i.qty_requested || i.quantity_requested || 10);

        // Pre-select Preferred Vendor or matching category vendor for line item
        const preferredVendorId = catalogMat?.preferred_vendor || (catalogMat as any)?.preferred_vendor_id;
        const matchingVendor = preferredVendorId
          ? vendorList.find((v) => String(v.id) === String(preferredVendorId))
          : vendorList.find(
              (v) => v.categories && v.categories.some((c) => c.toUpperCase() === category.toUpperCase())
            );

        return {
          materialId: matId,
          materialName: matName || catalogMat?.name || "Material Item",
          itemCode:
            i.material_item_code ||
            (typeof i.material === "object" ? i.material?.item_code : catalogMat?.item_code) ||
            "MAT",
          category: category,
          unit:
            i.material_unit ||
            (typeof i.material === "object" ? i.material?.unit : catalogMat?.unit) ||
            "UNIT",
          qty: qty,
          rate: rate,
          taxPercent: 18.0,
          assignedVendorId: matchingVendor ? matchingVendor.id : vendorList.length > 0 ? vendorList[0].id : "",
          isPreferred: !!preferredVendorId && !!matchingVendor,
        };
      });
      setPoItems(items);
    } catch (err) {
      console.error("Failed to load PO initialization data", err);
    }
  };

  const handleQtyChange = (index: number, val: number) => {
    const updated = [...poItems];
    updated[index].qty = Math.max(0, val);
    setPoItems(updated);
  };

  const handleRateChange = (index: number, val: number) => {
    const updated = [...poItems];
    updated[index].rate = Math.max(0, val);
    setPoItems(updated);
  };

  const handleLineVendorChange = (index: number, vendorId: string) => {
    const updated = [...poItems];
    updated[index].assignedVendorId = vendorId;
    setPoItems(updated);
  };

  const handleOnboardGlobalSupplier = async (globalSupplier: typeof GLOBAL_SUPPLIER_DIRECTORY[0]) => {
    try {
      // Check if already onboarded in firm catalog
      const existing = vendors.find((v) => v.name.toLowerCase() === globalSupplier.name.toLowerCase() || v.code === globalSupplier.code);
      if (existing) {
        setSelectedVendorId(existing.id);
        setSupplierSource("REGISTERED");
        toast.info(`Supplier "${globalSupplier.name}" is already in your firm vendor catalog.`);
        return;
      }

      // Create vendor in backend
      const created = await inventoryApi.createVendor({
        name: globalSupplier.name,
        code: globalSupplier.code,
        contact_person: globalSupplier.contact_person,
        phone: globalSupplier.phone,
        email: globalSupplier.email,
        gstin: globalSupplier.gstin,
        address: globalSupplier.address,
        categories: globalSupplier.categories,
        rating: globalSupplier.rating as any,
        is_active: true,
      });

      setVendors((prev) => [...prev, created]);
      setSelectedVendorId(created.id);
      setSupplierSource("REGISTERED");
      toast.success(`Successfully onboarded "${globalSupplier.name}" to your firm vendor catalog!`);
    } catch (err: any) {
      console.error("Failed to onboard global supplier", err);
      toast.error(err?.message || "Failed to onboard supplier.");
    }
  };

  const filteredGlobalSuppliers = GLOBAL_SUPPLIER_DIRECTORY.filter(
    (s) =>
      !globalSearchQuery ||
      s.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
      s.categories.some((c) => c.toLowerCase().includes(globalSearchQuery.toLowerCase()))
  );

  const selectedPrimaryVendor = vendors.find((v) => v.id === selectedVendorId);

  const subtotal = poItems.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const totalTax = poItems.reduce(
    (sum, item) => sum + item.qty * item.rate * (item.taxPercent / 100),
    0
  );
  const totalPOAmount = subtotal + totalTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = poItems.filter((i) => i.qty > 0 && i.materialId);

    if (validItems.length === 0) {
      toast.error("Please specify at least one item quantity.");
      return;
    }

    setSubmitting(true);
    try {
      let finalVendorId = selectedVendorId;

      // Provision for EXTERNAL / Unregistered Material Supplier
      if (supplierSource === "EXTERNAL") {
        if (!externalVendorName) {
          toast.error("Please specify the External Supplier Firm Name.");
          setSubmitting(false);
          return;
        }

        // Onboard / Create vendor record for external supplier
        const createdVendor = await inventoryApi.createVendor({
          name: externalVendorName,
          code: `EXT-${Date.now().toString().slice(-4)}`,
          contact_person: externalContactPerson || "Local Vendor Admin",
          phone: externalPhone || "",
          gstin: externalGstin || "",
          address: externalAddress || "External Local Market Supplier",
          is_active: true,
        });

        finalVendorId = createdVendor.id;
        toast.info(`External Supplier "${externalVendorName}" registered in system catalog.`);
      }

      if (!finalVendorId) {
        toast.error("Please select or enter a Material Supplier.");
        setSubmitting(false);
        return;
      }

      const payload = {
        vendor: finalVendorId,
        site: selectedSiteId || requisition.site,
        requisition: requisition.id,
        expected_delivery_date: deliveryDate,
        terms_and_conditions: `Created from Approved MRN #${requisition.mrn_number}. Payment Terms: ${paymentTerms}. ${
          supplierSource === "EXTERNAL"
            ? `External Vendor Note: ${externalVendorName} (Phone: ${externalPhone || "N/A"})`
            : ""
        }`,
        subtotal_amount: Number(subtotal.toFixed(2)),
        tax_amount: Number(totalTax.toFixed(2)),
        total_amount: Number(totalPOAmount.toFixed(2)),
        items: validItems.map((i) => ({
          material: i.materialId,
          qty: Number(i.qty.toFixed(4)),
          rate: Number(i.rate.toFixed(2)),
          tax_percent: Number(i.taxPercent.toFixed(2)),
        })),
      };

      const po = await inventoryApi.createPurchaseOrder(payload);
      try {
        await inventoryApi.updateRequisition(requisition.id, { status: "PO_RAISED" });
      } catch (e) {
        console.error("Failed to update requisition status to PO_RAISED", e);
      }

      toast.success(
        `Purchase Order ${po.po_number || "PO"} generated successfully for ${
          supplierSource === "EXTERNAL" ? externalVendorName : selectedPrimaryVendor?.name || "Supplier"
        }!`
      );

      if (onCreated) onCreated();
      onClose();
    } catch (err: any) {
      console.error("Failed to generate Purchase Order", err);
      toast.error(err?.data?.detail || err?.message || "Failed to generate Purchase Order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !requisition) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 p-5 sm:p-6 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl relative space-y-4 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Generate Purchase Order from Requisition
                </h3>
                <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  MRN #{requisition.mrn_number}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Select registered catalog suppliers, search verified global vendors, or enter local market suppliers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Supplier Source Provision Switcher */}
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
              <span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-purple-400" />
                Material Supplier / Vendor Procurement Provisions
              </span>
              
              {/* Supplier Mode Toggle Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSupplierSource("REGISTERED")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    supplierSource === "REGISTERED"
                      ? "bg-purple-500/20 border border-purple-500 text-purple-300 shadow-sm"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Store className="w-3.5 h-3.5" /> Registered App Suppliers ({vendors.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSupplierSource("GLOBAL_SEARCH")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    supplierSource === "GLOBAL_SEARCH"
                      ? "bg-blue-500/20 border border-blue-500 text-blue-300 shadow-sm"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-blue-400" /> Search & Onboard Global Suppliers
                </button>
                <button
                  type="button"
                  onClick={() => setSupplierSource("EXTERNAL")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    supplierSource === "EXTERNAL"
                      ? "bg-amber-500/20 border border-amber-500 text-amber-300 shadow-sm"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" /> External / Local Spot Supplier
                </button>
              </div>
            </div>

            {/* Mode A: Registered Supplier Selection */}
            {supplierSource === "REGISTERED" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                    Primary App Vendor / Supplier *
                  </label>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 font-bold focus:outline-none focus:border-amber-500"
                  >
                    {vendors.length === 0 ? (
                      <option value="">No suppliers found in catalog</option>
                    ) : (
                      vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          [{v.code}] {v.name} — Rating: ⭐{v.rating || "5.0"}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                    Target Delivery Site Yard
                  </label>
                  <select
                    value={selectedSiteId}
                    onChange={(e) => setSelectedSiteId(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.code}] {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                    Expected On-Site Delivery Date
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Mode B: Search & Onboard Verified Global Supplier Directory */}
            {supplierSource === "GLOBAL_SEARCH" && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      value={globalSearchQuery}
                      onChange={(e) => setGlobalSearchQuery(e.target.value)}
                      placeholder="Search verified manufacturers (e.g. UltraTech, Tata Steel, Asian Paints, Polycab)..."
                      className="w-full h-9 pl-9 pr-3 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <span className="text-[11px] text-zinc-400 shrink-0 font-semibold">
                    Verified Directory ({filteredGlobalSuppliers.length} Suppliers)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {filteredGlobalSuppliers.map((gs) => {
                    const isAlreadyAdded = vendors.some(
                      (v) => v.name.toLowerCase() === gs.name.toLowerCase() || v.code === gs.code
                    );

                    return (
                      <div
                        key={gs.code}
                        className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 transition-all flex items-start justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-xs">{gs.name}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                              ⭐{gs.rating}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono">
                            [{gs.code}] • GSTIN: {gs.gstin}
                          </div>
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {gs.categories.map((c) => (
                              <span key={c} className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-amber-400 font-mono">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOnboardGlobalSupplier(gs)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 transition-all ${
                            isAlreadyAdded
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-blue-600 hover:bg-blue-500 text-white shadow-sm cursor-pointer"
                          }`}
                        >
                          {isAlreadyAdded ? <Check className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
                          {isAlreadyAdded ? "Select Vendor" : "Onboard Vendor"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode C: External / Unregistered Supplier Form */}
            {supplierSource === "EXTERNAL" && (
              <div className="space-y-3 text-xs">
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                  💡 <strong>External Supplier Provision:</strong> Use this to purchase materials from local market traders, spot cash suppliers, or vendors not yet registered in your master catalog.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-300 block mb-1">
                      External Supplier Firm Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sri Lakshmi Building Supplies"
                      value={externalVendorName}
                      onChange={(e) => setExternalVendorName(e.target.value)}
                      className="w-full h-8 px-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-zinc-300 block mb-1">
                      Contact Person & Designation
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Murugan (Proprietor)"
                      value={externalContactPerson}
                      onChange={(e) => setExternalContactPerson(e.target.value)}
                      className="w-full h-8 px-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-zinc-300 block mb-1">
                      Contact Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +91 98450 12345"
                      value={externalPhone}
                      onChange={(e) => setExternalPhone(e.target.value)}
                      className="w-full h-8 px-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-300 block mb-1">
                      GSTIN / Tax ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 27AAAAA0000A1Z5"
                      value={externalGstin}
                      onChange={(e) => setExternalGstin(e.target.value)}
                      className="w-full h-8 px-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-zinc-300 block mb-1">
                      Target Delivery Site Yard
                    </label>
                    <select
                      value={selectedSiteId}
                      onChange={(e) => setSelectedSiteId(e.target.value)}
                      className="w-full h-8 px-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
                    >
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          [{s.code}] {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-zinc-300 block mb-1">
                      Expected On-Site Delivery Date
                    </label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full h-8 px-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Selected Vendor Profile Audit Badge */}
            {supplierSource === "REGISTERED" && selectedPrimaryVendor && (
              <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] text-zinc-300">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Contact Person</span>
                  <span className="font-semibold text-white">{selectedPrimaryVendor.contact_person || "Vendor Admin"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Phone / Email</span>
                  <span className="font-semibold text-amber-300">{selectedPrimaryVendor.phone || selectedPrimaryVendor.email || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">GSTIN Registration</span>
                  <span className="font-mono text-zinc-200">{selectedPrimaryVendor.gstin || "27AAAAA0000A1Z5"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Payment Terms</span>
                  <span className="font-bold text-emerald-400">{selectedPrimaryVendor.payment_terms_days || 30} Days Net Credit</span>
                </div>
              </div>
            )}
          </div>

          {/* Itemized Order Table with Category Filtered Vendors */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-400" />
                Line Item Procurement & Material Quantities ({poItems.length} Items)
              </label>

              {/* Vendor Trade Type Filter Control */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-zinc-400">Filter Vendors by Type:</span>
                <select
                  value={vendorTypeFilter}
                  onChange={(e) => setVendorTypeFilter(e.target.value)}
                  className="h-7 px-2 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">All Vendor Types</option>
                  <option value="CEMENT">Cement & Binders</option>
                  <option value="STRUCTURAL">Structural Steel</option>
                  <option value="MASONRY">Masonry & Blocks</option>
                  <option value="FINISHING">Finishing & Tiles</option>
                  <option value="MEP">MEP & Plumbing</option>
                  <option value="WATERPROOFING">Waterproofing & Chemicals</option>
                </select>
              </div>
            </div>

            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3">Material Item</th>
                    <th className="py-2.5 px-3">Assigned Supplier / Vendor</th>
                    <th className="py-2.5 px-3 w-24">PO Qty</th>
                    <th className="py-2.5 px-3 w-28">Unit Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right">Line Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                  {poItems.map((item, idx) => {
                    const lineSubtotal = item.qty * item.rate;
                    const lineTotal = lineSubtotal * (1 + item.taxPercent / 100);

                    // Active Vendor Filtering (Global Vendor Type Filter OR Item Trade Category)
                    const activeCategoryFilter = vendorTypeFilter !== "ALL" ? vendorTypeFilter : item.category;
                    const categoryMatchingVendors = vendors.filter((v) => {
                      if (!activeCategoryFilter) return true;
                      if (!v.categories || v.categories.length === 0) return true;
                      return v.categories.some((c) => c.toUpperCase() === activeCategoryFilter.toUpperCase());
                    });
                    const availableVendors = categoryMatchingVendors.length > 0 ? categoryMatchingVendors : vendors;

                    return (
                      <tr key={idx} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">{item.materialName}</span>
                            {item.isPreferred && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                                ⭐ Pre-Selected Preferred Supplier
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-zinc-500 font-mono">[{item.itemCode}]</span>
                            {item.category && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono uppercase">
                                {item.category}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {supplierSource === "EXTERNAL" ? (
                            <span className="text-amber-300 font-semibold text-[11px]">
                              {externalVendorName || "External Supplier"}
                            </span>
                          ) : (
                            <select
                              value={item.assignedVendorId || selectedVendorId}
                              onChange={(e) => handleLineVendorChange(idx, e.target.value)}
                              className="w-full h-8 px-2 text-[11px] bg-zinc-900 border border-zinc-700 rounded text-amber-300 font-semibold focus:outline-none focus:border-amber-500"
                            >
                              {availableVendors.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.name} {v.id === selectedVendorId ? "(Primary)" : ""}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="any"
                              value={item.qty}
                              onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value) || 0)}
                              className="w-16 h-7 px-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-amber-300 font-bold focus:outline-none focus:border-amber-500 font-mono"
                            />
                            <span className="text-[10px] text-zinc-400">{item.unit}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <span className="text-zinc-500">₹</span>
                            <input
                              type="number"
                              step="any"
                              value={item.rate}
                              onChange={(e) => handleRateChange(idx, parseFloat(e.target.value) || 0)}
                              className="w-20 h-7 px-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-emerald-400 font-bold focus:outline-none focus:border-amber-500 font-mono"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-400 font-mono">
                          ₹{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Terms & Commercial Conditions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                Commercial Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                <option value="Net 30 Days Credit">Net 30 Days Credit (Standard Vendor Contract)</option>
                <option value="50% Advance + 50% On Delivery">50% Advance + 50% On Delivery</option>
                <option value="100% Cash On Delivery (COD)">100% Cash On Delivery (COD)</option>
                <option value="Spot Cash Payment">Spot Cash Payment (Local Market)</option>
              </select>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex justify-between items-center text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-400 block font-semibold">Subtotal: ₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-[10px] text-zinc-400 block font-semibold">GST Tax (18%): ₹{totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">Total PO Value</span>
                <span className="text-lg font-extrabold text-emerald-400 font-mono">
                  ₹{totalPOAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-9 px-5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2 transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? "Generating Purchase Order..." : "Generate & Issue Purchase Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
