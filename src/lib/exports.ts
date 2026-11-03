import type { CaptionSegment } from "../types/transcript";

export type TranscriptExportFormat = "txt" | "srt" | "vtt" | "docx" | "pdf";

function pad(value: number, width = 2): string {
  return String(value).padStart(width, "0");
}

function timestamp(milliseconds: number, separator: "," | "."): string {
  const safe = Math.max(0, Math.round(milliseconds));
  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1_000);
  const millis = safe % 1_000;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${separator}${pad(millis, 3)}`;
}

function endMs(segment: CaptionSegment): number {
  return segment.startMs + Math.max(segment.durationMs, 1_000);
}

export function formatTranscript(segments: CaptionSegment[], format: TranscriptExportFormat): string {
  if (format === "docx" || format === "pdf") {
    throw new Error(`${format.toUpperCase()} is a binary export format.`);
  }
  if (format === "txt") {
    return segments.map((segment) => `[${displayTimestamp(segment.startMs)}] ${segment.text}`).join("\n");
  }

  const cues = segments.map((segment, index) => {
    const separator = format === "srt" ? "," : ".";
    const timing = `${timestamp(segment.startMs, separator)} --> ${timestamp(endMs(segment), separator)}`;
    return format === "srt"
      ? `${index + 1}\n${timing}\n${segment.text}`
      : `${timing}\n${segment.text}`;
  });

  return format === "vtt" ? `WEBVTT\n\n${cues.join("\n\n")}\n` : `${cues.join("\n\n")}\n`;
}

function displayTimestamp(milliseconds: number): string {
  const safe = Math.max(0, Math.floor(milliseconds / 1_000));
  const hours = Math.floor(safe / 3_600);
  const minutes = Math.floor((safe % 3_600) / 60);
  const seconds = safe % 60;
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

function timestampedLines(segments: CaptionSegment[]): string[] {
  return segments.map((segment) => `[${displayTimestamp(segment.startMs)}] ${segment.text}`);
}

function saveBlob(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}

function ownedBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

async function buildDocx(segments: CaptionSegment[]): Promise<Uint8Array> {
  const { strToU8, zipSync } = await import("fflate");
  const escapeXml = (value: string) => value
    .replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  const body = timestampedLines(segments).map((line) =>
    `<w:p><w:pPr><w:spacing w:after="160"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`,
  ).join("");
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return zipSync({
    "[Content_Types].xml": strToU8(xml + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
    "_rels/.rels": strToU8(xml + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
    "word/document.xml": strToU8(xml + `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`),
  });
}

async function buildPdf(segments: CaptionSegment[]): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  const fontSize = 10.5;
  const lineHeight = 16;
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const addPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  };
  const wrapLine = (text: string): string[] => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return [text];
    context.font = `${fontSize}px sans-serif`;
    const tokens = text.includes(" ")
      ? text.split(" ").map((token, index) => index === 0 ? token : ` ${token}`)
      : Array.from(text);
    const lines: string[] = [];
    let current = "";
    for (const token of tokens) {
      const candidate = current + token;
      if (current && context.measureText(candidate).width > contentWidth) {
        lines.push(current.trim());
        current = token.trimStart();
      } else {
        current = candidate;
      }
    }
    if (current.trim()) lines.push(current.trim());
    return lines;
  };
  const drawUnicodeLine = async (text: string) => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(contentWidth * scale);
    canvas.height = Math.ceil(lineHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to render PDF text.");
    context.scale(scale, scale);
    context.font = `${fontSize}px sans-serif`;
    context.textBaseline = "top";
    context.fillStyle = "#202020";
    context.fillText(text, 0, 1, contentWidth);
    const image = await pdf.embedPng(canvas.toDataURL("image/png"));
    page.drawImage(image, { x: margin, y: y - 3, width: contentWidth, height: lineHeight });
  };

  for (const paragraph of timestampedLines(segments)) {
    for (const line of wrapLine(paragraph)) {
      if (y < margin + lineHeight) addPage();
      try {
        font.encodeText(line);
        page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(.12, .12, .12) });
      } catch {
        await drawUnicodeLine(line);
      }
      y -= lineHeight;
    }
    y -= 5;
  }
  return pdf.save();
}

export async function downloadTranscript(
  segments: CaptionSegment[],
  format: TranscriptExportFormat,
  filename: string,
): Promise<void> {
  if (format === "docx") {
    saveBlob(new Blob([ownedBuffer(await buildDocx(segments))], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), `${filename}.docx`);
    return;
  }
  if (format === "pdf") {
    saveBlob(new Blob([ownedBuffer(await buildPdf(segments))], { type: "application/pdf" }), `${filename}.pdf`);
    return;
  }
  const content = formatTranscript(segments, format);
  saveBlob(new Blob([content], { type: format === "vtt" ? "text/vtt" : "text/plain;charset=utf-8" }), `${filename}.${format}`);
}
