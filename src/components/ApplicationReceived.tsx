import { BackToHomeButton } from "@/components/BackToHomeButton";
import type { ContactMethod } from "@/components/ContactMethodPicker";

const CHANNEL_LABELS: Record<ContactMethod, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  email: "email",
};

type Props = { contactPref: ContactMethod | "" };

/** Confirmation screen shown in place of the form after a successful submit. */
export const ApplicationReceived = ({ contactPref }: Props) => (
  <div className="flex flex-col items-center text-center py-24">
    <div className="relative mb-8">
      <div
        className="absolute inset-0 rounded-full bg-primary/20 animate-ping"
        style={{ animationDuration: "1.8s" }}
      />
      <div className="relative w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg">
        <svg
          viewBox="0 0 24 24"
          className="w-9 h-9 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
    </div>

    <div className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 bg-white border border-zinc-200 px-4 py-1.5 rounded-full uppercase tracking-widest shadow-[0_0_0_4px_#f8fafc] mb-6">
      <span className="relative flex w-2 h-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500" />
      </span>
      Application Received
    </div>

    <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-zinc-900 font-manrope mb-4 leading-tight">
      You're on the list.
      <br />
      <span className="text-primary">We'll be in touch.</span>
    </h1>

    <p className="text-zinc-500 text-base leading-relaxed font-sans max-w-sm mb-10">
      Our team will review your application and reach out via{" "}
      <strong className="text-zinc-700">{CHANNEL_LABELS[contactPref || "email"]}</strong> within 24 hours.
    </p>

    <BackToHomeButton size="md" />
  </div>
);
