# EZScribe for YouTube

Read, search, copy, and export timestamped caption tracks beside a YouTube video.

**Website:** [EZScribe — AI transcription for audio and video](https://ezscribe.cc/)

The extension reads captions already available on YouTube for free. If a video has no captions, you can continue with [EZScribe's YouTube transcription tool](https://ezscribe.cc/transcribe?mode=youtube).

## Current scope

- Manifest V3 extension built with WXT, React, and TypeScript.
- Chrome Side Panel opened from the extension action.
- YouTube SPA navigation and current-video detection.
- Experimental discovery of caption tracks exposed by the current YouTube player page.
- Caption search, timestamp seeking, and DOCX/TXT/SRT/VTT/PDF export.
- No EZScribe login, paid provider call, analytics, or remote executable code.

Caption discovery currently uses an explicitly isolated experimental adapter around YouTube page data. It is a feasibility spike, not a stable public contract. See `docs/phase-0-findings.md`.

## Run locally

```bash
pnpm install
pnpm dev
```

WXT opens a development Chrome profile with the extension loaded. Open a public YouTube watch page with captions and click the extension action to open the Side Panel.

## Validate

```bash
pnpm typecheck
pnpm test
pnpm build
```

The unpacked Chrome build is written to `.output/chrome-mv3/`.

## Product contract

See [`chrome-extension-product-technical-plan.md`](./chrome-extension-product-technical-plan.md).

## License

Licensed under the [MIT License](./LICENSE)
