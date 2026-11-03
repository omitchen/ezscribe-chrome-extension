import type { CaptionSegment } from "../types/transcript";

type Json3Segment = { utf8?: string };
type Json3Event = {
  tStartMs?: number;
  dDurationMs?: number;
  segs?: Json3Segment[];
};

type Json3Caption = { events?: Json3Event[] };

export function getVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "www.youtube.com" && parsed.hostname !== "youtube.com") return null;
    if (parsed.pathname !== "/watch") return null;
    const id = parsed.searchParams.get("v");
    return id && /^[\w-]{6,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function withJson3Format(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("fmt", "json3");
  return url.toString();
}

export function parseJson3Captions(payload: unknown): CaptionSegment[] {
  const caption = payload as Json3Caption;
  if (!Array.isArray(caption.events)) return [];

  return caption.events.flatMap((event) => {
    if (!Array.isArray(event.segs) || typeof event.tStartMs !== "number") return [];
    const text = event.segs.map((segment) => segment.utf8 ?? "").join("").replace(/\n/g, " ").trim();
    if (!text) return [];

    return [{
      startMs: Math.max(0, event.tStartMs),
      durationMs: Math.max(0, event.dDurationMs ?? 0),
      text,
    }];
  });
}
