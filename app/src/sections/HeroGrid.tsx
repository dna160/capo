import { useEffect, useRef } from 'react';
import { MetalLogo } from '@/components/MetalLogo';

export default function HeroGrid() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const metalRef = useRef<MetalLogo | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (!canvasRef.current || initRef.current) return;

    // Wait for layout to settle
    const timer = setTimeout(() => {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.warn('Canvas container has zero dimensions');
        return;
      }

      try {
        const metal = new MetalLogo(canvasRef.current);
        metalRef.current = metal;
        metal.start();
        initRef.current = true;
      } catch (e) {
        console.error('WebGL init failed:', e);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (metalRef.current) {
        metalRef.current.destroy();
        metalRef.current = null;
        initRef.current = false;
      }
    };
  }, []);

  const scrollToTerminal = () => {
    const terminal = document.getElementById('redemption-terminal');
    if (terminal) {
      terminal.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="hero"
      className="hero-section"
    >
      {/* Left Panel - Liquid Metal WebGL */}
      <div
        ref={canvasRef}
        className="hero-canvas"
      >
        <div className="canvas-overlay">
          <p>MoT x Ultramilk x Kamen Rider</p>
        </div>
      </div>

      {/* Right Panel - Logo & CTA */}
      <div className="hero-sidebar">
        {/* Top status bar */}
        <div className="hero-status">
          <span>SYS.ONLINE</span>
          <span className="status-dot" />
        </div>

        {/* Main Logo Text */}
        <div className="hero-logo">
          <h1 className="impact-text">ULTRA<br />RIDER</h1>
        </div>

        {/* Tagline */}
        <div className="hero-tagline">
          <p>UNLOCK THE<br />RIDER WITHIN</p>
        </div>

        {/* CTA Button */}
        <div className="hero-cta-wrap">
          <button onClick={scrollToTerminal} className="hero-cta-btn">
            [ START REDEMPTION ]
          </button>
        </div>
      </div>

      <style>{`
        .hero-section {
          min-height: 100vh;
          display: grid;
          border: 4px solid #000;
          overflow: hidden;
          grid-template-columns: 2fr 1fr;
          grid-template-rows: 1fr;
        }
        .hero-canvas {
          position: relative;
          background: #000;
          overflow: hidden;
          border-right: 4px solid #000;
          min-height: 100vh;
        }
        .hero-canvas canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
        }
        .canvas-overlay {
          position: absolute;
          bottom: 24px;
          left: 24px;
          z-index: 10;
        }
        .canvas-overlay p {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: #00F2FF;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          opacity: 0.6;
        }
        .hero-sidebar {
          display: grid;
          grid-template-rows: auto auto auto 1fr;
          background: #FFF;
          min-height: 0;
        }
        .hero-status {
          border-bottom: 4px solid #000;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .hero-status span {
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          font-family: 'Space Mono', monospace;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          background: #00F2FF;
          display: block;
        }
        .hero-logo {
          padding: 24px;
          border-bottom: 4px solid #000;
        }
        .hero-logo h1 {
          font-size: clamp(36px, 5vw, 64px);
          line-height: 0.9;
          color: #000;
        }
        .hero-tagline {
          padding: 24px;
          border-bottom: 4px solid #000;
        }
        .hero-tagline p {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          line-height: 1.5;
          text-transform: uppercase;
        }
        .hero-cta-wrap {
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        .hero-cta-btn {
          width: 100%;
          padding: 16px 24px;
          background: #000;
          color: #00F2FF;
          font-family: Impact, 'Arial Narrow Bold', sans-serif;
          font-size: clamp(14px, 3vw, 18px);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border: 4px solid #000;
          cursor: pointer;
          transition: none;
        }
        .hero-cta-btn:hover {
          background: #00F2FF;
          color: #000;
        }

        @media (max-width: 768px) {
          .hero-section {
            grid-template-columns: 1fr;
            grid-template-rows: 40vh auto;
          }
          .hero-canvas {
            border-right: none;
            border-bottom: 4px solid #000;
            min-height: 40vh;
          }
          .hero-logo h1 {
            font-size: clamp(32px, 12vw, 48px);
          }
          .hero-cta-btn {
            font-size: 14px;
            padding: 14px 20px;
          }
        }
      `}</style>
    </section>
  );
}
