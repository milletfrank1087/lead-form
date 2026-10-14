/** Fine grain texture (an inline SVG noise filter) used as a repeating background tile. */
const GRAIN_BACKGROUND = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

/** White page backdrop with grain and two pale-grey corner glows. Sits behind everything. */
export const ApplyBackground = () => (
  <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-white">
    <div
      className="absolute inset-0 opacity-[0.35]"
      style={{
        backgroundImage: GRAIN_BACKGROUND,
        backgroundRepeat: "repeat",
        backgroundSize: "200px",
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse 60% 50% at 100% 0%, rgba(210,210,210,0.55) 0%, transparent 70%)",
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse 55% 45% at 0% 100%, rgba(210,210,210,0.40) 0%, transparent 70%)",
      }}
    />
  </div>
);
