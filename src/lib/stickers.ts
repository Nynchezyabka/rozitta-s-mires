import QRCode from "qrcode";
import { jsPDF } from "jspdf";

export type Sticker = { number: number; groupName: string; color: string; icon: string; url?: string | undefined };

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

/** Draws one sticker on a canvas (handles Cyrillic, which jsPDF's built-in fonts lack). Sizes scale with the label. */
export async function drawSticker(s: Sticker, wMm: number, hMm: number) {
  await fontsReady();
  const w = Math.round(wMm * PX_PER_MM), h = Math.round(hMm * PX_PER_MM);
  const small = hMm < 40 || wMm < 55;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d")!;
  x.fillStyle = "#ffffff";
  x.fillRect(0, 0, w, h);
  const band = h * 0.26;
  x.fillStyle = s.color;
  x.fillRect(0, 0, w, band);
  x.fillStyle = "#1f1a16";
  x.textBaseline = "middle";
  const pad = Math.min(w, h) * 0.06;
  x.font = `700 ${band * 0.55}px ${FONT}, sans-serif`;
  let title = `${s.icon} ${s.groupName}`;
  while (title.length > 3 && x.measureText(title).width > w - pad * 2) title = title.slice(0, -2) + "…";
  x.fillText(title, pad, band / 2);
  const footer = small ? 0 : h * 0.1;
  const body = h - band - footer;
  const qrSize = s.url ? Math.min(body - pad, w * 0.5) : 0;
  if (s.url) {
    // margin: 2 modules of white quiet zone around the code
    const qr = await QRCode.toDataURL(s.url, { margin: 2, width: Math.round(qrSize), errorCorrectionLevel: "M" });
    const img = new Image();
    await new Promise((r) => ((img.onload = r), (img.src = qr)));
    x.drawImage(img, w - qrSize - pad / 2, band + (body - qrSize) / 2, qrSize, qrSize);
  }
  const numW = w - qrSize - pad * 2;
  let size = body * 0.8;
  x.font = `700 ${size}px ${FONT}, sans-serif`;
  while (size > 10 && x.measureText(String(s.number)).width > numW) {
    size *= 0.9;
    x.font = `700 ${size}px ${FONT}, sans-serif`;
  }
  x.fillText(String(s.number), pad, band + body / 2);
  if (!small) {
    x.fillStyle = "#6b2fa0";
    x.font = `italic 400 ${footer * 0.5}px ${FONT}, sans-serif`;
    x.fillText("🗝 Заперто на волшебный ключ. Охраняется Розиттой", pad, h - footer / 2, w - pad * 2);
  }
  x.strokeStyle = "#cccccc";
  x.lineWidth = 2;
  x.strokeRect(1, 1, w - 2, h - 2);
  return c.toDataURL("image/png");
}

export async function buildPdf(list: Sticker[], f: Format) {
  if (f.id === "a4") {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const cols = 2, rows = 4, mx = 10, my = 12, gap = 6;
    const sw = (210 - mx * 2 - gap) / cols;
    const sh = (297 - my * 2 - gap * (rows - 1)) / rows;
    for (let i = 0; i < list.length; i++) {
      const pos = i % (cols * rows);
      if (i > 0 && pos === 0) pdf.addPage();
      const img = await drawSticker(list[i]!, sw, sh);
      pdf.addImage(img, "PNG", mx + (pos % cols) * (sw + gap), my + Math.floor(pos / cols) * (sh + gap), sw, sh);
    }
    return pdf;
  }
  const orient = f.w >= f.h ? "landscape" : "portrait";
  const pdf = new jsPDF({ unit: "mm", format: [f.w, f.h], orientation: orient });
  for (let i = 0; i < list.length; i++) {
    if (i > 0) pdf.addPage([f.w, f.h], orient);
    pdf.addImage(await drawSticker(list[i]!, f.w, f.h), "PNG", 0, 0, f.w, f.h);
  }
  return pdf;
}

export async function stickersPdf(list: Sticker[], f: Format) {
  (await buildPdf(list, f)).save("naklejki-sunduki.pdf");
}

/** Opens the PDF in a new tab and asks the browser to print it. */
export async function printStickers(list: Sticker[], f: Format) {
  const win = window.open("", "_blank");
  const pdf = await buildPdf(list, f);
  pdf.autoPrint();
  const url = URL.createObjectURL(pdf.output("blob"));
  if (win) win.location.href = url;
  else window.location.href = url;
}

export const isPreviewHost = (h: string) => /^(localhost|127\.|0\.0\.0\.0)|id-preview--|lovableproject\.com|\.local$/.test(h);
