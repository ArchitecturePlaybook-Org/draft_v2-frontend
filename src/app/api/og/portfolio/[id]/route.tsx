import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

async function getPortfolioItem(id: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1//public/portfolios/${id}/`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format'); // 'square' for Instagram 1:1

  const isSquare = format === 'square';
  const width = isSquare ? 1080 : 1200;
  const height = isSquare ? 1080 : 630;

  const item = await getPortfolioItem(id);

  // Fallback card if item not found
  if (!item) {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: '#94a3b8', fontSize: 32, fontWeight: 700 }}>
            Architecture Playbook
          </span>
        </div>
      ),
      { width, height }
    );
  }

  const professionalName = item.user?.name || 'Professional';
  const category = item.user?.category || 'Architecture';
  const location = item.user?.city
    ? `${item.user.city}, ${item.user.country || ''}`
    : item.user?.country || 'Global';
  const completedProjects = item.user?.completed_projects ?? null;
  const projectDate = item.project_date
    ? new Date(item.project_date).getFullYear()
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          position: 'relative',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Background image */}
        {item.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}

        {/* Dark gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: item.image
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.9) 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            padding: isSquare ? '60px' : '52px 64px',
            position: 'relative',
          }}
        >
          {/* Top: Platform brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '8px 18px',
              }}
            >
              <span
                style={{
                  color: 'white',
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                Architecture Playbook
              </span>
            </div>
          </div>

          {/* Bottom: Main info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Category badge */}
            <div style={{ display: 'flex' }}>
              <div
                style={{
                  display: 'flex',
                  background: '#3b82f6',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  padding: '6px 14px',
                  borderRadius: '8px',
                }}
              >
                {category}
              </div>
            </div>

            {/* Project title */}
            <div
              style={{
                color: 'white',
                fontSize: isSquare ? 52 : 56,
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                maxWidth: isSquare ? '900px' : '900px',
                textShadow: '0 2px 20px rgba(0,0,0,0.5)',
              }}
            >
              {item.title.length > 60 ? item.title.slice(0, 57) + '…' : item.title}
            </div>

            {/* Professional info row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  display: 'flex',
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 22,
                  fontWeight: 800,
                  flexShrink: 0,
                  border: '2px solid rgba(255,255,255,0.3)',
                }}
              >
                {professionalName.charAt(0).toUpperCase()}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span
                  style={{ color: 'white', fontSize: 20, fontWeight: 700 }}
                >
                  {professionalName}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15 }}>
                    📍 {location}
                  </span>
                  {completedProjects !== null && (
                    <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15 }}>
                      ✓ {completedProjects} Projects
                    </span>
                  )}
                  {projectDate && (
                    <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15 }}>
                      {projectDate}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width,
      height,
    }
  );
}
