import { browser } from "wxt/browser";
import { getVideoId } from "../src/lib/youtube";
import type {
  ExtensionRequest,
  ExtensionResponse,
  CaptionTrack,
  PageBridgePayload,
  VideoContext,
} from "../src/types/transcript";

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  runAt: "document_idle",
  main() {
    let current: VideoContext = {
      videoId: getVideoId(location.href),
      title: document.title.replace(/\s+-\s+YouTube$/, ""),
      tracks: [],
    };
    let pageTracks = new Map<string, CaptionTrack>();
    let contextWaiters: Array<(context: VideoContext) => void> = [];
    const captionWaiters = new Map<string, (response: ExtensionResponse) => void>();

    const requestTracks = () => {
      window.postMessage({ source: "ezscribe-extension", type: "REQUEST_CAPTION_TRACKS" }, location.origin);
    };

    window.addEventListener("message", (event: MessageEvent<PageBridgePayload>) => {
      if (event.source !== window || event.origin !== location.origin) return;
      if (event.data?.source !== "ezscribe-page-bridge") return;

      if (event.data.type === "CAPTION_RESULT") {
        const resolve = captionWaiters.get(event.data.requestId);
        if (!resolve) return;
        captionWaiters.delete(event.data.requestId);
        resolve(event.data.segments
          ? { ok: true, segments: event.data.segments }
          : { ok: false, error: event.data.error ?? "Could not load captions for this video." });
        return;
      }

      if (event.data.type !== "CAPTION_TRACKS") return;
      if (event.data.videoId !== getVideoId(location.href)) return;

      pageTracks = new Map(event.data.tracks.map((track) => [track.id, track]));
      current = {
        videoId: event.data.videoId,
        title: event.data.title,
        tracks: event.data.tracks,
      };
      contextWaiters.splice(0).forEach((resolve) => resolve(current));
      void browser.runtime.sendMessage({ type: "VIDEO_CONTEXT_CHANGED", context: current }).catch(() => undefined);
    });

    browser.runtime.onMessage.addListener((message: ExtensionRequest) => {
      if (message.type === "GET_VIDEO_CONTEXT") {
        if (current.tracks.length > 0) {
          return Promise.resolve<ExtensionResponse>({ ok: true, context: current });
        }
        requestTracks();
        return new Promise<ExtensionResponse>((resolve) => {
          let settled = false;
          const finish = (context: VideoContext) => {
            if (settled) return;
            settled = true;
            resolve({ ok: true, context });
          };
          contextWaiters.push(finish);
          window.setTimeout(() => {
            contextWaiters = contextWaiters.filter((waiter) => waiter !== finish);
            finish(current);
          }, 1_000);
        });
      }

      if (message.type === "SEEK_TO") {
        const video = document.querySelector<HTMLVideoElement>("video");
        if (!video) return Promise.resolve<ExtensionResponse>({ ok: false, error: "YouTube player was not found." });
        video.currentTime = Math.max(0, message.seconds);
        void video.play().catch(() => undefined);
        return Promise.resolve<ExtensionResponse>({ ok: true });
      }

      if (message.type === "GET_CAPTIONS") {
        const track = pageTracks.get(message.trackId);
        if (!track) return Promise.resolve<ExtensionResponse>({ ok: false, error: "Caption track is no longer available." });

        return new Promise<ExtensionResponse>((resolve) => {
          const requestId = crypto.randomUUID();
          captionWaiters.set(requestId, resolve);
          window.postMessage({
            source: "ezscribe-extension",
            type: "REQUEST_CAPTIONS",
            requestId,
            trackId: message.trackId,
          }, location.origin);
          window.setTimeout(() => {
            if (!captionWaiters.delete(requestId)) return;
            resolve({ ok: false, error: "Caption request timed out." });
          }, 10_000);
        });
      }

      return undefined;
    });

    window.addEventListener("yt-navigate-finish", () => {
      current = {
        videoId: getVideoId(location.href),
        title: document.title.replace(/\s+-\s+YouTube$/, ""),
        tracks: [],
      };
      pageTracks.clear();
      void browser.runtime.sendMessage({ type: "VIDEO_CONTEXT_LOADING", context: current }).catch(() => undefined);
      requestTracks();
    });

    requestTracks();
  },
});
