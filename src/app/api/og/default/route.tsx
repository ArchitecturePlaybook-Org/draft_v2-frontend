import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%)',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Glow accent */}
        <div
          style={{
            position: 'absolute',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)',
            top: '-100px',
            right: '-100px',
            borderRadius: '50%',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            position: 'relative',
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: '100px',
              padding: '10px 24px',
            }}
          >
            <span style={{ color: '#93c5fd', fontSize: 16, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Professional Portfolio Directory
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              color: 'white',
              fontSize: 80,
              fontWeight: 900,
              letterSpacing: '-0.03em',
              textAlign: 'center',
              lineHeight: 1,
            }}
          >
            Architecture{'\n'}Playbook
          </div>

          {/* Tagline */}
          <div
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 24,
              fontWeight: 400,
              textAlign: 'center',
              maxWidth: '700px',
            }}
          >
            Discover exceptional architectural &amp; construction professionals
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
