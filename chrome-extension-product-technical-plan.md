# EZScribe Chrome Extension — Product and Technical Handoff

Status: planning contract for implementation in a new repository

Date: 2026-11-03

Target extension repository: `ezscribe-chrome-extension`

Existing web/backend repository: `ezscribe`

## 1. Decision summary

Build the Chrome extension in a separate repository. Keep authentication, entitlements, usage accounting, transcription tasks, provider calls, storage, billing, and the full transcript editor in the existing EZScribe repository.

The extension is not a free wrapper around paid transcription. Its product model is:

1. Read and work with captions that already exist for the current YouTube video at no transcription cost.
2. When usable captions are unavailable, offer EZScribe Pro cloud transcription through the user's existing EZScribe account and minutes.
3. Send deeper editing, permanent history, DOCX/PDF export, and other full workflows to the EZScribe web app.

The extension must provide useful standalone functionality. It must not exist only to open the EZScribe website or obtain a Chrome Web Store backlink.

## 2. Product objective

Create a repeatable distribution surface inside the user's YouTube workflow:

```text
Chrome Web Store / recommendations / search
                     ↓
        User opens a YouTube video
                     ↓
 Existing captions → read, search, copy, export for free
                     ↓
 No captions / better quality / other language / long-form workflow
                     ↓
      Sign in to the existing EZScribe account
                     ↓
       Pro transcription consumes existing minutes
                     ↓
 Full editor, exports, task history, and subscription on the website
```

Primary business goals:

- Create a persistent distribution channel and repeated brand exposure.
- Acquire users at zero or near-zero provider cost when existing captions are available.
- Convert high-intent, no-caption and higher-quality cases into EZScribe cloud transcription.
- Generate legitimate recommendations, directory listings, and editorial backlinks around a useful product.

The Chrome Web Store's domain authority is not part of the financial model. Any store link is a secondary benefit; installs, repeated usage, branded search, referral traffic, and Pro conversion are the primary outcomes.

## 3. Target user and core job

Initial target users:

- Students and researchers reading educational videos.
- Creators repurposing spoken content.
- Podcast and long-form video listeners.
- Language learners.
- Users who need TXT, SRT, or VTT without leaving YouTube.

Core job:

> While watching a YouTube video, let me immediately read, search, copy, and export its transcript. If the video has no usable captions, give me a clear path to transcribe it with EZScribe.

## 4. MVP scope

### 4.1 Included

- Detect the current YouTube watch-page video ID and navigation changes.
- Open a Chrome Side Panel from an explicit user action.
- Discover available caption tracks for the current public video.
- Let the user choose among available caption languages.
- Display captions with timestamps.
- Highlight or follow the current playback position.
- Click a caption segment to seek the video.
- Search within the transcript.
- Copy with or without timestamps.
- Export existing captions as TXT, SRT, and VTT.
- Clearly label the source as `YouTube captions` or `EZScribe Pro`.
- Detect the no-caption/error state.
- Pair with an EZScribe account.
- Show available Pro minutes and estimated usage before submission.
- Create and monitor an EZScribe cloud task after explicit confirmation.
- Reopen an existing task instead of creating and charging for a duplicate.
- Open the completed task in the EZScribe editor/history.

### 4.2 Explicitly excluded from MVP

- AI summary, chat, question answering, rewriting, and translation generation.
- A separate extension subscription or extension-only free allowance.
- Anonymous provider-backed transcription.
- Cross-user transcript caching.
- Public transcript pages.
- Notion, Google Docs, n8n, Zapier, or other integrations.
- TikTok and non-YouTube sites.
- Firefox and Edge store releases.
- In-extension checkout.
- Remote executable code.
- Broad browsing-history access.
- Injected advertising or affiliate links.

### 4.3 Local transcription is not an MVP dependency

EZScribe already supports desktop local English transcription in compatible browsers. However, local transcription of a YouTube URL also requires a lawful and technically reliable way to obtain usable media/audio in the browser. Do not assume that a content script can safely capture or download YouTube media.

For MVP:

