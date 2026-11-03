/**
 * Telegram usernames: 5-32 characters, letters, digits and underscores, starting with a letter.
 *
 * The same rules run on the server (lib/telegram.js) and in the CRM (leads_sync.py), so a value this
 * form accepts is one the CRM accepts. `npm run check:telegram` runs all of them against one table of
 * cases, so the copies cannot drift apart unnoticed.
 */
const USERNAME = /^[A-Za-z][A-Za-z0-9_]{4,31}$/;
const LINK_PREFIX = /^(?:https?:\/\/)?(?:www\.)?(?:t|telegram)\.me\//i;

/** "@username" for what was typed ("@name", "name" or a pasted t.me link), or "" when it cannot be a username. */
export function normalizeTelegramHandle(raw: unknown): string {
  const text = String(raw ?? "").trim();
  if (!text || text.length > 120) return "";
  const name = text
    .replace(LINK_PREFIX, "")
    .split("?")[0]
    .split("/")[0]
    .trim()
    .replace(/^@+/, "")
    .trim();
  return USERNAME.test(name) ? `@${name}` : "";
}
