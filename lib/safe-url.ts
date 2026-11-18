const SAFE_PROTOCOL = new Set(["http:", "https:", "mailto:"]);

export function safeHref(value: string): string {
  const href = value.trim();
  if (!href || /[\u0000-\u001F\u007F]/.test(href)) return "";
  if (href.startsWith("#")) return href;
  if (href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/\\")) return href;
  try {
    const url = new URL(href);
    if (!SAFE_PROTOCOL.has(url.protocol)) return "";
    return href;
  } catch {
    return "";
  }
}

export function jsonLdScript(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