- Existing caption handling is free.
- No-caption videos use the authenticated Pro workflow.
- A later local-transcription handoff may be added only after media access, browser behavior, YouTube terms, and user experience are validated.

## 5. Free and paid boundary

The rule is:

> Operations on captions that already exist are free. Operations that use EZScribe cloud compute, provider calls, storage, or paid models consume the user's existing account entitlement.

| Capability | Anonymous | Signed-in free account | Subscriber |
| --- | --- | --- | --- |
| Read existing captions | Yes | Yes | Yes |
| Search and timestamp navigation | Yes | Yes | Yes |
| Copy and TXT/SRT/VTT export | Yes | Yes | Yes |
| Pro cloud transcription | No | Existing available trial/minutes only | Existing monthly minutes |
| Task history | No | Existing account rules | Yes, under existing account rules |
| Full editor and DOCX/PDF | Website handoff | Website handoff | Website handoff |

The extension must not issue a second trial. Installation, reinstalling, switching Chrome profiles, or clearing extension storage must not reset any entitlement.

YouTube and TikTok cloud imports continue to use the existing immutable `1.5×` usage multiplier. The multiplier is calculated and enforced by the server, never by the extension.

## 6. Repository ownership

### 6.1 New repository: `ezscribe-chrome-extension`

Owns:

- Manifest V3 configuration and extension build.
- Background service worker.
- YouTube content integration.
- Side Panel application.
- Caption presentation and browser-side export.
- Extension session/token storage.
- Calls to the scoped EZScribe extension API.
- Store icons, screenshots, listing copy, and release ZIP generation.
- Extension-focused unit, integration, and browser tests.

Suggested structure:

```text
ezscribe-chrome-extension/
├── src/
│   ├── entrypoints/
│   │   ├── background.ts
│   │   ├── youtube.content.ts
│   │   └── sidepanel/
│   │       ├── App.tsx
│   │       └── index.html
│   ├── components/
│   ├── lib/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── captions.ts
│   │   ├── exports.ts
│   │   └── youtube.ts
│   └── types/
├── public/icons/
├── tests/
├── wxt.config.ts
└── package.json
```

Initial stack:

- WXT
- React
- TypeScript
- Manifest V3
- Chrome Side Panel API

### 6.2 Existing repository: `ezscribe`

Owns:

- Firebase identity and account ownership.
- One-time extension pairing.
- Scoped extension tokens and revocation.
- Server-side YouTube validation/resolution.
- Plan, quota, duration, concurrency, and balance checks.
- AssemblyAI/provider calls and credentials.
- Idempotent task creation and polling.
- Immutable usage accounting.
- R2/D1 task persistence and retention behavior.
- Full editor, task history, and exports.
- Extension landing, support, and privacy-policy pages.
- Subscription and checkout flows on the website.

Do not convert the current repository into a monorepo solely to share a few TypeScript types. Begin with a documented, versioned HTTP contract. Consider generated types only after the API stabilizes.

## 7. Proposed authentication flow

Do not put provider credentials, Firebase administration credentials, or long-lived general-purpose account tokens in the extension.

Proposed pairing flow:

1. The user selects `Sign in to EZScribe` in the Side Panel.
2. The extension opens an HTTPS page on EZScribe with a random state and extension callback identifier.
3. The user signs in through the existing Firebase flow.
4. EZScribe creates a short-lived, single-use pairing code bound to that user and state.
5. The extension exchanges the pairing code for a scoped extension token.
6. The pairing code is invalidated immediately.
7. The extension token can read the owner's account/quota and create/read only the owner's permitted tasks.
8. The user can revoke the extension session from the extension and, later, from account settings.

Token requirements:

- Short, explicit scope.
- Server-side expiration and revocation.
- Rotation or re-pairing strategy.
- Never placed in query strings or analytics.
- Stored only in extension storage; treat extension storage as unencrypted client storage.
- Never grants administrative, billing-write, or cross-user access.

## 8. Proposed server contract

Route names are provisional and must be checked against the existing App Router/API conventions before implementation.

