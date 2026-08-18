import { fetchFromBff } from "@/shared/api/fetchFromBff";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProductStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "SOLD_OUT";
export type OrderStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "FULFILLED" | "CANCELLED";

export interface ProductImage {
  id: number;
  image_url: string;
  order: number;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  vendor: number;
  vendor_name: string;
  vendor_uid: string;
  category: string;
  subcategory: string;
  tags: string[];
  price_display: string;
  price_min: string | null;
  price_max: string | null;
  price_unit: string;
  cover_image_url: string;
  has_3d_model: boolean;
  model_3d_url?: string;
  has_bim_file: boolean;
  bim_file_url?: string;
  status: ProductStatus;
  is_featured: boolean;
  views_count: number;
  interest_count: number;
  lead_time_days: number | null;
  country_of_origin: string;
  image_count: number;
  created_at: string;
  // Detail only
  description?: string;
  spec_sheet_url?: string;
  images?: ProductImage[];
  user_has_ordered?: boolean;
}

export interface ProductOrder {
  id: number;
  product: number;
  product_name: string;
  product_slug: string;
  product_cover: string;
  buyer: number;
  buyer_name: string;
  buyer_uid: string;
  quantity: number;
  message: string;
  status: OrderStatus;
  vendor_note: string;
  created_at: string;
}

