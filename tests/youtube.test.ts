import { describe, expect, it } from "vitest";
import { getVideoId, parseJson3Captions, withJson3Format } from "../src/lib/youtube";

describe("YouTube helpers", () => {
  it("extracts watch video IDs only", () => {
    expect(getVideoId("https://www.youtube.com/watch?v=abcdefghijk")).toBe("abcdefghijk");
    expect(getVideoId("https://www.youtube.com/shorts/abcdefghijk")).toBeNull();
    expect(getVideoId("https://example.com/watch?v=abcdefghijk")).toBeNull();
  });

  it("requests JSON3 captions without dropping signed parameters", () => {
    const result = new URL(withJson3Format("https://www.youtube.com/api/timedtext?v=abc&sig=123"));
    expect(result.searchParams.get("sig")).toBe("123");
    expect(result.searchParams.get("fmt")).toBe("json3");
  });

  it("parses readable JSON3 events", () => {
    expect(parseJson3Captions({ events: [
      { tStartMs: 500, dDurationMs: 1_000, segs: [{ utf8: "Hello" }, { utf8: " world" }] },
      { tStartMs: 1_500, segs: [{ utf8: "\n" }] },
    ] })).toEqual([{ startMs: 500, durationMs: 1_000, text: "Hello world" }]);
  });
});