```text
POST /api/extension/pair/start
POST /api/extension/pair/exchange
POST /api/extension/session/revoke
GET  /api/extension/account
POST /api/extension/youtube/inspect
POST /api/extension/transcriptions
GET  /api/extension/transcriptions/:taskId
```

### Account response

```ts
type ExtensionAccount = {
  user: {
    id: string;
    displayName: string | null;
  };
  plan: string;
  quota: {
    remainingMinutes: number;
    resetsAt: string | null;
  };
};
```

### Inspect response

This endpoint validates the URL/video identity and determines the permitted next action. It must not create a paid transcription task.

```ts
type YouTubeInspection = {
  videoId: string;
  title: string | null;
  durationSeconds: number | null;
  captionTracks: Array<{
    languageCode: string;
    label: string;
    autoGenerated: boolean;
  }>;
  existingTask: {
    taskId: string;
    status: "queued" | "processing" | "completed" | "error";
  } | null;
  pro?: {
    allowed: boolean;
    estimatedUsageMinutes: number | null;
    reason: "available" | "signin_required" | "quota" | "duration" | "unsupported";
  };
};
```

### Task creation request

```ts
type CreateExtensionTranscription = {
  videoId: string;
  youtubeUrl: string;
  languageCode?: string;
  idempotencyKey: string;
  confirmedEstimatedUsageMinutes: number;
};
```

The server is authoritative. It must re-resolve the video, duration, source platform, entitlement, multiplier, and expected charge. Client estimates never authorize work.

### Task creation response

```ts
type ExtensionTranscriptionTask = {
  taskId: string;
  status: "queued" | "processing" | "completed";
  estimatedUsageMinutes: number;
  remainingMinutes: number;
  reused: boolean;
};
```

## 9. Cost, abuse, and accounting requirements

Unauthenticated users must never invoke a paid transcription provider.

Before provider submission, the server must enforce:

- Authenticated user identity.
- Current plan and available quota.
- Server-classified `youtube` source.
- Valid public supported YouTube URL/video ID.
- Maximum video duration and file/provider limits.
- Per-user daily and rolling limits.
- Per-user concurrency limits.
- Global daily provider budget.
- Global circuit breaker and emergency kill switch.
- Idempotency for concurrent, repeated, and retried requests.
- Existing-task lookup for the same user and source where appropriate.

Required accounting behavior:

- Persist the immutable source platform and multiplier.
- YouTube usage uses the existing `1500` multiplier representation.
- Charge rounded usage through the existing idempotent completion path.
- Polling, refresh, extension restart, and website handoff must not add charges.
- Interrupted tasks remain recoverable through task history.
- A failed inspection or rejected task consumes no provider budget.
- Budget exhaustion blocks new provider work while leaving existing captions, account access, history, and upgrade messaging functional.

Do not implement cross-user transcript sharing in MVP. Reusing a completed task owned by the same user is allowed if it complies with current storage and task rules.

## 10. Caption acquisition spike

Caption acquisition is the highest-risk unknown and must be validated before building the complete UI.

The spike must answer:

- Can the extension reliably discover caption tracks on current YouTube watch pages without broad permissions?
- Can it fetch caption data from an allowed context without brittle interception of private endpoints?
- What happens for auto-generated captions, manually uploaded captions, translated tracks, live streams, Shorts, age-restricted videos, private videos, members-only videos, regional restrictions, and signed-out users?
- Does the implementation comply with applicable YouTube terms and Chrome Web Store policy?
- Does it survive YouTube SPA navigation and player updates?
- Is a server-side caption provider required, and if so, what is its per-request cost and failure rate?

Do not advertise unlimited free transcript extraction until this spike establishes a technically and operationally sustainable source.

Possible outcomes:

1. Safe browser-side caption access: use it for the free layer.
2. Low-cost server/provider caption access: define separate rate limits and budget; do not call it zero-cost.
3. No reliable compliant access: narrow the extension to caption UI where available through supported mechanisms and use the authenticated Pro path otherwise.

## 11. Extension permissions and privacy

Request only permissions used by the released version. A provisional set is:

