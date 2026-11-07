import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { formatUsPhone } from "@/lib/phone";
import { normalizeTelegramHandle } from "@/lib/telegram";
import {
  CHANNELS,
  CREDIT_BANDS,
  HOURS,
  SPEEDS,
  SPEED_PHRASE,
  SPEED_SHORT,
  TIER_PHRASE,
  ZONES,
  type Errors,
  type FieldKey,
  type WizardData,
} from "@/lib/wizard/options";
import { splitName } from "@/lib/wizard/validate";
import {
  APP_NAME,
  copyText,
  displayWhatsappNumber,
  hasWhatsapp,
  type Env,
} from "@/lib/wizard/handoff";
import { fmtHour, zoneLabel, zoneOffset, zoneRegion } from "@/lib/wizard/zone";
import {
  IconAlert,
  IconArrow,
  IconCheck,
  IconCopy,
  IconGlobe,
  IconInfo,
  IconLock,
  IconWhatsapp,
} from "./icons";
import type { LegalKey } from "./legal";

/** Shared by every step. */
export type StepCtx = {
  data: WizardData;
  errors: Errors;
  set: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
  blur: (key: FieldKey) => void;
  openLegal: (doc: LegalKey) => void;
  tzDetected: string;
};

const stag = (i: number): CSSProperties => ({ "--i": i }) as CSSProperties;

/* ---------------------------------------------------------------------------------------------- */
/* Small building blocks                                                                          */
/* ---------------------------------------------------------------------------------------------- */

function Eyebrow({ text }: { text: string }) {
  return (
    <p className="eyebrow stag" style={stag(0)}>
      {text}
    </p>
  );
}

function Title({ children }: { children: ReactNode }) {
  return (
    <h2 className="h stag" style={stag(1)} tabIndex={-1} id="stepTitle">
      {children}
    </h2>
  );
}

function Sub({ children }: { children: ReactNode }) {
  return (
    <p className="sub stag" style={stag(2)}>
      {children}
    </p>
  );
}

function ErrorLine({ id, message, indent }: { id: string; message?: string; indent?: boolean }) {
  if (!message) return null;
  return (
    <p className="err" id={`err-${id}`} style={indent ? { marginLeft: 31 } : undefined}>
      <IconAlert />
      <span>{message}</span>
    </p>
  );
}

type FieldProps = {
  id: FieldKey;
  label: string;
  value: string;
  error?: string;
  hint?: ReactNode;
  prefix?: string;
  type?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  autoComplete?: string;
  enterKeyHint?: "next" | "done" | "go";
  autoCapitalize?: "none" | "words" | "sentences";
  placeholder?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
};

function Field(p: FieldProps) {
  const describedBy = [p.error ? `err-${p.id}` : "", p.hint ? `hint-${p.id}` : ""].filter(Boolean).join(" ");
  return (
    <div className="field">
      <label className="lbl" htmlFor={`in-${p.id}`}>
        {p.label}
      </label>
      <div className={`wrap${p.prefix ? " has-prefix" : ""}`}>
        {p.prefix && (
          <span className="prefix" aria-hidden="true">
            {p.prefix}
          </span>
        )}
        <input
          className={`inp${p.error ? " has-error" : ""}`}
          id={`in-${p.id}`}
          name={p.id}
          type={p.type ?? "text"}
          inputMode={p.inputMode}
          autoComplete={p.autoComplete ?? "off"}
          enterKeyHint={p.enterKeyHint}
          autoCapitalize={p.autoCapitalize}
          autoCorrect="off"
          spellCheck={false}
          placeholder={p.placeholder}
          value={p.value}
          aria-invalid={p.error ? true : undefined}
          aria-describedby={describedBy || undefined}
          onChange={(event) => p.onChange(event.target.value)}
          onBlur={p.onBlur}
        />
      </div>
      {p.hint && (
        <p className="hint" id={`hint-${p.id}`}>
          {p.hint}
        </p>
      )}
      <ErrorLine id={p.id} message={p.error} />
    </div>
  );
}

type CardItem<T extends string> = {
  v: T;
  t: string;
  s?: string;
  tier?: string;
  eta?: string;
  hot?: boolean;
};

