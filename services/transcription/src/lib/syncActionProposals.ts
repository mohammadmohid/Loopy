import type { Document } from "mongoose";
import { parseActionProposalsFromSummary } from "./parseActionProposals.js";

type ArtifactDoc = Document & {
  summary?: string;
  actionProposals?: unknown[];
  markModified: (path: string) => void;
};

/**
 * Rebuild action proposals from the **Action items** section of AI-generated minutes.
 * Call this when a **new** summary is produced (transcription pipeline or trigger summary).
 * Do **not** call this for host manual edits to minutes — those are independent of action items.
 */
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
