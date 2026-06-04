import { companiesMatch, rolesMatch } from "./normalize";
import { extractApplyUrls, urlsOverlap } from "./urls";
import type { Message, Opportunity } from "../types";

export type DuplicateMatchReason =
  | "company_role"
  | "apply_url"
  | "external_message_id";

export interface DuplicateMatch {
  opportunityId: string;
  reason: DuplicateMatchReason;
  detail: string;
}

export interface OpportunityMatchInput {
  id: string;
  company: string | null;
  role_title: string | null;
  applyUrls?: string[];
}

function companyRoleMatch(
  a: OpportunityMatchInput,
  b: OpportunityMatchInput
): boolean {
  return (
    companiesMatch(a.company, b.company) && rolesMatch(a.role_title, b.role_title)
  );
}

export function matchOpportunities(
  target: OpportunityMatchInput,
  candidate: OpportunityMatchInput
): DuplicateMatch | null {
  if (target.id === candidate.id) return null;

  if (companyRoleMatch(target, candidate)) {
    return {
      opportunityId: candidate.id,
      reason: "company_role",
      detail: `${candidate.company ?? "Unknown"} · ${candidate.role_title ?? "Role"}`,
    };
  }

  const targetUrls = target.applyUrls ?? [];
  const candidateUrls = candidate.applyUrls ?? [];
  if (urlsOverlap(targetUrls, candidateUrls)) {
    return {
      opportunityId: candidate.id,
      reason: "apply_url",
      detail: "Same job posting URL",
    };
  }

  return null;
}

export function buildOpportunityUrlMap(
  messages: Message[]
): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const message of messages) {
    if (!message.opportunity_id) continue;
    const urls = extractApplyUrls(message.body);
    if (urls.length === 0) continue;

    const existing = map.get(message.opportunity_id) ?? [];
    const merged = [...existing];
    for (const url of urls) {
      if (!merged.includes(url)) merged.push(url);
    }
    map.set(message.opportunity_id, merged);
  }

  return map;
}

export function findDuplicatesForOpportunity(
  target: Opportunity,
  opportunities: Opportunity[],
  urlMap: Map<string, string[]>
): DuplicateMatch[] {
  const targetInput: OpportunityMatchInput = {
    id: target.id,
    company: target.company,
    role_title: target.role_title,
    applyUrls: urlMap.get(target.id) ?? [],
  };

  const matches: DuplicateMatch[] = [];

  for (const candidate of opportunities) {
    const match = matchOpportunities(targetInput, {
      id: candidate.id,
      company: candidate.company,
      role_title: candidate.role_title,
      applyUrls: urlMap.get(candidate.id) ?? [],
    });
    if (match) matches.push(match);
  }

  return matches;
}

export function findDuplicateByExtracted(
  company: string | null,
  roleTitle: string | null,
  text: string,
  opportunities: Opportunity[],
  urlMap: Map<string, string[]>
): DuplicateMatch | null {
  const targetUrls = extractApplyUrls(text);
  const pseudo: OpportunityMatchInput = {
    id: "__new__",
    company,
    role_title: roleTitle,
    applyUrls: targetUrls,
  };

  for (const opp of opportunities) {
    const match = matchOpportunities(pseudo, {
      id: opp.id,
      company: opp.company,
      role_title: opp.role_title,
      applyUrls: urlMap.get(opp.id) ?? [],
    });
    if (match) return match;
  }

  return null;
}
