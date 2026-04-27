import mongoose from "mongoose";
import Meeting from "../models/Meeting.js";
import Artifact from "../models/Artifact.js";

function envNum(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function envBool(name, defaultTrue) {
  const v = (process.env[name] || "").toLowerCase();
  if (v === "false" || v === "0" || v === "no") return false;
  if (v === "true" || v === "1" || v === "yes") return true;
  return defaultTrue;
}

function normalizeAgendaText(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSetFromAgenda(s) {
  const norm = normalizeAgendaText(s);
  if (!norm) return new Set();
  const tokens = norm.split(" ").filter((t) => t.length > 1);
  return new Set(tokens);
}

function jaccardSimilarity(aSet, bSet) {
  if (!aSet.size || !bSet.size) return 0;
  let inter = 0;
  for (const t of aSet) {
    if (bSet.has(t)) inter += 1;
  }
  const union = aSet.size + bSet.size - inter;
  return union ? inter / union : 0;
}

function isUsableSummaryText(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  const low = t.toLowerCase();
  if (low.startsWith("summary generation failed")) return false;
  if (low === "no minutes generated." || low === "no minutes generated") return false;
  if (low === "transcript too short to summarize.") return false;
  return true;
}

function clipText(s, max) {
  const t = String(s || "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/**
 * Returns a markdown/plain block to inject into the minutes prompt, or "" if disabled / no data.
 */
export async function buildRelatedMeetingsContextBlock({
  currentMeetingId,
  projectId,
  currentAgenda,
}) {
  if (!envBool("RELATED_MEETINGS_CONTEXT_ENABLED", true)) return "";

  const agendaTrim = String(currentAgenda || "").trim();
  if (!agendaTrim || !projectId || !currentMeetingId) return "";

  const threshold = envNum("RELATED_AGENDA_SIMILARITY_THRESHOLD", 0.12);
  const topK = Math.max(1, Math.floor(envNum("RELATED_MEETINGS_TOP_K", 4)));
  const pool = Math.max(5, Math.floor(envNum("RELATED_MEETINGS_CANDIDATE_POOL", 40)));
  const perSummary = Math.max(200, Math.floor(envNum("RELATED_SUMMARY_MAX_CHARS_PER_MEETING", 1200)));
  const maxTotal = Math.max(1000, Math.floor(envNum("RELATED_CONTEXT_MAX_TOTAL_CHARS", 8000)));

  const currentIdStr = String(currentMeetingId);
  const currentTokens = tokenSetFromAgenda(agendaTrim);
  if (!currentTokens.size) return "";

  const excludeId = mongoose.isValidObjectId(currentIdStr)
    ? new mongoose.Types.ObjectId(currentIdStr)
    : null;

  const query = { projectId: String(projectId) };
  if (excludeId) query._id = { $ne: excludeId };

  const candidates = await Meeting.find(query)
    .select("_id title agenda createdAt status")
    .sort({ createdAt: -1 })
    .limit(pool)
    .lean();

  const scored = [];
  for (const m of candidates) {
    if (String(m._id) === currentIdStr) continue;
    const otherAgenda = String(m.agenda || "").trim();
    if (!otherAgenda) continue;
    const score = jaccardSimilarity(currentTokens, tokenSetFromAgenda(otherAgenda));
    if (score < threshold) continue;
    scored.push({
      meetingId: String(m._id),
      title: m.title || "Meeting",
      agenda: otherAgenda,
      score,
      createdAt: m.createdAt,
    });
  }

  scored.sort((a, b) => b.score - a.score || (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
  const picked = scored.slice(0, topK);
  if (!picked.length) return "";

  const ids = picked.map((p) => p.meetingId);
  const artifacts = await Artifact.find({
    meetingId: { $in: ids },
    projectId: String(projectId),
    transcriptionStatus: "COMPLETED",
  })
    .select("meetingId summary")
    .lean();

  const summaryByMeeting = new Map(artifacts.map((a) => [String(a.meetingId), a.summary]));

  const blocks = [];
  let used = 0;
  for (const row of picked) {
    const sum = summaryByMeeting.get(row.meetingId);
    if (!isUsableSummaryText(sum)) continue;
    const excerpt = clipText(sum, perSummary);
    const header = `### Related prior meeting (${row.title})\n- **Agenda (host):** ${clipText(row.agenda, 400)}\n- **Prior minutes excerpt (context only):**\n${excerpt}\n`;
    if (used + header.length > maxTotal) break;
    blocks.push(header);
    used += header.length;
  }

  if (!blocks.length) return "";

  return [
    "## Context: prior related meetings (same project)",
    "The following excerpts are from **earlier meetings in this project** whose host agendas were **similar** to the current meeting agenda.",
    "Use them only for **continuity and accuracy** (terminology, recurring themes, unresolved threads).",
    "**Do not** copy decisions or action items from them unless the **current transcript** clearly reflects the same topic being discussed again.",
    "",
    ...blocks,
    "---",
    "",
  ].join("\n");
}