```json
{
  "permissions": ["sidePanel", "storage", "activeTab"],
  "host_permissions": [
    "https://www.youtube.com/*",
    "https://ezscribe.cc/*"
  ]
}
```

This is not final. Remove `activeTab`, host permissions, or any other permission that the chosen implementation does not require. Do not request `<all_urls>`, browsing history, cookies, or tabs access as a convenience.

The public privacy policy and Chrome Web Store disclosure must accurately cover:

- Current video URL/ID and title access.
- Caption data handled locally or sent to EZScribe.
- Explicit conditions that submit a video for Pro processing.
- Account identity and token handling.
- Usage/quota and task events.
- Analytics, if any.
- Seven-day retention of cloud originals and permanent task-history transcript results under existing EZScribe policy.
- Logout, revocation, and deletion/contact routes.
- No sale of browsing or transcript data.
- No collection of unrelated browsing history.

## 12. Chrome Web Store release plan

### Publisher account

- Use a company-controlled Google account, not a disposable personal account.
- Suggested address: `chrome@ezscribe.cc` or another durable company mailbox.
- Register as a Chrome Web Store developer and pay the one-time registration fee.
- Verify the contact email and official EZScribe domain.
- Use `EZScribe` as the publisher identity where available.
- Keep recovery methods and ownership documented because the developer account email cannot simply be changed later.

### Required listing/review material

- Name and concise single-purpose description.
- 128×128 icon and required store images/screenshots.
- Official website and support URL.
- Extension-specific privacy policy.
- Accurate permission justifications.
- Accurate data-use declarations.
- Review instructions for caption and no-caption cases.
- A safe review account if authenticated Pro behavior must be tested.
- No keyword stuffing, incentivized reviews, or incentivized installs.

### Release sequence

1. Load unpacked locally.
2. Run automated and manual browser tests.
3. Upload as private/trusted-testers distribution.
4. Test multiple accounts, operating systems, Chrome versions, video types, and failure cases.
5. Submit for review with deferred publishing.
6. Resolve review findings without expanding permissions.
7. Publish manually after the corresponding web APIs and privacy pages are deployed.

Do not add in-extension checkout to MVP. Subscription purchase and management remain on the EZScribe website.

## 13. Analytics and success criteria

Collect the minimum product events needed to understand the funnel. Do not collect full transcript text for analytics.

Suggested events:

- `extension_panel_opened`
- `extension_video_detected`
- `extension_caption_tracks_found`
- `extension_caption_loaded`
- `extension_caption_unavailable`
- `extension_transcript_searched`
- `extension_transcript_copied`
- `extension_transcript_exported` with format only
- `extension_signin_started`
- `extension_pairing_completed`
- `extension_pro_estimate_viewed`
- `extension_pro_task_confirmed`
- `extension_pro_task_completed`
- `extension_opened_in_web_editor`

Do not include caption text, search text, auth tokens, or complete YouTube URLs in analytics payloads. A validated video ID may be operationally necessary for task APIs but should not automatically become analytics data.

Initial product metrics:

- Store-page view → install rate.
- Weekly active installs and four-week retention.
- Panel-open success rate on supported YouTube pages.
- Percentage of videos with usable caption tracks.
- Caption load success rate.
- Copy/export rate.
- No-caption rate.
- Pairing completion rate.
- Pro confirmation and completion rate.
- Provider cost per activated user and per converted user.
- Website handoff and subscription conversion.
- Uninstall, error, and negative-review themes.

Do not use backlink count as the primary success metric.

## 14. Validation matrix

### YouTube behavior

- Standard public video with manual captions.
- Standard public video with auto-generated captions.
- Multiple caption languages.
- Video with no captions.
- Long video.
- Short.
- Live and completed live stream.
- Playlist navigation.
- YouTube SPA navigation without page reload.
- Signed-in and signed-out YouTube sessions.
- Private, deleted, age-restricted, members-only, and region-restricted failures.

### Account and cost behavior

