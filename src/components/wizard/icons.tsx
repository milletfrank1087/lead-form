/**
 * Inline SVG icons (no icon font, no extra request). Icons that are sized by the surrounding CSS
 * (ticks, check marks) carry no width/height of their own.
 */

type SizeProps = { size?: number };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IconCheck = () => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth="3.4">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const IconAlert = ({ size = 12 }: SizeProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth="2.4">
    <circle cx="12" cy="12" r="9.3" />
    <path d="M12 7.4v5.4M12 16.4v.1" />
  </svg>
);

export const IconLock = ({ size = 11 }: SizeProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth="2.2">
    <rect x="4.2" y="10.4" width="15.6" height="10.4" rx="2.4" />
    <path d="M8.2 10.4V7.6a3.8 3.8 0 0 1 7.6 0v2.8" />
  </svg>
);

export const IconInfo = ({ size = 11 }: SizeProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth="2.2">
    <circle cx="12" cy="12" r="9.3" />
    <path d="M12 11v5.5M12 7.6v.1" />
  </svg>
);

export const IconGlobe = ({ size = 15 }: SizeProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth="1.9">
    <circle cx="12" cy="12" r="9.2" />
    <path d="M3 12h18M12 2.8c2.4 2.6 3.6 5.8 3.6 9.2s-1.2 6.6-3.6 9.2M12 2.8C9.6 5.4 8.4 8.6 8.4 12s1.2 6.6 3.6 9.2" />
  </svg>
);

export const IconArrow = ({ size = 14, className }: SizeProps & { className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth="2.6">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

export const IconChevronLeft = ({ size = 14, className }: SizeProps & { className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth="2.6">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const IconClose = ({ size = 16 }: SizeProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth="2.2">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const IconCopy = ({ size = 14 }: SizeProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth="2.2">
    <rect x="9" y="9" width="11.5" height="11.5" rx="2.4" />
    <path d="M5.6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.6" />
  </svg>
);

export const IconWhatsapp = ({ size = 16 }: SizeProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.5 14.4c-.3-.1-1.8-.9-2-.9-.3-.1-.5-.2-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.4z" />
    <path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.7 1.4 5.2L2 22l5-1.4c1.5.8 3.2 1.3 5 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.6 0-3.2-.4-4.5-1.2l-.3-.2-3 .8.8-2.9-.2-.3C4 15 3.6 13.5 3.6 12 3.6 7.4 7.4 3.6 12 3.6S20.4 7.4 20.4 12 16.6 20.2 12 20.2z" />
  </svg>
);
