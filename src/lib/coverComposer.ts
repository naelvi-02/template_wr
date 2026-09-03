// Composer: menggambar cover collage di atas template 1200x1200
import { getGridCells } from "./coverLayout";
import type { EtalaseDetail } from "./coverParser";
import { normalizeFileKey } from "./coverParser";

export interface CoverItem {
  id: string;
  baseName: string;
  karat: string;
  mp: string;
  canvas: HTMLCanvasElement; // hasil cutout transparan (dari processCache)
  bbox: { x: number; y: number; width: number; height: number };
}

export interface CoverRenderOptions {
  templateImg: HTMLImageElement;
  items: CoverItem[];
  detail: EtalaseDetail | null;
  folderName: string;
  karatOverride?: string;
  nampanOverride?: string;
}

/**
 * Render 1 cover ke Blob JPEG.
 * - kind "grid6"/"grid4": tiap item digambar ke sel grid (fit, center)
 * - kind "single": 1 foto (canvas bbox) digambar besar di tengah
 * Kadar & nampan dari txt (atau fallback dari item pertama / override).
 */
export async function renderCoverBlob(opts: CoverRenderOptions): Promise<Blob | null> {
  const { templateImg, items, detail, folderName } = opts;
  const W = templateImg.width;
  const H = templateImg.height;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background putih + template
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(templateImg, 0, 0);

  const cells = getGridCells(items.length);

  items.forEach((item, i) => {
    const cell = cells[Math.min(i, cells.length - 1)];
    const bw = item.bbox?.width || item.canvas.width;
    const bh = item.bbox?.height || item.canvas.height;
    const scale = Math.min(cell.w / bw, cell.h / bh);
    const dw = bw * scale;
    const dh = bh * scale;
    const dx = cell.cx - dw / 2;
    const dy = cell.cy - dh / 2;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.1)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    ctx.drawImage(item.canvas, dx, dy, dw, dh);
    ctx.restore();
  });

  // Kadar & nampan: dari txt, fallback dari item pertama
  let karat = opts.karatOverride || detail?.karat || items[0]?.karat || "";
  let nampan = opts.nampanOverride || detail?.nampan || items[0]?.mp || "";

  // Teks sama seperti template varian: MP kiri bawah, karat di lingkaran
  ctx.font = "600 45px Lora, serif";
  ctx.fillStyle = "#ec1e24";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(nampan, 90, 1155);

  const karatCx = 740;
  const karatCy = 1092;
  ctx.font = "600 72px Lora, serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(karat, karatCx, karatCy);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
  });
}

/** Cari data txt untuk sebuah filename (fallback null) */
export function findTxtItem(detail: EtalaseDetail | null, baseName: string) {
  if (!detail) return null;
  return detail.items.get(normalizeFileKey(baseName)) || null;
}
