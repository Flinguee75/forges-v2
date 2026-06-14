const ORB_BASE = {
  position: 'absolute',
  borderRadius: '50%',
  pointerEvents: 'none',
};

export default function HeroOrbs() {
  return (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      {/* Top-left white orb */}
      <div
        className="hero-orb-1"
        style={{
          ...ORB_BASE,
          width: 560,
          height: 560,
          top: -120,
          left: -120,
          background: 'rgba(255,255,255,0.18)',
          filter: 'blur(90px)',
        }}
      />
      {/* Right cyan orb */}
      <div
        className="hero-orb-2"
        style={{
          ...ORB_BASE,
          width: 440,
          height: 440,
          top: '10%',
          right: -80,
          background: 'rgba(94,195,255,0.22)',
          filter: 'blur(85px)',
        }}
      />
      {/* Bottom-center white orb */}
      <div
        className="hero-orb-3"
        style={{
          ...ORB_BASE,
          width: 360,
          height: 360,
          bottom: -80,
          left: '38%',
          background: 'rgba(255,255,255,0.12)',
          filter: 'blur(75px)',
        }}
      />
    </div>
  );
}
