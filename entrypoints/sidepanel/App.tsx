import { Check, Copy, Download, ExternalLink, FileText, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { browser } from "wxt/browser";
import { downloadTranscript, formatTranscript, type TranscriptExportFormat } from "../../src/lib/exports";
import type { CaptionSegment, ExtensionRequest, ExtensionResponse, VideoContext } from "../../src/types/transcript";

const EMPTY_CONTEXT: VideoContext = { videoId: null, title: null, tracks: [] };

function formatTime(milliseconds: number): string {
  const total = Math.floor(milliseconds / 1_000);
  const hours = Math.floor(total / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const seconds = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

async function activeYouTubeTabId(): Promise<number | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

async function sendToPage(request: ExtensionRequest): Promise<ExtensionResponse> {
  const tabId = await activeYouTubeTabId();
  if (tabId === null) return { ok: false, error: "Open a YouTube video first." };
  try {
    return await browser.tabs.sendMessage(tabId, request) as ExtensionResponse;
  } catch {
    return { ok: false, error: "Open or refresh a public YouTube video, then try again." };
  }
}

export function App() {
  const [context, setContext] = useState(EMPTY_CONTEXT);
  const [trackId, setTrackId] = useState("");
  const [segments, setSegments] = useState<CaptionSegment[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [message, setMessage] = useState("Reading this YouTube page…");
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState<TranscriptExportFormat | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captionRequest = useRef(0);

  const loadCaptions = useCallback(async (nextTrackId: string) => {
    if (!nextTrackId) return;
    const request = ++captionRequest.current;
    setTrackId(nextTrackId);
    setStatus("loading");
    setMessage("Loading captions…");
    const response = await sendToPage({ type: "GET_CAPTIONS", trackId: nextTrackId });
    if (request !== captionRequest.current) return;
    if (!response.ok || !("segments" in response)) {
      setStatus("error");
      setMessage(response.ok ? "Could not parse this caption track." : response.error);
      return;
    }
    setSegments(response.segments);
    setStatus("ready");
  }, []);

  const applyContext = useCallback((nextContext: VideoContext) => {
    captionRequest.current++;
    setContext(nextContext);
    setSegments([]);
    const firstTrackId = nextContext.tracks[0]?.id ?? "";
    if (!nextContext.videoId) {
      setTrackId("");
      setStatus("empty");
      setMessage("Open a YouTube video to view its transcript.");
      return;
    }
    if (!firstTrackId) {
      setTrackId("");
      setStatus("empty");
      setMessage("This video has no YouTube captions. EZScribe can transcribe its audio instead.");
      return;
    }
    void loadCaptions(firstTrackId);
  }, [loadCaptions]);

  const loadContext = useCallback(async () => {
    setStatus("loading");
    setMessage("Reading this YouTube page…");
    const response = await sendToPage({ type: "GET_VIDEO_CONTEXT" });
    if (!response.ok || !("context" in response)) {
      setStatus("error");
      setMessage(response.ok ? "Could not read this video." : response.error);
      return;
    }
    applyContext(response.context);
  }, [applyContext]);

  useEffect(() => {
    void loadContext();
    const listener = (event: { type?: string; context?: VideoContext }) => {
      if (!event.context) return;
      if (event.type === "VIDEO_CONTEXT_LOADING") {
        captionRequest.current++;
        setContext(event.context);
        setSegments([]);
        setTrackId("");
        setStatus("loading");
        setMessage("Reading this YouTube page…");
        return;
      }
      if (event.type !== "VIDEO_CONTEXT_CHANGED") return;
      applyContext(event.context);
    };
    browser.runtime.onMessage.addListener(listener);
    return () => {
      browser.runtime.onMessage.removeListener(listener);
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, [applyContext, loadContext]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized
      ? segments.filter((segment) => segment.text.toLocaleLowerCase().includes(normalized))
      : segments;
  }, [query, segments]);

  const filename = useMemo(() => {
    const base = context.title?.replace(/[\\/:*?"<>|]+/g, " ").trim() || context.videoId || "youtube-transcript";
    return base.slice(0, 100);
  }, [context.title, context.videoId]);

  const copy = async () => {
    await navigator.clipboard.writeText(formatTranscript(segments, "txt"));
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1_800);
  };

  const download = async (format: TranscriptExportFormat) => {
    setExporting(format);
    try {
      await downloadTranscript(segments, format, filename);
    } finally {
      setExporting(null);
    }
  };
  const hasNoCaptions = Boolean(context.videoId && context.tracks.length === 0);

  return <main className="shell">
    <header className="masthead">
      <img className="brand-logo" src="/icons/icon-48.png" alt="" aria-hidden="true" />
      <div><p className="brand">EZScribe</p><p className="product">YouTube transcript</p></div>
    </header>

    <section className="video-summary" aria-labelledby="video-title">
      <p className="eyebrow">Current video</p>
      <h1 id="video-title">{context.title || "No YouTube video detected"}</h1>
      {context.videoId && <p className="source"><span aria-hidden="true" />YouTube captions · Free</p>}
    </section>

    {context.tracks.length > 0 && <section className="toolbar" aria-label="Transcript controls">
      <label className="language-field">
        <span>Language</span>
        <select value={trackId} onChange={(event) => void loadCaptions(event.target.value)}>
          {context.tracks.map((track) => <option key={track.id} value={track.id}>
            {track.label}{track.autoGenerated ? " · auto-generated" : ""}
          </option>)}
        </select>
      </label>
      <label className="search-field">
        <Search size={17} aria-hidden="true" />
        <span className="sr-only">Search transcript</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transcript" />
      </label>
      <div className="actions">
        <button type="button" className="primary-action" onClick={() => void copy()} disabled={segments.length === 0} aria-live="polite">
          {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}{copied ? "Copied" : "Copy"}
        </button>
        <div className="downloads" aria-label="Download transcript">
          {(["docx", "txt", "srt", "vtt", "pdf"] as const).map((format) => <button
            key={format}
            type="button"
            onClick={() => void download(format)}
            disabled={segments.length === 0 || exporting !== null}
            title={`Download ${format.toUpperCase()}`}
          ><Download size={15} aria-hidden="true" />{exporting === format ? "…" : format.toUpperCase()}</button>)}
        </div>
      </div>
    </section>}

    {status !== "ready" ? <section className="state" role="status">
      <FileText size={28} aria-hidden="true" />
      <p>{message}</p>
      {hasNoCaptions ? <a className="website-cta" href="https://ezscribe.cc/transcribe?mode=youtube" target="_blank" rel="noreferrer">
        Transcribe on EZScribe <ExternalLink size={15} aria-hidden="true" />
      </a> : status !== "loading" && <button type="button" onClick={() => void loadContext()}>Try again</button>}
    </section> : <section className="transcript" aria-label="Transcript">
      <div className="result-count" aria-live="polite">{query ? `${filtered.length} matching segments` : `${segments.length} segments`}</div>
      <ol>
        {filtered.map((segment, index) => <li key={`${segment.startMs}-${index}`}>
          <button
            type="button"
            className="timestamp"
            onClick={() => void sendToPage({ type: "SEEK_TO", seconds: segment.startMs / 1_000 })}
            aria-label={`Jump to ${formatTime(segment.startMs)}`}
          >{formatTime(segment.startMs)}</button>
          <p>{segment.text}</p>
        </li>)}
      </ol>
      {filtered.length === 0 && <p className="no-results">No transcript segments match “{query}”.</p>}
    </section>}
  </main>;
}
