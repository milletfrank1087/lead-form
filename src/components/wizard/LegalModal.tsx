import { useEffect, useRef, type KeyboardEvent } from "react";
import { IconClose } from "./icons";
import { LEGAL, type LegalKey } from "./legal";

type Props = { doc: LegalKey | null; onClose: () => void };

/**
 * Bottom sheet on phones, centred dialog on larger screens.
 *
 * While closed it stays mounted (so it can fade) but is `visibility: hidden`, which already takes it
 * out of the tab order and away from assistive tech, so no `inert` attribute is needed. That matters
 * because older webviews ignore `inert`.
 */
export function LegalModal({ doc, onClose }: Props) {
  const open = doc !== null;
  // Keep showing the last document while the sheet fades out.
  const last = useRef<LegalKey>("terms");
  if (doc) last.current = doc;
  const content = LEGAL[doc ?? last.current];

  const root = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (body.current) body.current.scrollTop = 0;
    const timer = window.setTimeout(() => closeButton.current?.focus({ preventScroll: true }), 80);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open, doc]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !root.current) return;
    const focusable = root.current.querySelectorAll<HTMLElement>("button, [href], input, select, textarea");
    if (!focusable.length) return;
    const first = focusable[0];
    const lastEl = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      lastEl.focus();
    } else if (!event.shiftKey && document.activeElement === lastEl) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      ref={root}
      className={`modal${open ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="legalTitle"
      aria-hidden={!open}
      onKeyDown={onKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-panel">
        <div className="modal-head">
          <h3 className="modal-title" id="legalTitle">
            {content.title}
          </h3>
          <button ref={closeButton} type="button" className="modal-close" aria-label="Close" onClick={onClose}>
            <IconClose />
          </button>
        </div>
        <div className="modal-body" ref={body}>
          {content.body}
        </div>
        <div className="modal-foot">
          <button
            type="button"
            className="btn btn-primary"
            style={{ height: 46, flex: "0 0 auto", padding: "0 22px" }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
