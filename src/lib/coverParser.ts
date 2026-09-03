// Parser untuk file .txt detail etalase
// Format:
//   GELANG BELAH TENGAH
//   =======================
//   Kadar: 8KP   Nampan: VT18
//   Jumlah Varian: 2   Scanned: 33262728
//
//   33262728  |  2.61g  |  Size 5.3  |  GELANG BELAH TENGAH 33262728 8KP VT18
//   33314581  |  1.45g  |  Size 5.6  |  GELANG BELAH TENGAH 33314581 8KP VT18
//
//   Total: 2 varian

export interface TxtItem {
  code: string;
  berat: string;   // "2.61g"
  size: string;    // "5.3"
  fileName: string; // nama file tanpa ekstensi, sesuai teks di txt
}

export interface EtalaseDetail {
  etalaseName: string;
  karat: string;   // "8KP"
  nampan: string;  // "VT18"
  items: Map<string, TxtItem>; // key = normalized filename
}

/** Normalisasi nama file jadi key unik (uppercase, hanya huruf & angka) */
export function normalizeFileKey(name: string): string {
  return name
    .replace(/\.[^/.]+$/, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function parseDetailsTxt(content: string): EtalaseDetail {
  const detail: EtalaseDetail = {
    etalaseName: "",
    karat: "",
    nampan: "",
    items: new Map(),
  };

  const lines = content.split(/\r?\n/).map((l) => l.trim());

  for (const line of lines) {
    if (!line) continue;
    if (/^=+$/.test(line)) continue; // separator
    if (/^(Jumlah|Total|Scanned)/i.test(line)) continue;

    // Header kadar & nampan
    const header = line.match(/^Kadar:\s*([^\s|]+)\s+Nampan:\s*([^\s|]+)/i);
    if (header) {
      detail.karat = header[1].trim();
      detail.nampan = header[2].trim();
      continue;
    }

    // Baris data: code | berat | size | filename
    if (line.includes("|")) {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length >= 4) {
        const code = parts[0];
        const berat = parts[1];
        const sizeClean = parts[2].replace(/^Size\s*/i, "").trim();
        const fileName = parts[3];
        detail.items.set(normalizeFileKey(fileName), { code, berat, size: sizeClean, fileName });
        continue;
      }
    }

    // Baris pertama selain pola di atas = nama etalase
    if (!detail.etalaseName) {
      detail.etalaseName = line;
    }
  }

  return detail;
}
