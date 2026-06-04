import {
  getAllMessagesForUser,
  getOpportunities,
} from "@/lib/db";
import {
  appendMessageToOpportunity,
  saveOpportunityFromMessage,
  type SaveMessageInput,
} from "@/lib/intake/saveMessage";
import { buildOpportunityUrlMap, findDuplicateByExtracted } from "./match";

export async function saveOrLinkOpportunityFromMessage(
  input: SaveMessageInput
): Promise<{
  opportunity_id: string;
  linked?: boolean;
  duplicate_reason?: string;
}> {

  if (input.externalMessageId) {
    const { getMessageByExternalId } = await import("@/lib/db");
    const existing = await getMessageByExternalId(input.externalMessageId);
    if (existing?.opportunity_id) {
      return {
        opportunity_id: existing.opportunity_id,
        linked: true,
        duplicate_reason: "external_message_id",
      };
    }
  }

  const [opportunities, messages] = await Promise.all([
    getOpportunities(),
    getAllMessagesForUser(),
  ]);
  const urlMap = buildOpportunityUrlMap(messages);
  const duplicate = findDuplicateByExtracted(
    input.extracted.company,
    input.extracted.role_title,
    input.text,
    opportunities,
    urlMap
  );

  if (duplicate) {
    const linked = await appendMessageToOpportunity(
      duplicate.opportunityId,
      input
    );
    return {
      ...linked,
      duplicate_reason: duplicate.reason,
    };
  }

  return saveOpportunityFromMessage(input);
}
