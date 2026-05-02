import type { Document } from "mongoose";
import { parseActionProposalsFromSummary } from "./parseActionProposals.js";

type ArtifactDoc = Document & {
  summary?: string;
  actionProposals?: unknown[];
  markModified: (path: string) => void;
};

/** Replace proposals whenever minutes change (pending approvals reset). */
export function syncArtifactActionProposalsFromSummary(artifact: ArtifactDoc): void {
  const summary = artifact.summary?.trim() ?? "";
  if (
    !summary ||
    summary.startsWith("Summary generation failed") ||
    summary === "Transcript too short to summarize." ||
    summary === "System Error: API Key missing."
  ) {
    artifact.actionProposals = [];
    artifact.markModified("actionProposals");
    return;
  }

  artifact.actionProposals = parseActionProposalsFromSummary(
    summary
  ) as unknown[];
  artifact.markModified("actionProposals");
}
