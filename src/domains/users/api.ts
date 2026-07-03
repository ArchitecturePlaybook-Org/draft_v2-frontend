import { fetchFromBff } from "@/shared/api/fetchFromBff";

export interface PublicProfilePortfolio {
  id: number;
  title: string;
  image: string | null;
  views_count: number;
}

export interface Stakeholder {
  id: number;
  uid: string;
  name: string;
  avatar: string | null;
  category: string | null;
}

export interface PublicProfile {
  id: number;
  uid: string;
  name: string;
  email: string | null;
  bio: string | null;
  avatar: string | null;
  category: string | null;
  city: string | null;
  country: string | null;
  completed_projects: number;
  portfolios: PublicProfilePortfolio[];
  contributed_portfolios: PublicProfilePortfolio[];
  stakeholders: Stakeholder[];
  location?: string;
  metadata?: Record<string, any>;
  social_links: Record<string, string>;
  website: string | null;
}

export const usersApi = {
  getPublicProfile: async (uid: string) => {
    return fetchFromBff<PublicProfile>(`/api/v1/users/public/profiles/${uid}/`, {
      method: "GET",
      skipAuth: true,
    });
  },
};