export interface VendorStats {
  total_products: number;
  active_products: number;
  draft_products: number;
  total_views: number;
  total_interests: number;
  pending_orders: number;
  total_orders: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ─── Public Discovery ────────────────────────────────────────────────────────

export async function fetchProducts(params?: {
  category?: string;
  search?: string;
  sort?: string;
  has_3d?: boolean;
  has_bim?: boolean;
  has_spec?: boolean;
  featured?: boolean;
  vendor?: string;
  origin?: string;
  max_lead_time?: number;
  min_price?: number;
  max_price?: number;
  page?: number;
}): Promise<PaginatedResponse<Product>> {
  const q = new URLSearchParams();
  if (params?.category) q.set("category", params.category);
  if (params?.search) q.set("search", params.search);
  if (params?.sort) q.set("sort", params.sort);
  if (params?.has_3d) q.set("has_3d", "true");
  if (params?.has_bim) q.set("has_bim", "true");
  if (params?.has_spec) q.set("has_spec", "true");
  if (params?.featured) q.set("featured", "true");
  if (params?.vendor) q.set("vendor", params.vendor);
  if (params?.origin) q.set("origin", params.origin);
  if (params?.max_lead_time) q.set("max_lead_time", String(params.max_lead_time));
  if (params?.min_price) q.set("min_price", String(params.min_price));
  if (params?.max_price) q.set("max_price", String(params.max_price));
  if (params?.page) q.set("page", String(params.page));
  const qs = q.toString() ? `?${q.toString()}` : "";
  return fetchFromBff<PaginatedResponse<Product>>(`/api/v1/showroom/products/${qs}`);
}

export async function fetchProductDetail(slug: string): Promise<Product> {
  return fetchFromBff<Product>(`/api/v1/showroom/products/${slug}/`);
}

export async function placeOrder(slug: string, quantity: number, message: string): Promise<ProductOrder> {
  return fetchFromBff<ProductOrder>(`/api/v1/showroom/products/${slug}/order/`, {
    method: "POST",
    body: JSON.stringify({ quantity, message }),
  });
}

// ─── Buyer ───────────────────────────────────────────────────────────────────

export async function fetchMyOrders(status?: OrderStatus): Promise<ProductOrder[]> {
  const qs = status ? `?status=${status}` : "";
  const data = await fetchFromBff<PaginatedResponse<ProductOrder> | ProductOrder[]>(`/api/v1/showroom/my-orders/${qs}`);
  return Array.isArray(data) ? data : (data as PaginatedResponse<ProductOrder>).results || [];
}

export async function cancelOrder(id: number): Promise<ProductOrder> {
  return fetchFromBff<ProductOrder>(`/api/v1/showroom/my-orders/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ status: "CANCELLED" }),
  });
}

// ─── Vendor Dashboard ────────────────────────────────────────────────────────

export async function fetchVendorStats(): Promise<VendorStats> {
  return fetchFromBff<VendorStats>("/api/v1/showroom/dashboard/stats/");
}

export async function fetchVendorProducts(): Promise<PaginatedResponse<Product>> {
  return fetchFromBff<PaginatedResponse<Product>>("/api/v1/showroom/dashboard/products/");
}

export async function createProduct(data: Partial<Product>): Promise<Product> {
  return fetchFromBff<Product>("/api/v1/showroom/dashboard/products/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProduct(id: number, data: Partial<Product>): Promise<Product> {
  return fetchFromBff<Product>(`/api/v1/showroom/dashboard/products/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteProduct(id: number): Promise<void> {
  return fetchFromBff<void>(`/api/v1/showroom/dashboard/products/${id}/`, { method: "DELETE" });
}

export async function fetchVendorOrders(params?: { status?: OrderStatus; product?: number }): Promise<ProductOrder[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.product) q.set("product", String(params.product));
  const qs = q.toString() ? `?${q.toString()}` : "";
  const data = await fetchFromBff<PaginatedResponse<ProductOrder> | ProductOrder[]>(
    `/api/v1/showroom/dashboard/orders/${qs}`
  );
  return Array.isArray(data) ? data : (data as PaginatedResponse<ProductOrder>).results || [];
}

export async function updateOrderStatus(
  id: number,
  status: OrderStatus,
  vendor_note?: string
): Promise<ProductOrder> {
  return fetchFromBff<ProductOrder>(`/api/v1/showroom/dashboard/orders/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ status, vendor_note }),
  });
}

// ─── Quotations & PDF Proforma Invoicing ───────────────────────────────────

export interface QuotationData {
  quotation_number: string;
  unit_price: number;
  quantity: number;
  discount_amount: number;
  freight_charges: number;
  tax_rate_percent: number;
  subtotal: number;
  tax_amount: number;
  grand_total: number;
  valid_until?: string;
  payment_terms?: string;
  notes?: string;
  created_at?: string;
  status: "OFFERED" | "ACCEPTED" | "DECLINED";
}

export async function createOrderQuotation(
  orderId: number,
  payload: {
    unit_price: number;
    quantity?: number;
    discount_amount?: number;
    freight_charges?: number;
    tax_rate_percent?: number;
    valid_until?: string;
    payment_terms?: string;
    notes?: string;
  }
): Promise<{ detail: string; quotation: QuotationData; order_id: number }> {
  return fetchFromBff<{ detail: string; quotation: QuotationData; order_id: number }>(
    `/api/v1/showroom/orders/${orderId}/quotation/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function acceptOrderQuotation(
  orderId: number
): Promise<{ detail: string; status: OrderStatus; quotation: QuotationData }> {
  return fetchFromBff<{ detail: string; status: OrderStatus; quotation: QuotationData }>(
    `/api/v1/showroom/orders/${orderId}/accept-quotation/`,
    {
      method: "POST",
    }
  );
}

export function getQuotationPdfUrl(orderId: number): string {
  const host =
    process.env.NEXT_PUBLIC_BFF_HOST ||
    (typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://127.0.0.1:8000" : "");
  return `${host}/api/v1/showroom/orders/${orderId}/pdf/`;
}

// ─── Project Bill of Quantities (BoQ) Integration ───────────────────────────

export async function addToProjectBoQ(
  slug: string,
  payload: {
    project_id: number;
    trade_division?: string;
    quantity?: number;
    unit_price?: number;
    notes?: string;
  }
): Promise<{ detail: string; boq_item: any }> {
  return fetchFromBff<{ detail: string; boq_item: any }>(`/api/v1/showroom/products/${slug}/add-to-boq/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── File & Asset Upload Handler ─────────────────────────────────────────────

export async function uploadShowroomFile(
  file: File,
  fileType: "cover" | "3d" | "bim" | "spec_sheet" | "general" = "general"
): Promise<{ url: string; filename: string; size: number; saved_path: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("file_type", fileType);

  return fetchFromBff<{ url: string; filename: string; size: number; saved_path: string }>(
    "/api/v1/showroom/upload/",
    {
      method: "POST",
      body: formData,
    }
  );
}