function RadioCards<T extends string>(props: {
  name: FieldKey;
  labelId: string;
  items: readonly CardItem<T>[];
  value: T | "";
  onChange: (value: T) => void;
  cols?: 1 | 2;
  error?: string;
}) {
  const { name, labelId, items, value, onChange, cols = 1, error } = props;
  return (
    <>
      <div className={`opts${cols === 2 ? " grid2" : ""}`} role="radiogroup" aria-labelledby={labelId}>
        {items.map((item) => (
          <label className="opt" key={item.v}>
            <input
              type="radio"
              name={name}
              value={item.v}
              checked={value === item.v}
              aria-invalid={error ? true : undefined}
              onChange={() => onChange(item.v)}
            />
            <span className={`opt-box${error ? " is-error" : ""}`}>
              <span className="opt-txt">
                <span className="opt-title">{item.t}</span>
                {item.s && <span className="opt-sub">{item.s}</span>}
              </span>
              {item.tier && <span className="tier">{item.tier}</span>}
              {item.eta && (
                <span className={`eta${item.hot ? " hot" : ""}`} aria-hidden="true">
                  <i />
                  {item.eta}
                </span>
              )}
              <span className="tick" aria-hidden="true">
                <IconCheck />
              </span>
            </span>
          </label>
        ))}
      </div>
      <ErrorLine id={name} message={error} />
    </>
  );
}

