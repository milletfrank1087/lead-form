/**
 * Timezone helpers. Nothing here asks for a permission or touches the network: the zone comes from
 * the browser's own Intl data, which works the same inside Facebook / Instagram / TikTok webviews.
 */

export function detectZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && typeof zone === "string") return zone;
  } catch {
    // Very old webviews: fall through to manual selection.
  }
  return "";
}

/** "America/New_York" -> "New York". */
export function zoneLabel(zone: string): string {
  if (!zone) return "Not set";
  const [region, ...rest] = zone.split("/");
  const city = rest.join("/").replace(/_/g, " ");
  if (!city) return region.replace(/_/g, " ");
  // "America/Argentina/Buenos_Aires" -> "Buenos Aires"
  const last = city.split("/").pop();
  return last || city;
}

export function zoneRegion(zone: string): string {
  if (!zone || !zone.includes("/")) return "";
  return zone.split("/")[0].replace(/_/g, " ");
}

/** "GMT-5", or "" if the engine cannot format it. Falls back to the short name ("EST") on older engines. */
export function zoneOffset(zone: string): string {
  if (!zone) return "";
  const read = (style: string): string => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: style as Intl.DateTimeFormatOptions["timeZoneName"],
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  };
  try {
    return read("shortOffset");
  } catch {
    try {
      return read("short");
    } catch {
      return "";
    }
  }
}

/** "09:00" -> "9 AM". */
export function fmtHour(value: string): string {
  const h = Number(value.split(":")[0]);
  if (Number.isNaN(h)) return value;
  const ap = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${ap}`;
}
