import QRCode from "qrcode";
import frogSeal from "@/assets/rozitta.webp";
import { jsPDF } from "jspdf";

export type Sticker = { number: number; groupName: string; color: string; icon: string; url?: string | undefined; items?: string[]; photo?: string | null };
export type StickerContent = "number" | "list" | "photo";
export const MAX_CUSTOM_MM = 200;

/** Short QR address: /b/<id> (redirects to the chest). Fewer characters = bigger modules on tiny labels. */
export const boxQrUrl = (origin: string, id: string) => `${origin}/b/${id}`;

async function loadImg(src: string) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = src; });
  return img;
}

/** Sticker formats: "a4" = sheet of 8, others = one label per page of that size (mm). */
export type Format = { id: "a4" | "50x30" | "40x30" | "custom"; w: number; h: number };
export const FORMATS: { id: Format["id"]; label: string; w: number; h: number }[] = [
  { id: "a4", label: "Лист A4 (8 штук)", w: 92, h: 62 },
  { id: "50x30", label: "Этикетка 50×30 мм", w: 50, h: 30 },
  { id: "40x30", label: "Этикетка 40×30 мм", w: 40, h: 30 },
  { id: "custom", label: "Своя (ширина × высота, мм)", w: 60, h: 40 },
];

const PX_PER_MM = 12; // ~300 dpi
const FONT = "Onest";

async function fontsReady() {
  try {
    await Promise.all([document.fonts.load(`700 40px ${FONT}`), document.fonts.load(`italic 400 20px ${FONT}`), document.fonts.load(`400 20px ${FONT}`)]);
  } catch {
    /* fall back to system font */
  }
}

export type StickerStyle = "brand" | "simple" | "emerald" | "cocoa";

/** Interior presets for colour printers: tinted paper, dark ink, frog seal in the QR centre. */
export const INTERIOR: Record<"emerald" | "cocoa", { paper: string; ink: string; band: string; bandInk: string }> = {
  emerald: { paper: "#f6efdc", ink: "#16402f", band: "#1f5a42", bandInk: "#f6efdc" },
  cocoa: { paper: "#efe2cc", ink: "#3b2416", band: "#5a3721", bandInk: "#f3e7d3" },
};
export const isInterior = (s: StickerStyle): s is "emerald" | "cocoa" => s === "emerald" || s === "cocoa";

/** Dark or light text, whichever reads better on the band colour. */
function inkOn(hex: string) {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.55 ? "#1f1a16" : "#ffffff";
}

/** Fits text into maxW: shrinks the font down to minSize, then truncates with "…". */
function fitText(x: CanvasRenderingContext2D, text: string, maxW: number, size: number, minSize: number, weight = 700) {
  let s = size;
  const set = () => (x.font = `${weight} ${s}px ${FONT}, sans-serif`);
  set();
  while (s > minSize && x.measureText(text).width > maxW) { s *= 0.92; set(); }
  let t = text;
  while (t.length > 2 && x.measureText(t).width > maxW) t = t.slice(0, -2) + "…";
  return t;
}

