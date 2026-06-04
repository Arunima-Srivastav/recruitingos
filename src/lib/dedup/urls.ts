const URL_PATTERN = /https?:\/\/[^\s<>"')]+/gi;

export function normalizeApplyUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    const dropParams = new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "source",
    ]);
    for (const key of [...parsed.searchParams.keys()]) {
      if (dropParams.has(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    }
    let path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${path}${parsed.search}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

export function extractApplyUrls(text: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const match of text.matchAll(URL_PATTERN)) {
    const normalized = normalizeApplyUrl(match[0]);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      urls.push(normalized);
    }
  }

  return urls;
}

export function urlsOverlap(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const setB = new Set(b);
  return a.some((url) => setB.has(url));
}
