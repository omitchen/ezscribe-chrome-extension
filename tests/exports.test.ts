import { describe, expect, it } from "vitest";
import { formatTranscript } from "../src/lib/exports";

const segments = [
  { startMs: 1_250, durationMs: 2_000, text: "Hello world." },
  { startMs: 3_500, durationMs: 1_500, text: "Second caption." },
];

describe("formatTranscript", () => {
  it("formats plain text", () => {
    expect(formatTranscript(segments, "txt")).toBe("[00:01] Hello world.\n[00:03] Second caption.");
  });

  it("formats SRT cues", () => {
    expect(formatTranscript(segments, "srt")).toContain("1\n00:00:01,250 --> 00:00:03,250\nHello world.");
  });

  it("formats WebVTT cues", () => {
    expect(formatTranscript(segments, "vtt")).toMatch(/^WEBVTT\n\n00:00:01\.250 --> 00:00:03\.250/);
  });
});