/** Draws one sticker on a canvas (handles Cyrillic, which jsPDF's built-in fonts lack). Sizes scale with the label. */
export async function drawSticker(s: Sticker, wMm: number, hMm: number, style: StickerStyle = "brand", content: StickerContent = "number") {
  await fontsReady();
  const w = Math.round(wMm * PX_PER_MM), h = Math.round(hMm * PX_PER_MM);
  const small = hMm < 40 || wMm < 55;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d")!;
  const pad = Math.round(Math.min(w, h) * 0.06);
  const tone = isInterior(style) ? INTERIOR[style] : null;
  x.fillStyle = tone ? tone.paper : "#ffffff";
  x.fillRect(0, 0, w, h);
  x.textBaseline = "middle";
  x.textAlign = "left";
  const band = Math.round(h * (small ? 0.3 : 0.26));
  // Small labels: QR takes the full height at the right, everything else sits to its left.
  const qrFull = small && !!s.url;
  const qrSize0 = qrFull ? h - Math.round(pad / 3) : 0;
  const leftW = w - (qrFull ? qrSize0 + pad / 2 : 0);
  if (style === "brand") {
    x.fillStyle = s.color;
    x.fillRect(0, 0, leftW, band);
    x.fillStyle = inkOn(s.color);
  } else if (tone) {
    x.fillStyle = tone.band;
    x.fillRect(0, 0, leftW, band);
    x.fillStyle = tone.bandInk;
  } else {
    x.fillStyle = "#000000";
    x.fillRect(pad, band - 3, leftW - pad * 2, 3);
  }
  if (style === "simple") x.fillStyle = "#000000";
  const title = fitText(x, `${s.icon} ${s.groupName}`, leftW - pad * 2, band * 0.55, band * 0.32);
  x.fillText(title, pad, band / 2);
  const footer = style === "brand" && !small ? Math.round(h * 0.1) : 0;
  const top = band + pad / 2, bottom = h - footer - pad / 2;
  const body = bottom - top;
  const qrSize = qrFull ? qrSize0 : s.url ? Math.min(body, w * 0.48) : 0;
  if (s.url) {
    // margin: 2 modules of quiet zone; level L on tiny labels = fewer, bigger modules
    const qr = await QRCode.toDataURL(s.url, { margin: 2, width: Math.round(qrSize * 2), errorCorrectionLevel: tone ? "H" : small ? "L" : "M", color: { dark: tone ? tone.ink : "#000000", light: tone ? tone.paper : "#ffffff" } });
    const img = await loadImg(qr);
    x.imageSmoothingEnabled = false;
    if (qrFull) x.drawImage(img, w - qrSize - pad / 6, (h - qrSize) / 2, qrSize, qrSize);
    else x.drawImage(img, w - qrSize - pad / 2, top + (body - qrSize) / 2, qrSize, qrSize);
    x.imageSmoothingEnabled = true;
    if (tone) {
      // Level H tolerates ~30% loss; the seal covers ~5% of the code.
      const qx = qrFull ? w - qrSize - pad / 6 : w - qrSize - pad / 2;
      const qy = qrFull ? (h - qrSize) / 2 : top + (body - qrSize) / 2;
      const seal = qrSize * 0.22, cx = qx + qrSize / 2, cy = qy + qrSize / 2;
      x.fillStyle = tone.paper;
      x.beginPath(); x.arc(cx, cy, seal * 0.62, 0, Math.PI * 2); x.fill();
      x.strokeStyle = tone.ink; x.lineWidth = Math.max(1, seal * 0.06); x.stroke();
      const frog = await loadImg(frogSeal).catch(() => null);
      if (frog) { x.imageSmoothingEnabled = false; x.drawImage(frog, cx - seal / 2, cy - seal / 2, seal, seal); x.imageSmoothingEnabled = true; }
    }
  }
  const numW = (qrFull ? leftW : w - qrSize) - pad * 2;
  const label = `№${s.number}`;
  const extra = content === "list" ? (s.items ?? []).filter(Boolean) : [];
  const photo = content === "photo" && s.photo ? await loadImg(s.photo).catch(() => null) : null;
  const numH = extra.length || photo ? body * 0.32 : body;
  let size = numH * 0.85;
  x.font = `800 ${size}px ${FONT}, sans-serif`;
  while (size > 10 && x.measureText(label).width > numW) { size *= 0.92; x.font = `800 ${size}px ${FONT}, sans-serif`; }
  x.fillStyle = tone ? tone.ink : style === "brand" ? "#1f1a16" : "#000000";
  x.fillText(label, pad, top + numH / 2);
  const restTop = top + numH, restH = body - numH;
  if (extra.length) {
    const lineH = Math.max(restH / Math.min(extra.length, 6), restH / 6);
    const n = Math.min(extra.length, Math.floor(restH / lineH));
    for (let i = 0; i < n; i++) {
      const more = i === n - 1 && extra.length > n ? ` +${extra.length - n}` : "";
      const t = fitText(x, `• ${extra[i]}${more}`, numW, lineH * 0.78, lineH * 0.6, 500);
      x.fillText(t, pad, restTop + lineH * (i + 0.5));
    }
  } else if (photo) {
    const bw = numW, bh = restH - pad / 4;
    const r = Math.max(bw / photo.width, bh / photo.height);
    const sw = bw / r, sh = bh / r;
    x.drawImage(photo, (photo.width - sw) / 2, (photo.height - sh) / 2, sw, sh, pad, restTop, bw, bh);
  }
  if (footer) {
    x.fillStyle = "#6b2fa0";
    const f = fitText(x, "🗝 Заперто на волшебный ключ. Охраняется Розиттой", w - pad * 2, footer * 0.5, footer * 0.35, 400);
    x.fillText(f, pad, h - footer / 2);
  }
  x.strokeStyle = tone ? tone.band : style === "brand" ? "#cccccc" : "#000000";
  x.lineWidth = style === "simple" ? 4 : 2;
  x.strokeRect(1, 1, w - 2, h - 2);
  return c.toDataURL("image/png");
}

