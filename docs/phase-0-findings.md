# Phase 0 findings

Date: 2026-11-03

## Implemented prototype

- WXT/React/TypeScript Manifest V3 scaffold.
- Chrome Side Panel opened from the toolbar action.
- Isolated YouTube content script for extension messaging.
- Main-world bridge that reads only the current player's caption-track metadata from `ytd-watch-flexy.playerData`, with a legacy `window.ytInitialPlayerResponse` fallback, and sends a sanitized payload to the isolated script.
- Main-world caption fetch so YouTube requests execute in the page's own origin rather than the extension's isolated context.
- A non-WEB InnerTube player fallback for WEB caption URLs that return an empty body because they require a proof-of-origin token.
- YouTube `yt-navigate-finish` handling.
- JSON3 caption parsing.
- Transcript search, timestamp seek, copy, TXT, SRT, and VTT.

## Known risk

The prototype reads `ytd-watch-flexy.playerData` and retains `window.ytInitialPlayerResponse` as a legacy fallback. Both are internal YouTube page values rather than a stable public extension API. This is intentionally contained in `entrypoints/youtube-main.content.ts` so the acquisition mechanism can be replaced without coupling it to the UI or export logic.

Current WEB player caption URLs can return HTTP 200 with an empty body when a proof-of-origin token is required. The prototype detects that exact empty response and retries through YouTube's unofficial InnerTube player endpoint using an Android client context. This path has no third-party provider fee but is not an official public YouTube transcript API and may change or be rate-limited.

Before public release, validate:

- Current YouTube terms and Chrome Web Store policy implications.
- Manual and auto-generated caption tracks.
- Multiple languages and translated tracks.
- Videos where the page value is missing or stale after SPA navigation.
- Shorts, live streams, restricted, private, members-only, and regional cases.
- Whether signed caption URLs can be fetched reliably from the isolated content script.
- Failure rate across a representative video sample.

Do not market this implementation as unlimited or guaranteed until those checks pass.

## Deliberate omissions

- No account pairing.
- No EZScribe backend endpoint.
- No cloud transcription or provider spend.
- No analytics.
- No public transcript storage.
- No local YouTube-media transcription.

These remain gated by the product and technical handoff document.
