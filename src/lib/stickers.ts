import QRCode from "qrcode";
import { jsPDF } from "jspdf";

export type Sticker = { number: number; groupName: string; color: string; icon: string; url?: string | undefined };

/** Draws one sticker on a canvas (handles Cyrillic, which jsPDF's built-in fonts lack). */
async function drawSticker(s: Sticker, w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d")!;
  x.fillStyle = "#ffffff";
  x.fillRect(0, 0, w, h);
  x.fillStyle = s.color;
  x.fillRect(0, 0, w, h * 0.28);
  x.fillStyle = "#1f1a16";
  x.font = `bold ${h * 0.15}px Unbounded, Manrope, sans-serif`;
  x.textBaseline = "middle";
  x.fillText(`${s.icon} ${s.groupName}`.slice(0, 26), w * 0.05, h * 0.14);
  x.font = `bold ${h * 0.5}px Unbounded, Manrope, sans-serif`;
  x.fillText(String(s.number), w * 0.05, h * 0.65);
  if (s.url) {
    const qr = await QRCode.toDataURL(s.url, { margin: 0, width: Math.round(h * 0.6) });
    const img = new Image();
    await new Promise((r) => ((img.onload = r), (img.src = qr)));
    x.drawImage(img, w - h * 0.66, h * 0.34, h * 0.6, h * 0.6);
  }
  x.strokeStyle = "#cccccc";
  x.lineWidth = 2;
  x.strokeRect(1, 1, w - 2, h - 2);
  return c.toDataURL("image/png");
}

export async function stickersPdf(list: Sticker[]) {
  await document.fonts?.ready;
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const cols = 2, rows = 4, mx = 10, my = 12, gap = 6;
  const sw = (210 - mx * 2 - gap) / cols;
  const sh = (297 - my * 2 - gap * (rows - 1)) / rows;
  for (let i = 0; i < list.length; i++) {
    const pos = i % (cols * rows);
    if (i > 0 && pos === 0) pdf.addPage();
    const img = await drawSticker(list[i]!, Math.round(sw * 10), Math.round(sh * 10));
    pdf.addImage(img, "PNG", mx + (pos % cols) * (sw + gap), my + Math.floor(pos / cols) * (sh + gap), sw, sh);
  }
  pdf.save("naklejki-korobki.pdf");
}
