export default function ProductShowcase() {
  const products = [
    { name: "BATTLE CHOCO", code: "FLV-001", color: "#8B4513", lightColor: "#D2B48C" },
    { name: "STRAWBERRY BLAST", code: "FLV-002", color: "#FF6B8A", lightColor: "#FFB6C1" },
    { name: "FULL CREAM FINISHER", code: "FLV-003", color: "#4169E1", lightColor: "#B0C4DE" },
  ];

  const sectionBorder = { borderLeft: '4px solid #000', borderRight: '4px solid #000', borderBottom: '4px solid #000' };
  const headerStyle = { borderBottom: '4px solid #000', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#000', flexWrap: 'wrap' as const, gap: '8px' };
  const instructionStyle = { borderTop: '4px solid #000', padding: '14px 16px', background: '#FCEE0A' as const, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' };

  return (
    <section style={sectionBorder}>
      <div style={headerStyle}>
        <span className="impact-text" style={{ fontSize: '14px', color: '#00F2FF', letterSpacing: '0.15em' }}>THE ARSENAL</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#00F2FF', letterSpacing: '0.1em', opacity: 0.7 }}>COLLECT ALL 3</span>
      </div>

      <div className="product-grid">
        {products.map((product, index) => (
          <div
            key={product.code}
            className="product-cell product-panel"
            style={{ padding: '24px 16px', background: product.lightColor, cursor: 'pointer', display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between', minHeight: '220px' }}
          >
            <div>
              <div style={{ display: 'inline-block', padding: '4px 8px', background: '#000', marginBottom: '12px' }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#FFF', letterSpacing: '0.1em' }}>{product.code}</span>
              </div>
              <h3 className="impact-text" style={{ fontSize: 'clamp(22px, 5vw, 32px)', color: '#000', lineHeight: 0.95 }}>{product.name}</h3>
            </div>
            <div style={{ width: '100%', height: '100px', background: product.color, border: '4px solid #000', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '8px', right: '8px', width: '16px', height: '16px', background: '#000' }} />
              <div style={{ position: 'absolute', bottom: '8px', left: '8px', width: '32px', height: '6px', background: '#000' }} />
              <span className="impact-text" style={{ fontSize: '28px', color: 'rgba(255,255,255,0.3)' }}>{String(index + 1).padStart(2, '0')}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={instructionStyle}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 'clamp(9px, 2.5vw, 11px)', letterSpacing: '0.05em', textTransform: 'uppercase' as const, fontWeight: 700, lineHeight: 1.4 }}>
          SCAN QR CODE BEHIND THE FLAP TO REDEEM YOUR DIGITAL WALLPAPER
        </span>
        <span style={{ fontSize: '18px', flexShrink: 0 }}>-&gt;</span>
      </div>
    </section>
  );
}