export async function buildPdf(list: Sticker[], f: Format, style: StickerStyle = "brand", content: StickerContent = "number") {
  if (f.id === "a4") {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const cols = 2, rows = 4, mx = 10, my = 12, gap = 6;
    const sw = (210 - mx * 2 - gap) / cols;
    const sh = (297 - my * 2 - gap * (rows - 1)) / rows;
    for (let i = 0; i < list.length; i++) {
      const pos = i % (cols * rows);
      if (i > 0 && pos === 0) pdf.addPage();
      const img = await drawSticker(list[i]!, sw, sh, style, content);
      pdf.addImage(img, "PNG", mx + (pos % cols) * (sw + gap), my + Math.floor(pos / cols) * (sh + gap), sw, sh);
    }
    return pdf;
  }
  const orient = f.w >= f.h ? "landscape" : "portrait";
  const pdf = new jsPDF({ unit: "mm", format: [f.w, f.h], orientation: orient });
  for (let i = 0; i < list.length; i++) {
    if (i > 0) pdf.addPage([f.w, f.h], orient);
    pdf.addImage(await drawSticker(list[i]!, f.w, f.h, style, content), "PNG", 0, 0, f.w, f.h);
  }
  return pdf;
}

export async function stickersPdf(list: Sticker[], f: Format, style: StickerStyle = "brand", content: StickerContent = "number") {
  (await buildPdf(list, f, style, content)).save("naklejki-sunduki.pdf");
}

/** One PNG per sticker, at the label's own size (for label-printer apps). */
export async function stickersPng(list: Sticker[], f: Format, style: StickerStyle = "brand", content: StickerContent = "number") {
  const [w, h] = f.id === "a4" ? [92, 62] : [f.w, f.h];
  const save = (href: string, name: string) => { const a = document.createElement("a"); a.href = href; a.download = name; a.click(); };
  if (list.length === 1) return save(await drawSticker(list[0]!, w, h, style, content), `sunduk-${list[0]!.number}.png`);
  // Several labels: one ZIP, so iPhone Safari asks once instead of blocking a burst of downloads.
  const { zipSync } = await import("fflate");
  const files: Record<string, Uint8Array> = {};
  for (const s of list) {
    const url = await drawSticker(s, w, h, style, content);
    files[`sunduk-${s.number}.png`] = Uint8Array.from(atob(url.split(",")[1] ?? ""), (c) => c.charCodeAt(0));
  }
  const blob = new Blob([zipSync(files, { level: 0 }) as BlobPart], { type: "application/zip" });
  const href = URL.createObjectURL(blob);
  save(href, "naklejki-sunduki.zip");
  setTimeout(() => URL.revokeObjectURL(href), 10000);
}

/** Opens the PDF in a new tab and asks the browser to print it. */
export async function printStickers(list: Sticker[], f: Format, style: StickerStyle = "brand", content: StickerContent = "number") {
  const win = window.open("", "_blank");
  const pdf = await buildPdf(list, f, style, content);
  pdf.autoPrint();
  const url = URL.createObjectURL(pdf.output("blob"));
  if (win) win.location.href = url;
  else window.location.href = url;
}

export const isPreviewHost = (h: string) => /^(localhost|127\.|0\.0\.0\.0)|id-preview--|lovableproject\.com|\.local$/.test(h);
