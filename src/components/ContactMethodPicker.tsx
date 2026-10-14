import type { ReactNode } from "react";

export type ContactMethod = "whatsapp" | "email" | "telegram";

const METHODS: { value: ContactMethod; label: string; icon: ReactNode }[] = [
  {
    value: "whatsapp",
    label: "WhatsApp",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M11.99 2C6.476 2 2 6.476 2 11.99c0 1.886.511 3.65 1.401 5.168L2 22l4.99-1.376A9.923 9.923 0 0011.99 22c5.514 0 9.99-4.476 9.99-9.99C21.98 6.476 17.504 2 11.99 2z" />
      </svg>
    ),
  },
  {
    value: "email",
    label: "Email",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
  {
    value: "telegram",
    label: "Telegram",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
];

type Props = {
  value: ContactMethod | "";
  onChange: (value: ContactMethod) => void;
  error?: boolean;
};

/** Three toggle buttons; exactly one can be selected. */
export const ContactMethodPicker = ({ value, onChange, error }: Props) => (
  <div className={`flex gap-3 rounded-xl transition-all ${error ? "ring-2 ring-red-100" : ""}`}>
    {METHODS.map((method) => (
      <button
        key={method.value}
        type="button"
        aria-pressed={value === method.value}
        onClick={() => onChange(method.value)}
        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold font-sans transition-all duration-200 ${
          value === method.value
            ? "bg-primary/5 border-primary text-primary"
            : error
              ? "bg-white border-red-400 text-zinc-500 hover:border-red-300"
              : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
        }`}
      >
        {method.icon}
        {method.label}
      </button>
    ))}
  </div>
);
