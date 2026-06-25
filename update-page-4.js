const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

// Fix interface JewelryFile
const interfaceRegex = /export interface JewelryFile \{[\s\S]*?\n\}/;
const interfaceReplacement = `export interface JewelryFile {
  id: string;
  baseName: string;
  name: string;
  karat: string;
  mp: string;
  file: File;
  detailFile?: File;
  url: string;
  detailUrl?: string;
  category: string | null;
  claspBbox?: any;
  detecting: boolean;
  status: "queued" | "processing" | "done" | "error";
  resultUrl: string | null;
  resultBlob?: Blob;
  exported?: boolean;
  scale?: number;
  posX?: number;
  posY?: number;
  autoAdjust?: boolean;
  brightness?: number;
  contrast?: number;
  saturate?: number;
  kembarId: string | null;
}`;
code = code.replace(interfaceRegex, interfaceReplacement);

// Fix imports
if (!code.includes('calculateAutoLighting')) {
  code = code.replace(/import \{ loadAndProcessImage \} from "@\/lib\/imageProcessor";/, 'import { loadAndProcessImage, calculateAutoLighting } from "@/lib/imageProcessor";');
}

// Fix lucide-react imports
const lucideRegex = /import \{([\s\S]*?)\} from "lucide-react";/;
const lucideMatch = code.match(lucideRegex);
if (lucideMatch) {
  let iconsStr = lucideMatch[1];
  const requiredIcons = ['Sun', 'Contrast', 'Droplet', 'Play', 'Pause', 'Square'];
  for (const icon of requiredIcons) {
    if (!iconsStr.includes(icon)) {
      iconsStr += `, ${icon}`;
    }
  }
  code = code.replace(lucideRegex, `import {${iconsStr}} from "lucide-react";`);
}

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log("Success fix imports and interface");
