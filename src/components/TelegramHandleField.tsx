import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { normalizeTelegramHandle } from "@/lib/telegram";

type Props = {
  /** True while Telegram is the chosen contact method; the field slides open and closed with it. */
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  /** Set by the form after a submit attempt with the username missing or invalid. */
  error?: boolean;
  inputClass: string;
  inputErrorClass: string;
  labelClass: string;
};

/**
 * The Telegram username, asked only of people who chose Telegram.
 *
 * It opens with a height + fade transition (CSS grid rows 0fr -> 1fr, so no measuring and no animation
 * library) and closes the same way when another method is picked. While closed it is out of the tab order
 * and out of form validation. Reduced-motion users get the change without the movement.
 */
export const TelegramHandleField = ({
  open,
  value,
  onChange,
  error,
  inputClass,
  inputErrorClass,
  labelClass,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [touched, setTouched] = useState(false);

  const typed = value.trim().length > 0;
  const invalid = typed && normalizeTelegramHandle(value) === "";
  const showError = Boolean(error) || (touched && invalid);

  // Let the panel start opening, then put the cursor in it. Skipped when a username is already typed.
  useEffect(() => {
    if (!open || value) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 260);
    return () => window.clearTimeout(timer);
    // Only the moment of opening matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div
      className={`grid transition-all duration-300 ease-out motion-reduce:transition-none ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
      aria-hidden={!open}
    >
      <div className="overflow-hidden">
        <div
          className={`pt-4 transition-transform duration-300 ease-out motion-reduce:transition-none ${
            open ? "translate-y-0" : "-translate-y-2"
          }`}
        >
          <label htmlFor="telegramHandle" className={`${labelClass} flex items-center gap-1.5`}>
            <Send className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            Telegram Username <span className="text-primary">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400 font-sans select-none pointer-events-none">
              @
            </span>
            <input
              id="telegramHandle"
              ref={inputRef}
              type="text"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onBlur={() => setTouched(true)}
              disabled={!open}
              required={open}
              maxLength={100}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="yourusername"
              aria-invalid={showError}
              aria-describedby="telegramHandleHint"
              className={`${inputClass} pl-9 ${showError ? inputErrorClass : ""}`}
            />
          </div>
          <p
            id="telegramHandleHint"
            role={showError ? "alert" : undefined}
            className={`mt-2 text-xs font-sans leading-relaxed ${showError ? "text-red-500" : "text-zinc-400"}`}
          >
            {showError
              ? typed
                ? "Usernames are 5–32 characters: letters, numbers or underscores, starting with a letter."
                : "Add your Telegram username so we can reach you there."
              : "Find it in Telegram under Settings. A pasted t.me link works too."}
          </p>
        </div>
      </div>
    </div>
  );
};