- Anonymous user never invokes paid providers.
- Signed-in trial user uses the existing account allowance only.
- Subscriber uses the existing monthly quota.
- Insufficient quota is blocked before provider submission.
- Concurrent duplicate clicks create one provider task.
- Refresh/restart/polling does not create or charge again.
- Existing task is reopened when appropriate.
- Provider failure does not create duplicate completion charges.
- Global budget breaker prevents new tasks.
- Token expiration and revocation fail safely.

### Extension quality

- Side Panel opens only on supported pages.
- YouTube remains usable when the extension fails.
- Current playback synchronization is accurate.
- TXT/SRT/VTT output is valid and Unicode-safe.
- No remote executable code is loaded.
- No sensitive values appear in logs or analytics.
- Permissions match actual use.

## 15. Implementation phases and gates

### Phase 0 — Feasibility spike

Deliverables:

- Caption acquisition proof of concept.
- Side Panel proof of concept.
- YouTube SPA navigation handling.
- Written policy/terms risk notes.
- Measured success/failure cases across the validation matrix.

Gate: do not proceed to the full MVP until caption acquisition is sufficiently reliable or a costed fallback is approved.

### Phase 1 — Standalone free caption utility

Deliverables:

- Side Panel transcript reader.
- Language selection.
- Search, copy, seek, and TXT/SRT/VTT export.
- Minimal permissions.
- Local error states.

Gate: the extension must provide meaningful value without account creation or website handoff.

### Phase 2 — EZScribe account and Pro handoff

Deliverables:

- Pairing flow and scoped token.
- Account/quota display.
- Server-authoritative estimate and explicit confirmation.
- Idempotent task creation/status.
- Web editor/history handoff.
- Cost and abuse breakers.

Gate: acceptance tests must prove that anonymous, duplicate, refresh, retry, and reinstall paths cannot create unaccounted provider spend.

### Phase 3 — Private store testing

Deliverables:

- Privacy policy and support page.
- Store listing assets.
- Reviewer instructions/account.
- Trusted-tester release.
- Error and funnel instrumentation.

Gate: resolve functional, privacy, and permission issues before public submission.

### Phase 4 — Public release and distribution

Deliverables:

- Public Chrome Web Store release.
- EZScribe extension landing page.
- Documentation and support flow.
- Outreach to relevant tool roundups, educators, creators, and extension directories.
- Review-response and release process.

Gate: prioritize retained usage and Pro conversion over raw installs or backlink counts.

## 16. Definition of MVP success

MVP is complete only when:

- It reads and presents existing captions on supported YouTube videos.
- Search, seek, copy, TXT, SRT, and VTT work reliably.
- It remains independently useful without an EZScribe login.
- No-caption users can pair an existing EZScribe account.
- The server shows and revalidates estimated usage before submission.
- Cloud tasks reuse existing EZScribe quota, accounting, history, and retention rules.
- Anonymous and duplicate paths cannot spend provider balance.
- Required privacy, support, and store material exists.
- Private/trusted-tester validation passes before public submission.

## 17. Open decisions for the new repository

Resolve these during Phase 0 rather than assuming answers:

1. Exact compliant caption acquisition mechanism.
2. Whether a server-side caption provider is required and its cost ceiling.
3. Minimum supported Chrome version for the Side Panel implementation.
4. Exact extension-token lifetime and refresh/re-pair behavior.
5. Whether completed Pro transcripts are previewed fully in the Side Panel or only opened in the website.
6. The canonical public name: `EZScribe for YouTube` versus `YouTube Transcript by EZScribe`.
7. Which analytics are necessary and whether Firebase Analytics is appropriate in the extension context.
8. Support mailbox, publisher Google account, and verified official domain ownership.

## 18. Non-goals and guardrails

- Do not build the extension solely for a high-DR backlink.
- Do not expose supplier-funded transcription anonymously.
- Do not place secrets or general-purpose user credentials in the package.
- Do not ask for broad permissions to simplify development.
- Do not claim unlimited free transcription when only existing-caption extraction is free.
- Do not treat local build success as proof of store approval, deployed APIs, browser compatibility, or real provider accounting.
- Do not expand into summaries, chat, translation, or multiple sites before the core transcript workflow has retained users.
