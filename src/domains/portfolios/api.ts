import { fetchFromBff } from "@/shared/api/fetchFromBff";

export interface PortfolioItem {
  id: number;
  title: string;
  description: string;
  image: string;
  project_date?: string;
  is_public: boolean;
  created_at: string;
  user: {
    id: number;
    uid: string;
    name: string;
    category: string;
    city: string;
    country: string;
  };
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

  searchPublicPortfolios: async (params: { category?: string; city?: string; country?: string; q?: string }) => {
    const searchParams = new URLSearchParams();
    if (params.category) searchParams.append("category", params.category);
    if (params.city) searchParams.append("city", params.city);
    if (params.country) searchParams.append("country", params.country);
    if (params.q) searchParams.append("q", params.q);

    return fetchFromBff<PortfolioItem[]>(`/api/users/public/portfolios/?${searchParams.toString()}`, {
      method: "GET",
      skipAuth: true,
    });
  },
};
