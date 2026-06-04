const COMPANY_SUFFIXES =
  /\b(inc|incorporated|llc|l\.l\.c|corp|corporation|co|company|ltd|limited)\b\.?/gi;

const ROLE_NOISE =
  /\b(senior|sr|junior|jr|staff|lead|principal|i{1,3}|ii{1,2}|iii|iv|intern|internship|new grad|new-grad|entry[- ]?level)\b/gi;

export function normalizeCompany(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  return value
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/&/g, " and ")
    .replace(COMPANY_SUFFIXES, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeRole(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  return value
    .toLowerCase()
    .replace(ROLE_NOISE, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value: string): Set<string> {
  return new Set(value.split(" ").filter((t) => t.length > 1));
}

function jaccardSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function companiesMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const na = normalizeCompany(a);
  const nb = normalizeCompany(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return jaccardSimilarity(na, nb) >= 0.8;
}

export function rolesMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const na = normalizeRole(a);
  const nb = normalizeRole(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return jaccardSimilarity(na, nb) >= 0.72;
}
