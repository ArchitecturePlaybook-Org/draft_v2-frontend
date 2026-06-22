import { fetchFromBff } from "@/shared/api/fetchFromBff";

export interface PortfolioReview {
  id: number;
  reviewer_name: string;
  rating: number;
  comment: string;
  is_verified_client: boolean;
  created_at: string;
}

export interface PortfolioItem {
  id: number;
  slug?: string;
  title: string;
  description: string;
  image: string;
  images?: { id: number; image: string; order: number }[];
  video_url?: string;
  average_rating?: number;
  reviews_count?: number;
  reviews?: PortfolioReview[];
  project_date?: string;
  is_public: boolean;
  views_count?: number;
  is_saved?: boolean;
  related_items?: PortfolioItem[];
  category?: string;
  city?: string;
  country?: string;
  created_at: string;
  user: {
    id: number;
    uid: string;
    name: string;
    category: string;
    city: string;
    country: string;
    completed_projects?: number;
  };
  contributors?: {
    id: number;
    name: string;
    avatar: string | null;
    role?: string;
  }[];
  is_owner?: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const portfoliosApi = {
  listMyPortfolio: async () => {
    return fetchFromBff<PortfolioItem[]>("/api/v1/users/portfolio/", {
      method: "GET",
    });
  },

  addPortfolioItem: async (formData: FormData) => {
    return fetchFromBff<PortfolioItem>("/api/v1/users/portfolio/", {
      method: "POST",
      body: formData,
    });
  },

  updatePortfolioItem: async (id: number, formData: FormData) => {
    return fetchFromBff<PortfolioItem>(`/api/v1/users/portfolio/${id}/`, {
      method: "PATCH",
      body: formData,
    });
  },

  deletePortfolioItem: async (id: number) => {
    return fetchFromBff<void>(`/api/v1/users/portfolio/${id}/`, {
      method: "DELETE",
    });
  },

  searchPublicPortfolios: async (params: { category?: string; city?: string; country?: string; q?: string; page?: number; sort?: string }) => {
    const searchParams = new URLSearchParams();
    if (params.category) searchParams.append("category", params.category);
    if (params.city) searchParams.append("city", params.city);
    if (params.country) searchParams.append("country", params.country);
    if (params.q) searchParams.append("q", params.q);
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.sort) searchParams.append("sort", params.sort);

    return fetchFromBff<PaginatedResponse<PortfolioItem>>(`/api/v1/users/public/portfolios/?${searchParams.toString()}`, {
      method: "GET",
      skipAuth: true,
    });
  },

  getPublicPortfolioItem: async (idOrSlug: string | number) => {
    return fetchFromBff<PortfolioItem>(`/api/v1/users/public/portfolios/${idOrSlug}/`, {
      method: "GET",
      skipAuth: false,
    });
  },

  addPortfolioReview: async (id: number, data: { rating: number; comment: string }) => {
    return fetchFromBff<PortfolioReview>(`/api/v1/users/public/portfolios/${id}/reviews/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  incrementViewCount: async (id: number) => {
    return fetchFromBff<{ views_count: number }>(`/api/v1/users/public/portfolios/${id}/view/`, {
      method: "POST",
      skipAuth: true,
    });
  },

  toggleSavePortfolio: async (id: number) => {
    return fetchFromBff<{ is_saved: boolean }>(`/api/v1/users/portfolios/${id}/toggle_save/`, {
      method: "POST",
    });
  },

  getSavedPortfolios: async (page: number = 1) => {
    return fetchFromBff<PaginatedResponse<PortfolioItem>>(`/api/v1/users/portfolios/saved/?page=${page}`, {
      method: "GET",
    });
  },
};
