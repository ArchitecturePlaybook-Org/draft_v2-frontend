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
  has_bim_file: boolean;
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
  featured?: boolean;
  vendor?: string;
  page?: number;
}): Promise<PaginatedResponse<Product>> {
  const q = new URLSearchParams();
  if (params?.category) q.set("category", params.category);
  if (params?.search) q.set("search", params.search);
  if (params?.sort) q.set("sort", params.sort);
  if (params?.has_3d) q.set("has_3d", "true");
  if (params?.has_bim) q.set("has_bim", "true");
  if (params?.featured) q.set("featured", "true");
  if (params?.vendor) q.set("vendor", params.vendor);
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

export async function fetchMyOrders(): Promise<ProductOrder[]> {
  const data = await fetchFromBff<PaginatedResponse<ProductOrder> | ProductOrder[]>("/api/v1/showroom/my-orders/");
  return Array.isArray(data) ? data : (data as PaginatedResponse<ProductOrder>).results || [];
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
