const fs = require('fs');

let page = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

// We will extract Slider, StatusBadge, SettingsPage into a separate file

const settingsStart = page.indexOf('function SettingsPage() {');
const settingsEnd = page.indexOf('function Dashboard() {');

const subComponentsStart = page.indexOf('function Slider(');
const subComponentsEnd = settingsStart;

const typesStart = page.indexOf('type FileStatus =');
const typesEnd = page.indexOf('// ─── Helpers');

const typesCode = page.substring(typesStart, typesEnd);
const subComponentsCode = page.substring(subComponentsStart, subComponentsEnd);
const settingsCode = page.substring(settingsStart, settingsEnd);

const componentsCode = `import { useState } from "react";
import { signOut } from "next-auth/react";
import { User, Lock, EyeIcon, EyeOff, Save, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export type FileStatus = "queued" | "processing" | "done" | "error";

export interface JewelryFile {
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
  detecting: boolean;
  status: FileStatus;
  resultUrl: string | null;
  resultBlob?: Blob;
  claspBbox?: { cx: number, cy: number, w: number, h: number } | null;
  kembarId?: string | null;
  exported?: boolean;
  scale?: number;
  posX?: number;
  posY?: number;
  autoAdjust?: boolean;
  brightness?: number;
  contrast?: number;
  saturate?: number;
  detailScale?: number;
  detailPosX?: number;
  detailPosY?: number;
}

const STATUS_META: Record<FileStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  queued: { label: "Antrian", color: "#8A8A9E", bg: "rgba(138,138,158,0.1)", icon: <Clock size={10} /> },
  processing: { label: "Diproses", color: "#E59E3E", bg: "rgba(229,158,62,0.1)", icon: <div className="w-2.5 h-2.5 border border-[#E59E3E]/40 border-t-[#E59E3E] rounded-full animate-spin" /> },
  done: { label: "Selesai", color: "#38A169", bg: "rgba(56,161,105,0.1)", icon: <CheckCircle2 size={10} /> },
  error: { label: "Gagal", color: "#E53E3E", bg: "rgba(229,62,62,0.1)", icon: <AlertCircle size={10} /> },
};

${subComponentsCode.replace(/export /g, '')}

${settingsCode}

export { Slider, StatusBadge, SettingsPage };
`;

fs.writeFileSync('src/app/dashboard/components.tsx', componentsCode);

// Now remove them from page.tsx
let newPage = page.substring(0, typesStart) + 
  `import { JewelryFile, FileStatus, Slider, StatusBadge, SettingsPage } from "./components";\n\n` + 
  page.substring(typesEnd);

newPage = newPage.replace(subComponentsCode, '');
newPage = newPage.replace(settingsCode, '');

// Also remove STATUS_META from page.tsx if it's there
const statusMetaRegex = /const STATUS_META[\s\S]*?};\n/;
newPage = newPage.replace(statusMetaRegex, '');

fs.writeFileSync('src/app/dashboard/page.tsx', newPage);
console.log("Refactored into components.tsx");
