// Layout & chunking untuk cover collage
import type { EtalaseDetail } from "./coverParser";

export type CoverKind = "grid6" | "grid4" | "single";

export interface CoverGroup {
  kind: CoverKind;
  fileIds: string[]; // JewelryFile.id
}

/** Deteksi jenis cover dari nama folder kategori */
export function detectCoverKind(folderName: string): CoverKind {
  const n = folderName.toUpperCase();
  if (n.includes("GELANG RANTAI") || n.includes("KALUNG RANTAI")) return "single";
  if (n.includes("GELANG BANGLE") || n.includes("BANGLE")) return "grid4";
  return "grid6"; // default: cincin, anting, liontin
}

const MAX_PER_COVER: Record<Exclude<CoverKind, "single">, number> = {
  grid6: 6,
  grid4: 4,
};

/**
 * Kelompokkan file (sudah selesai diproses) menjadi beberapa cover.
 * Untuk "single": semua masuk 1 cover (1 foto grup berisi semua barang).
 */
export function chunkIntoCovers(
  files: { id: string }[],
  kind: CoverKind
): CoverGroup[] {
  if (files.length === 0) return [];
  if (kind === "single") return [{ kind, fileIds: files.map((f) => f.id) }];
  const max = MAX_PER_COVER[kind];
  const groups: CoverGroup[] = [];
  for (let i = 0; i < files.length; i += max) {
    groups.push({ kind, fileIds: files.slice(i, i + max).map((f) => f.id) });
  }
  return groups;
}

/**
 * Posisi & ukuran sel tiap item pada canvas template (1200x1200).
 * Area konten: y 120..980 (di atas footer), x 80..1120.
 * Return array of {cx, cy, w, h} (center + max box) per item.
 */
export interface CellRect {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export function getGridCells(count: number): CellRect[] {
  const W = 1200;
  const top = 150;
  const bottom = 990;
  const left = 90;
  const right = 1110;
  const areaH = bottom - top;
  const areaW = right - left;

  const cells: CellRect[] = [];
  const make = (cols: number, rows: number) => {
    const cw = areaW / cols; // tuned 0.86->0.82 for uniform spacing
    const ch = areaH / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({
          cx: left + cw * c + cw / 2,
          cy: top + ch * r + ch / 2,
          w: cw * 0.82,
          h: ch * 0.82,
        });
      }
    }
  };

  if (count <= 1) make(1, 1);
  else if (count === 2) make(2, 1);
  else if (count === 3) make(3, 1);
  else if (count === 4) make(2, 2);
  else if (count === 5) make(3, 2);
  else make(3, 2); // 6

  return cells;
}
