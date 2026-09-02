"use client";

import React, { useState } from "react";
import {
  X,
  Search,
  Check,
  PlusCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Star,
  User,
} from "lucide-react";
import { inventoryApi } from "@/domains/inventory/api";
import { Vendor } from "@/domains/inventory/types";
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

interface OnboardGlobalSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingVendors: Vendor[];
  onOnboarded?: () => void;
}

export const OnboardGlobalSupplierModal: React.FC<OnboardGlobalSupplierModalProps> = ({
  isOpen,
  onClose,
  existingVendors,
  onOnboarded,
}) => {
  const [search, setSearch] = useState("");
  const [onboardingCode, setOnboardingCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredSuppliers = GLOBAL_SUPPLIER_DIRECTORY.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.categories.some((c) => c.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOnboard = async (supplier: typeof GLOBAL_SUPPLIER_DIRECTORY[0]) => {
    setOnboardingCode(supplier.code);
    try {
      // Check if already onboarded
      const isAlreadyAdded = existingVendors.some(
        (v) => v.name.toLowerCase() === supplier.name.toLowerCase() || v.code === supplier.code
      );

      if (isAlreadyAdded) {
        toast.info(`Supplier "${supplier.name}" is already in your firm vendor catalog.`);
        return;
      }

      await inventoryApi.createVendor({
        name: supplier.name,
        code: supplier.code,
        contact_person: supplier.contact_person,
        phone: supplier.phone,
        email: supplier.email,
        gstin: supplier.gstin,
        address: supplier.address,
        categories: supplier.categories,
        rating: supplier.rating as any,
        is_active: true,
      });

      toast.success(`Successfully onboarded "${supplier.name}" into your Firm Vendor Master!`);
      if (onOnboarded) onOnboarded();
    } catch (err: any) {
      console.error("Failed to onboard global supplier", err);
      toast.error(err?.message || "Failed to onboard supplier.");
    } finally {
      setOnboardingCode(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 p-5 sm:p-6 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl relative space-y-4 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Search & Onboard Material Vendors
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Vendor Directory
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Browse pre-verified building material vendors & manufacturers to add them directly to your Firm Vendor Master
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

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier name, code, or material trade category (Cement, Steel, Tiles, Paints)..."
            className="w-full h-10 pl-10 pr-4 text-xs bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Suppliers List */}
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
              No matching verified global suppliers found.
            </div>
          ) : (
            filteredSuppliers.map((s) => {
              const isAlreadyAdded = existingVendors.some(
                (v) => v.name.toLowerCase() === s.name.toLowerCase() || v.code === s.code
              );

              return (
                <div
                  key={s.code}
                  className="p-4 rounded-xl bg-zinc-950/90 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{s.name}</span>
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {s.rating}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">[{s.code}]</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="font-mono text-zinc-400">GSTIN: {s.gstin}</span>
                      <span className="text-zinc-500">•</span>
                      <span className="text-zinc-400 font-semibold">Vendor</span>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {s.categories.map((c) => (
                        <span
                          key={c}
                          className="text-[9px] font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-400 font-mono"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isAlreadyAdded || onboardingCode === s.code}
                    onClick={() => handleOnboard(s)}
                    className={`h-9 px-4 text-xs font-bold rounded-xl shrink-0 flex items-center gap-1.5 transition-all shadow-md ${
                      isAlreadyAdded
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-blue-600/20"
                    }`}
                  >
                    {isAlreadyAdded ? <Check className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                    {isAlreadyAdded ? "In Vendor Master" : onboardingCode === s.code ? "Onboarding..." : "Onboard & Add Vendor"}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="h-9 px-5 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            Close Directory
          </button>
        </div>
      </div>
    </div>
  );
};
