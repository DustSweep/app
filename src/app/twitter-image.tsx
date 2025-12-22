import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Dust Sweeper | Clean Your Solana Wallet';
export const size = {
  width: 1200,
  height: 600,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0f',
          backgroundImage: 'radial-gradient(circle at 25px 25px, #1a1a2e 2%, transparent 0%), radial-gradient(circle at 75px 75px, #16213e 2%, transparent 0%)',
          backgroundSize: '100px 100px',
        }}
      >
        {/* Broom emoji */}
        <div style={{ fontSize: 180, marginBottom: 20 }}>🧹</div>
        
        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            background: 'linear-gradient(to right, #ff0080, #7928ca, #00f0ff)',
            backgroundClip: 'text',
            color: 'transparent',
            letterSpacing: '0.1em',
          }}
        >
          DUST SWEEPER
        </div>
        
        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: '#00f0ff',
            marginTop: 20,
            letterSpacing: '0.15em',
          }}
        >
          CLEAN YOUR BAGS. GET YOUR SOL.
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

