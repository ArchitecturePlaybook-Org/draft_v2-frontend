import type { Metadata } from 'next';
import PortfolioDetailClient from './PortfolioDetailClient';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173';

// Fetch portfolio item data server-side (no auth needed for public items)
async function getPortfolioItem(id: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/users/public/portfolios/${id}/`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// generateMetadata runs server-side — perfect for OG tags
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = await getPortfolioItem(id);

  if (!item) {
    return {
      title: 'Portfolio | Architecture Playbook',
      description: 'Discover professional architecture and construction talent.',
    };
  }

  const title = `${item.title} by ${item.user?.name || 'Professional'} | Architecture Playbook`;
  const description = item.description
    ? item.description.slice(0, 155)
    : `View ${item.user?.name}'s portfolio on Architecture Playbook — ${item.user?.category || 'Professional'} based in ${item.user?.city || 'Global'}.`;

  const ogImageUrl = `${APP_URL}/api/og/portfolio/${id}`;
  const pageUrl = `${APP_URL}/portfolio/${id}`;

  return {
    title,
    description,
    openGraph: {
      title: `${item.title} — ${item.user?.name || 'Professional'}`,
      description,
      url: pageUrl,
      siteName: 'Architecture Playbook',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${item.title} by ${item.user?.name}`,
        },
      ],
      type: 'article',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${item.title} — ${item.user?.name}`,
      description,
      images: [ogImageUrl],
    },
    // Ensure bots can crawl the page
    robots: {
      index: true,
      follow: true,
    },
  };
}

// This is now a Server Component — no "use client" directive
export default async function PortfolioDetailPage() {
  // The page shell is a server component.
  // All interactivity lives in PortfolioDetailClient (which is "use client").
  return <PortfolioDetailClient />;
}
