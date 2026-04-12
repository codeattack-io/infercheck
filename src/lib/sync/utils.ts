/**
 * src/lib/sync/utils.ts
 *
 * Shared utility functions for the sync pipeline.
 */

export function normaliseModality(raw: string | undefined): string {
  if (!raw) return "text";
  if (raw.includes("image") || raw.includes("audio")) {
    if (raw.includes("image") && raw.includes("audio")) return "multimodal";
    if (raw.includes("image")) return "multimodal";
    return "audio";
  }
  if (raw.includes("embed")) return "embedding";
  return "text";
}
