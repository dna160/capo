export default function FooterGrid() {
  return (
    <footer style={{ borderLeft: '4px solid #000', borderRight: '4px solid #000', borderBottom: '4px solid #000', background: '#000' }}>
      <div style={{ height: '4px', background: '#00F2FF' }} />

      <div className="footer-grid">
        <div className="footer-col">
          <h3 className="impact-text" style={{ fontSize: 'clamp(20px, 5vw, 24px)', color: '#00F2FF', marginBottom: '16px', lineHeight: 1 }}>
            ULTRA<br />RIDER
          </h3>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', lineHeight: 1.6, letterSpacing: '0.05em' }}>
            A COLLABORATION BETWEEN<br />ULTRAMILK x KAMEN RIDER x MoT
          </p>
        </div>

        <div className="footer-col">
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', marginBottom: '12px', letterSpacing: '0.1em' }}>INFORMATION</p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['TERMS & CONDITIONS', 'PRIVACY POLICY', 'FAQ', 'CONTACT'].map((link) => (
              <a key={link} href="#" style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#FFF', textDecoration: 'none', letterSpacing: '0.05em' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#00F2FF'; }} onMouseLeave={(e) => { e.currentTarget.style.color = '#FFF'; }}>
                {link}
              </a>
            ))}
          </nav>
        </div>

        <div className="footer-col">
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', marginBottom: '12px', letterSpacing: '0.1em' }}>CONNECT</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['@ULTRA_MYM', '@MUSEUMOFTOYS', '@KAMENRIDER'].map((handle) => (
              <a key={handle} href="#" style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#FFF', textDecoration: 'none', letterSpacing: '0.05em' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#00F2FF'; }} onMouseLeave={(e) => { e.currentTarget.style.color = '#FFF'; }}>
                {handle}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#444', letterSpacing: '0.1em' }}>© 2026 MoT MUSEUM OF TOYS. ALL RIGHTS RESERVED.</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#444', letterSpacing: '0.1em' }}>CONFIDENTIAL - REDEMPTION SYSTEM v2.0</span>
      </div>
    </footer>
  );
}
