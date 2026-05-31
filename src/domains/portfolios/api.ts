import { fetchFromBff } from "@/shared/api/fetchFromBff";

export interface PortfolioItem {
  id: number;
  title: string;
  description: string;
  image: string;
  project_date?: string;
  is_public: boolean;
  views_count?: number;
  is_saved?: boolean;
  related_items?: PortfolioItem[];
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
    return fetchFromBff<PortfolioItem[]>("/api/users/portfolio/", {
      method: "GET",
    });
  },

  addPortfolioItem: async (formData: FormData) => {
    return fetchFromBff<PortfolioItem>("/api/users/portfolio/", {
      method: "POST",
      body: formData,
    });
  },

  deletePortfolioItem: async (id: number) => {
    return fetchFromBff<void>(`/api/users/portfolio/${id}/`, {
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

    return fetchFromBff<PaginatedResponse<PortfolioItem>>(`/api/users/public/portfolios/?${searchParams.toString()}`, {
      method: "GET",
      skipAuth: true,
    });
  },

  getPublicPortfolioItem: async (id: number) => {
    return fetchFromBff<PortfolioItem>(`/api/users/public/portfolios/${id}/`, {
      method: "GET",
      // skipAuth allows it to work for guests, but if token exists, Bff will forward it
      // which lets backend check `is_saved` for authenticated users.
      skipAuth: false,
    });
  },

  incrementViewCount: async (id: number) => {
    return fetchFromBff<{ views_count: number }>(`/api/users/public/portfolios/${id}/view/`, {
      method: "POST",
      skipAuth: true,
    });
  },

  toggleSavePortfolio: async (id: number) => {
    return fetchFromBff<{ is_saved: boolean }>(`/api/users/portfolios/${id}/toggle_save/`, {
      method: "POST",
    });
  },

  getSavedPortfolios: async (page: number = 1) => {
    return fetchFromBff<PaginatedResponse<PortfolioItem>>(`/api/users/portfolios/saved/?page=${page}`, {
      method: "GET",
    });
  },
};