function Checkbox(props: {
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  invalidKey: FieldKey;
  style?: CSSProperties;
  className?: string;
  children: ReactNode;
}) {
  return (
    <>
      <label className={`consent${props.className ? ` ${props.className}` : ""}`} style={props.style}>
        <input
          type="checkbox"
          name={props.name}
          checked={props.checked}
          aria-invalid={props.error ? true : undefined}
          onChange={(event) => props.onChange(event.target.checked)}
        />
        <span className="cbox" aria-hidden="true">
          <IconCheck />
        </span>
        <span className="consent-txt">{props.children}</span>
      </label>
      <ErrorLine id={props.invalidKey} message={props.error} indent />
    </>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* 0 · Cover                                                                                      */
/* ---------------------------------------------------------------------------------------------- */

export function CoverStep() {
  const points: [string, string][] = [
    ["The LLC is yours.", "Formed in your legal name, and it stays yours."],
    ["You never pay.", "No fee, no deposit, no outlay at any point."],
    ["No credit check.", "We never run a soft or hard pull on your file."],
    [
      "Paid monthly.",
      "Partnerships are paid a monthly fee once active — faster availability is reflected in your rate.",
    ],
  ];
  return (
    <>
      <Eyebrow text="Partner programme" />
      <Title>Become a Fynex partner</Title>
      <Sub>
        We form a US LLC in your name and open its banking and payment processing. Your part is small: stay
        reachable and complete short identity checks when they come up.
      </Sub>

      <ul className="cover-points stag" style={stag(3)}>
        {points.map(([lead, rest]) => (
          <li key={lead}>
            <span className="cov-ico">
              <IconCheck />
            </span>
            <span>
              <b>{lead}</b> {rest}
            </span>
          </li>
        ))}
      </ul>

      <div className="cover-meta stag" style={stag(4)}>
        <div>
          <span className="k">Format</span>
          <span className="v">5 steps</span>
        </div>
        <div>
          <span className="k">Rough time</span>
          <span className="v">About 2 min</span>
        </div>
        <div>
          <span className="k">Documents</span>
          <span className="v">Later, in chat</span>
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* 1 · Details                                                                                    */
/* ---------------------------------------------------------------------------------------------- */

export function DetailsStep({ data, errors, set, blur }: StepCtx) {
  return (
    <>
      <Eyebrow text="01 / Details" />
      <Title>Your legal details</Title>
      <Sub>Your LLC is formed in this name, so use it exactly as it appears on your government ID.</Sub>

      <div className="fields stag" style={stag(3)}>
        <Field
          id="legalName"
          label="Full legal name"
          placeholder="Jordan A. Vale"
          autoComplete="name"
          enterKeyHint="next"
          autoCapitalize="words"
          value={data.legalName}
          error={errors.legalName}
          onChange={(v) => set("legalName", v)}
          onBlur={() => blur("legalName")}
        />
        <Field
          id="email"
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="you@example.com"
          enterKeyHint="next"
          value={data.email}
          error={errors.email}
          onChange={(v) => set("email", v)}
          onBlur={() => blur("email")}
        />
        <Field
          id="mobile"
          label="Mobile number"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          prefix="+1"
          placeholder="(555) 000-0000"
          enterKeyHint="done"
          hint="Verification links arrive here, so use a number you check daily."
          value={data.mobile}
          error={errors.mobile}
          onChange={(v) => set("mobile", formatUsPhone(v))}
          onBlur={() => blur("mobile")}
        />

        <p className="note">
          <IconLock /> Used only for this application. Never sold or shared.
        </p>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* 2 · Credit                                                                                     */
/* ---------------------------------------------------------------------------------------------- */

export function CreditStep({ data, errors, set }: StepCtx) {
  return (
    <>
      <Eyebrow text="02 / Credit" />
      <Title>A rough idea of your credit</Title>
      <Sub>
        This is only used to work out whether we can open a processing account for you. Checking your own
        score costs you nothing.
      </Sub>

      <div className="fields stag" style={stag(3)}>
        <div className="field">
          <span className="lbl" id="lb-creditBand">
            Approximate credit score
          </span>
          <RadioCards
            name="creditBand"
            labelId="lb-creditBand"
            items={CREDIT_BANDS}
            value={data.creditBand}
            onChange={(v) => set("creditBand", v)}
            cols={2}
            error={errors.creditBand}
          />
        </div>

        <div className="credit-note">
          <div className="cn-head">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            No soft or hard credit check
          </div>
          <p>
            We never pull your credit report. Looking up your own score is a soft inquiry and does not
            affect it. A lower range does not mean no — it goes to a review of your banking options instead.
          </p>
        </div>

        <Checkbox
          name="creditConsent"
          invalidKey="creditConsent"
          checked={data.creditConsent}
          error={errors.creditConsent}
          onChange={(checked) => set("creditConsent", checked)}
        >
          I understand this is my own estimate, not a check you are running, and that a review may be needed
          depending on the range.
        </Checkbox>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* 3 · Availability                                                                               */
/* ---------------------------------------------------------------------------------------------- */

function Commit({ data }: { data: WizardData }) {
  const speed = data.availSpeed ? SPEED_PHRASE[data.availSpeed] : null;
  const tier = data.availSpeed ? TIER_PHRASE[data.availSpeed] : null;
  const offset = data.timezone ? zoneOffset(data.timezone) : "";
  const hours = data.availFrom && data.availTo ? `${fmtHour(data.availFrom)}–${fmtHour(data.availTo)}` : null;

  if (!speed && !hours) {
    return <span>Pick how quickly you can respond and we'll show you exactly what we'll hold you to.</span>;
  }

  const when: ReactNode[] = [];
  if (hours) {
    when.push(
      <span key="h">
        between <b>{hours}</b>
      </span>,
    );
  }
  if (offset) {
    when.push(
      <span key="o">
        your time (<b>{offset}</b>)
      </span>,
    );
  }
  const whenNode: ReactNode = when.length
    ? when.reduce<ReactNode[]>((acc, node, i) => (i === 0 ? [node] : [...acc, " ", node]), [])
    : "during your normal hours";

  if (!speed) {
    return <>We'll send verification links {whenNode}. Tell us above how fast you can answer them.</>;
  }
  return (
    <>
      Verification links expire, so we'll send them {whenNode} and you'll respond <b>{speed}</b>. That places
      you on <b>{tier}</b>. Miss one and your timeline slips — that's the only thing we need from you.
    </>
  );
}

export function PartStep({ data, errors, set, tzDetected }: StepCtx) {
  const [tzOpen, setTzOpen] = useState(!data.timezone);
  const zones = data.timezone && !ZONES.includes(data.timezone) ? [data.timezone, ...ZONES] : [...ZONES];

  const tzSub = !data.timezone
    ? "Choose your timezone"
    : data.tzManual || data.timezone !== tzDetected
      ? "Set by you"
      : `Detected from your device${zoneOffset(data.timezone) ? ` · ${zoneOffset(data.timezone)}` : ""}`;

  return (
    <>
      <Eyebrow text="03 / Availability" />
      <Title>Your part: staying reachable</Title>
      <Sub>
        Once your LLC exists, banks and processors will ask you to prove it is really you. Those requests are
        usually a quick live selfie, and the links expire. This is the only ongoing thing you do.
      </Sub>

      <div className="fields stag" style={stag(3)}>
        <div className="field">
          <span className="lbl" id="lb-availSpeed">
            How quickly can you respond?
          </span>
          <p className="hint" style={{ margin: "0 0 8px" }}>
            Faster availability moves your application along sooner — verifications are what hold a file up —
            and it's reflected in your monthly rate.
          </p>
          <RadioCards
            name="availSpeed"
            labelId="lb-availSpeed"
            items={SPEEDS}
            value={data.availSpeed}
            onChange={(v) => set("availSpeed", v)}
            error={errors.availSpeed}
          />
          <p className="hint">
            The fastest responders are contacted first. Choosing a slower window is fine; it
            just means a longer wait between steps.
          </p>
        </div>

        <div className="field">
          <span className="lbl">When are you normally reachable?</span>
          <div className="time-row">
            <select
              className="sel"
              aria-label="Available from"
              value={data.availFrom}
              onChange={(event) => set("availFrom", event.target.value)}
            >
              {HOURS.map((h) => (
                <option key={h.v} value={h.v}>
                  {h.t}
                </option>
              ))}
            </select>
            <span className="to" aria-hidden="true">
              to
            </span>
            <select
              className="sel"
              aria-label="Available until"
              value={data.availTo}
              onChange={(event) => set("availTo", event.target.value)}
            >
              {HOURS.map((h) => (
                <option key={h.v} value={h.v}>
                  {h.t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <span className="lbl">Your timezone</span>
          <div className="tz-row">
            <span className="tz-ico" aria-hidden="true">
              <IconGlobe />
            </span>
            <span className="tz-body">
              <span className="tz-name">{zoneLabel(data.timezone)}</span>
              <span className="tz-sub">{tzSub}</span>
            </span>
            <button type="button" className="tz-edit" onClick={() => setTzOpen((open) => !open)}>
              {tzOpen && data.timezone ? "Done" : "Change"}
            </button>
          </div>
          {tzOpen && (
            <select
              className="sel"
              aria-label="Choose your timezone"
              style={{ marginTop: 9 }}
              value={data.timezone}
              onChange={(event) => {
                set("timezone", event.target.value);
                set("tzManual", true);
              }}
            >
              {!data.timezone && (
                <option value="" disabled>
                  Select a timezone
                </option>
              )}
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zoneLabel(zone)}
                  {zoneRegion(zone) ? ` · ${zoneRegion(zone)}` : ""} {zoneOffset(zone)}
                </option>
              ))}
            </select>
          )}
          {data.tzManual && tzOpen && (
            <p className="hint">
              We ask you to confirm this because a detected zone can be wrong behind a VPN.
            </p>
          )}
        </div>
      </div>

      <div className="commit stag" style={stag(4)}>
        <Commit data={data} />
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* 4 · Documents (preparation only; nothing is uploaded here)                                     */
/* ---------------------------------------------------------------------------------------------- */

export function ReadyStep({ data, errors, set, openLegal }: StepCtx) {
  const items: { t: string; q: string; w: ReactNode }[] = [
    {
      t: "Your driver's license",
      q: "“Front and back of your license, all four corners showing, no glare.”",
      w: (
        <>
          It must be unexpired. Maya reads the name, date of birth and address off it, then asks you to{" "}
          <b>confirm they're right</b> — so you never retype them.
        </>
      ),
    },
    {
      t: "A selfie holding that license",
      q: "“Your face and the license in one photo. A headshot alone doesn't work.”",
      w: (
        <>
          The license shows who owns the LLC; the selfie proves the person holding it is really you. Both are
          needed.
        </>
      ),
    },
    {
      t: "Your last three months of bank statements",
      q: "“The last three months of statements, all pages. Any readable form works, and online banks count the same.”",
      w: (
        <>
          That means the three most recent <b>complete</b> months — the month you're in now doesn't count yet.
          Chime, Cash App and similar are fine.
        </>
      ),
    },
    {
      t: "Proof of address — probably already in the statements",
      q: "“That recent statement shows your name and current address, so it covers the address proof too.”",
      w: (
        <>
          You only need a separate bill or lease if none of your statements shows your current address. Maya
          tells you which case you're in.
        </>
      ),
    },
  ];

  return (
    <>
      <Eyebrow text="04 / Documents" />
      <Title>What Maya will ask you for</Title>
      <Sub>
        Nothing to upload here. Maya asks for these one at a time in chat, in this order. Knowing what's coming
        is the difference between one clean photo and three retries.
      </Sub>

      <ul className="ask stag" style={stag(3)}>
        {items.map((item, i) => (
          <li key={item.t}>
            <span className="n">{i + 1}</span>
            <span className="body">
              <span className="t">{item.t}</span>
              <span className="q">{item.q}</span>
              <span className="w">{item.w}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="tip stag" style={stag(4)}>
        <IconInfo />
        <span>
          <b>The one thing that causes retakes:</b> in WhatsApp or Telegram, send documents as a <b>file</b>,
          not as a photo. Chat apps shrink pictures, which is the usual reason an upload comes back blurry.
          Email is never shrunk.
        </span>
      </div>

      <Checkbox
        name="readyAck"
        invalidKey="readyAck"
        className="stag"
        style={stag(5)}
        checked={data.readyAck}
        error={errors.readyAck}
        onChange={(checked) => set("readyAck", checked)}
      >
        I have these available, and I agree to the{" "}
        <button type="button" className="linkish" onClick={() => openLegal("terms")}>
          Terms
        </button>{" "}
        and{" "}
        <button type="button" className="linkish" onClick={() => openLegal("privacy")}>
          Privacy Policy
        </button>
        .
      </Checkbox>
    </>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* 5 · Contact channel (last on purpose: contact_pref is required for the lead to be routed)      */
/* ---------------------------------------------------------------------------------------------- */

export function ChannelStep({ data, errors, set, blur }: StepCtx) {
  const telegram = data.contactPref === "telegram";
  const wasTelegram = useRef(telegram);

  // Move into the handle field once it has expanded.
  useEffect(() => {
    if (telegram && !wasTelegram.current) {
      const timer = window.setTimeout(() => {
        document.getElementById("in-telegramHandle")?.focus({ preventScroll: true });
      }, 220);
      wasTelegram.current = true;
      return () => window.clearTimeout(timer);
    }
    wasTelegram.current = telegram;
    return undefined;
  }, [telegram]);

  return (
    <>
      <Eyebrow text="05 / Reach you" />
      <Title>Where should we reach you?</Title>
      <Sub>
        Last one. Maya runs your onboarding conversation: she explains the arrangement, then asks for your
        documents one at a time. Pick the place you actually check.
      </Sub>

      <div className="fields stag" style={stag(3)}>
        <div className="field">
          <span className="lbl" id="lb-contactPref">
            Preferred contact method
          </span>
          <RadioCards
            name="contactPref"
            labelId="lb-contactPref"
            items={CHANNELS}
            value={data.contactPref}
            onChange={(v) => set("contactPref", v)}
            error={errors.contactPref}
          />

          <div className={`reveal${telegram ? " open" : ""}`}>
            <div>
              <div className="pad">
                {telegram && (
                  <Field
                    id="telegramHandle"
                    label="Telegram username"
                    placeholder="@yourhandle"
                    enterKeyHint="done"
                    autoCapitalize="none"
                    value={data.telegramHandle}
                    error={errors.telegramHandle}
                    onChange={(v) => set("telegramHandle", v)}
                    onBlur={() => blur("telegramHandle")}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="note">
          <IconLock /> You can switch channel at any point — nothing here locks you in.
        </p>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Confirmation                                                                                   */
/* ---------------------------------------------------------------------------------------------- */

type DoneProps = {
  data: WizardData;
  env: Env;
  waMessage: string;
  waHref: string;
  onWhatsappTap: () => void;
  onCopy: (ok: boolean) => void;
};

export function DoneScreen({ data, env, waMessage, waHref, onWhatsappTap, onCopy }: DoneProps) {
  const first = splitName(data.legalName).firstName || "there";
  const isWa = data.contactPref === "whatsapp";
  const waAvailable = hasWhatsapp();
  const handle = normalizeTelegramHandle(data.telegramHandle);
  const [copy, setCopy] = useState<"idle" | "ok" | "manual">("idle");

  const channelDetail =
    data.contactPref === "telegram" && handle
      ? ` on Telegram (${handle})`
      : ` via ${data.contactPref === "whatsapp" ? "WhatsApp" : data.contactPref === "telegram" ? "Telegram" : "email"}`;

  const copyMessage = async () => {
    const ok = await copyText(waMessage);
    setCopy(ok ? "ok" : "manual");
    onCopy(ok);
  };

  const speed = data.availSpeed ? SPEED_SHORT[data.availSpeed] : "your window";
  const tier = data.availSpeed ? TIER_PHRASE[data.availSpeed] : "your chosen rate";
  const appName = env.app ? APP_NAME[env.app] : "";

  return (
    <div className="done">
      <div className="done-mark">
        <IconCheck />
      </div>
      <div className="done-badge">
        <i />
        Application received
      </div>
      <h2 className="h" id="stepTitle" tabIndex={-1}>
        Thanks, {first}.
      </h2>
      <p className="sub">
        {isWa && waAvailable
          ? "One tap to start the conversation. Your message is already written — you just press send."
          : "Your details are with the partnerships team. Here's exactly what happens next."}
      </p>

      {isWa && waAvailable && (
        <div style={{ marginTop: 20 }}>
          <a className="wa-btn" href={waHref} rel="noopener" onClick={onWhatsappTap}>
            <IconWhatsapp /> Start the conversation <IconArrow />
          </a>

          {env.inApp && (
            <>
              <p className="handoff-note">
                <IconInfo />
                <span>
                  {appName === "this app" ? "In this app" : `Inside ${appName}`}, links often can't open other
                  apps. If nothing happens, tap the <b>•••</b> menu and choose <b>Open in browser</b> — or copy
                  your message and send it to <span className="wa-number">{displayWhatsappNumber()}</span>{" "}
                  yourself.
                </span>
              </p>
              <div className="copy-row">
                <button type="button" className="copy-btn" onClick={copyMessage}>
                  <IconCopy /> Copy my message
                </button>
                <p
                  className={`copy-status${copy === "manual" ? " is-manual" : ""}`}
                  role="status"
                  aria-live="polite"
                >
                  {copy === "ok" && "Copied — paste it into WhatsApp."}
                  {copy === "manual" && "Couldn't copy automatically. Press and hold the text below to copy it."}
                </p>
                {copy === "manual" && (
                  <textarea
                    className="copy-manual"
                    readOnly
                    rows={7}
                    value={waMessage}
                    aria-label="Your message"
                    onFocus={(event) => event.currentTarget.select()}
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}

      {!isWa && waAvailable && (
        <div style={{ marginTop: 20 }}>
          <p className="wa-hint" style={{ justifyContent: "center", marginBottom: 9 }}>
            <IconInfo />
            <span>
              Want a faster answer? WhatsApp is usually <b>15–30 min</b>.
            </span>
          </p>
          <a className="wa-btn" href={waHref} rel="noopener" onClick={onWhatsappTap}>
            <IconWhatsapp /> Message us on WhatsApp instead <IconArrow />
          </a>
        </div>
      )}

      <ol className="next-steps">
        <li>
          <span className="ns-n">1</span>
          <span>
            <b>Maya starts your file{channelDetail}.</b> She explains how the partnership works, then checks
            the details you've just given her. Nothing to do yet beyond replying.
          </span>
        </li>
        <li>
          <span className="ns-n">2</span>
          <span>
            <b>She collects your documents, one at a time.</b> License, selfie, three months of statements.
            Send them as <b>files</b>, not photos — chat apps shrink pictures and that's the usual reason an
            upload comes back blurry.
          </span>
        </li>
        <li>
          <span className="ns-n">3</span>
          <span>
            <b>Your LLC is formed in your name.</b> You don't do anything for this. It usually takes a few
            business days, and the company stays yours throughout.
          </span>
        </li>
        <li>
          <span className="ns-n">4</span>
          <span>
            <b>Banking and processing are opened for that LLC.</b> This is when verification links start
            arriving — expect a live selfie, which must be taken there and then rather than picked from your
            camera roll.
          </span>
        </li>
        <li>
          <span className="ns-n">5</span>
          <span>
            <b>You answer each link within {speed}.</b> The links expire, and an expired one pauses your file
            until a new one is sent. This is the only part that depends on you.
          </span>
        </li>
        <li>
          <span className="ns-n">6</span>
          <span>
            <b>Once the account is live, the partnership pays monthly</b> at {tier}, which is what the
            response window you chose qualifies you for. A person confirms the exact terms on your partner
            file.
          </span>
        </li>
      </ol>
    </div>
  );
}
