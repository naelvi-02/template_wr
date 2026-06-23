"use client";
import { useState, useRef, useCallback } from "react";
import {
  Upload, Gem, LogOut, Download, Sparkles, Move, ZoomIn, X,
  CheckCircle2, RotateCcw, FolderOpen, Cpu, ChevronRight,
  ImageIcon, Clock, AlertCircle, Eye, PackageOpen, Settings,
  User, Lock, Eye as EyeIcon, EyeOff, Save, ShieldCheck
} from "lucide-react";
import { parseFilename, loadAndProcessImage } from "@/lib/imageProcessor";

// ─── Types ───────────────────────────────────────────────────────────────────
type FileStatus = "queued" | "processing" | "done" | "error";

interface JewelryFile {
  id: string;
  baseName: string;
  name: string; // original name of the main file
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
  claspBbox?: { cx: number, cy: number, w: number, h: number } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const AI_CATEGORIES = ["Ring", "Necklace", "Earrings", "Bracelet", "Brooch", "Pendant"];

const STATUS_META: Record<FileStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  queued: { label: "Antrian", color: "#8A8A9E", bg: "rgba(138,138,158,0.1)", icon: <Clock size={10} /> },
  processing: { label: "Diproses", color: "#E59E3E", bg: "rgba(229,158,62,0.1)", icon: <div className="w-2.5 h-2.5 border border-[#E59E3E]/40 border-t-[#E59E3E] rounded-full animate-spin" /> },
  done: { label: "Selesai", color: "#38A169", bg: "rgba(56,161,105,0.1)", icon: <CheckCircle2 size={10} /> },
  error: { label: "Gagal", color: "#E53E3E", bg: "rgba(229,62,62,0.1)", icon: <AlertCircle size={10} /> },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function Slider({
  label, value, min, max, step = 1, unit = "", icon, onChange,
}: {
  label: string; value: number; min: number; max: number;
  step?: number; unit?: string; icon: React.ReactNode;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#E53E3E]">{icon}</span>
          <span className="text-sm font-medium text-[#1A1A2E]">{label}</span>
        </div>
        <span className="text-sm font-semibold text-[#1A1A2E] tabular-nums min-w-[3.5rem] text-right">
          {value > 0 && unit !== "%" ? "+" : ""}{value}{unit}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-[#EDEDF3] cursor-pointer group">
        <div className="absolute top-0 left-0 h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "linear-gradient(to right, #E53E3E, #FC8181)" }} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#E53E3E] shadow-md transition-all group-hover:scale-110" style={{ left: `calc(${pct}% - 8px)` }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: FileStatus }) {
  const m = STATUS_META[status];
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ color: m.color, background: m.bg }}>
      {m.icon} {m.label}
    </span>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────
function SettingsPage() {
  const [username, setUsername] = useState("wahyu.redjo");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const handleSaveUsername = async () => {
    if (!username.trim()) return;
    try {
      const res = await fetch("/api/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newUsername: username }),
      });
      if (res.ok) {
        setUsernameSaved(true);
        setTimeout(() => {
          setUsernameSaved(false);
          signOut({ callbackUrl: '/login' });
        }, 2500);
      } else {
        const data = await res.json();
        alert(data.error || "Gagal mengubah username");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan");
    }
  };

  const handleSavePassword = async () => {
    setPasswordError("");
    if (!currentPassword) { setPasswordError("Masukkan password saat ini."); return; }
    if (newPassword.length < 6) { setPasswordError("Password baru minimal 6 karakter."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Password baru dan konfirmasi tidak cocok."); return; }
    
    try {
      const res = await fetch("/api/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setPasswordSaved(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setPasswordSaved(false);
          signOut({ callbackUrl: '/login' });
        }, 2500);
      } else {
        const data = await res.json();
        setPasswordError(data.error || "Gagal mengubah password");
      }
    } catch (e) {
      setPasswordError("Terjadi kesalahan jaringan");
    }
  };

  const strengthScore = (pw: string) => {
    let s = 0;
    if (pw.length >= 6) s++;
    if (pw.length >= 10) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };

  const score = strengthScore(newPassword);
  const strengthLabel = ["", "Lemah", "Lemah", "Cukup", "Kuat", "Sangat Kuat"][score];
  const strengthColor = ["#EDEDF3", "#E53E3E", "#E53E3E", "#E59E3E", "#38A169", "#22543D"][score];

  const inputClass = "w-full px-4 py-3 rounded-xl text-sm text-[#1A1A2E] placeholder-[#C0C0D0] outline-none transition-all focus:ring-2 focus:ring-[#E53E3E]/20";
  const inputStyle = { background: "rgba(255,255,255,0.8)", border: "1.5px solid rgba(0,0,0,0.09)" };

  return (
    <div className="max-w-[1360px] mx-auto px-6 md:px-10 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[#8A8A9E] text-sm mb-1.5">
          <span>Dashboard</span>
          <ChevronRight size={14} />
          <span className="text-[#E53E3E] font-medium">Pengaturan</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1A1A2E] tracking-tight">Pengaturan Akun</h1>
        <p className="text-[#8A8A9E] text-sm mt-1">Kelola username dan password akun kamu.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start max-w-[860px]">
        {/* Username Card */}
        <div className="rounded-3xl p-7 flex flex-col gap-6" style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.95)", boxShadow: "0 8px 40px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(229,62,62,0.08)" }}>
              <User size={17} className="text-[#E53E3E]" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1A1A2E]">Username</h2>
              <p className="text-xs text-[#8A8A9E]">Nama yang digunakan untuk login</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#1A1A2E]">Username baru</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="contoh: wahyu.redjo" className={inputClass} style={inputStyle} />
            <p className="text-[10px] text-[#8A8A9E]">Gunakan huruf kecil, angka, titik, atau underscore.</p>
          </div>
          <button onClick={handleSaveUsername} disabled={!username.trim()} className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: usernameSaved ? "linear-gradient(135deg, #38A169 0%, #68D391 100%)" : "linear-gradient(135deg, #E53E3E 0%, #FC8181 100%)", color: "#fff", boxShadow: username.trim() ? usernameSaved ? "0 6px 20px rgba(56,161,105,0.35)" : "0 6px 20px rgba(229,62,62,0.35)" : "none" }}>
            {usernameSaved ? <><CheckCircle2 size={15} strokeWidth={2.2} /> Tersimpan</> : <><Save size={15} strokeWidth={2.2} /> Simpan Username</>}
          </button>
        </div>
        {/* Password Card */}
        <div className="rounded-3xl p-7 flex flex-col gap-6" style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.95)", boxShadow: "0 8px 40px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(229,62,62,0.08)" }}>
              <Lock size={17} className="text-[#E53E3E]" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1A1A2E]">Password</h2>
              <p className="text-xs text-[#8A8A9E]">Ganti password akun kamu</p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#1A1A2E]">Password saat ini</label>
              <div className="relative">
                <input type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className={inputClass + " pr-11"} style={inputStyle} />
                <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A9E] hover:text-[#1A1A2E] transition-colors">{showCurrent ? <EyeOff size={15} strokeWidth={2} /> : <EyeIcon size={15} strokeWidth={2} />}</button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#1A1A2E]">Password baru</label>
              <div className="relative">
                <input type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className={inputClass + " pr-11"} style={inputStyle} />
                <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A9E] hover:text-[#1A1A2E] transition-colors">{showNew ? <EyeOff size={15} strokeWidth={2} /> : <EyeIcon size={15} strokeWidth={2} />}</button>
              </div>
              {newPassword.length > 0 && (
                <div className="flex flex-col gap-1 mt-0.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300" style={{ background: i <= score ? strengthColor : "#EDEDF3" }} />
                    ))}
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: strengthColor }}>{strengthLabel}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#1A1A2E]">Konfirmasi password baru</label>
              <div className="relative">
                <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className={inputClass + " pr-11"} style={{ ...inputStyle, borderColor: confirmPassword && confirmPassword !== newPassword ? "rgba(229,62,62,0.5)" : confirmPassword && confirmPassword === newPassword ? "rgba(56,161,105,0.5)" : "rgba(0,0,0,0.09)" }} />
                <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A9E] hover:text-[#1A1A2E] transition-colors">{showConfirm ? <EyeOff size={15} strokeWidth={2} /> : <EyeIcon size={15} strokeWidth={2} />}</button>
                {confirmPassword && confirmPassword === newPassword && <CheckCircle2 size={14} className="absolute right-9 top-1/2 -translate-y-1/2 text-[#38A169]" />}
              </div>
            </div>
          </div>
          {passwordError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-[#E53E3E]" style={{ background: "rgba(229,62,62,0.07)", border: "1px solid rgba(229,62,62,0.15)" }}>
              <AlertCircle size={13} strokeWidth={2} /> {passwordError}
            </div>
          )}
          <button onClick={handleSavePassword} className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200" style={{ background: passwordSaved ? "linear-gradient(135deg, #38A169 0%, #68D391 100%)" : "linear-gradient(135deg, #E53E3E 0%, #FC8181 100%)", color: "#fff", boxShadow: passwordSaved ? "0 6px 20px rgba(56,161,105,0.35)" : "0 6px 20px rgba(229,62,62,0.35)" }}>
            {passwordSaved ? <><ShieldCheck size={15} strokeWidth={2.2} /> Password Diperbarui</> : <><Lock size={15} strokeWidth={2.2} /> Ganti Password</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
import { signOut } from "next-auth/react";

export default function Dashboard() {
  const [activePage, setActivePage] = useState<"dashboard" | "settings">("dashboard");
  const [files, setFiles] = useState<JewelryFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scale, setScale] = useState(100);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // ── File ingestion ──────────────────────────────────────────────────────────
  const processFiles = useCallback((rawFiles: FileList | File[]) => {
    const imageFiles = Array.from(rawFiles).filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;

    const fileMap = new Map<string, { main?: File, detail?: File }>();
    
    imageFiles.forEach(f => {
      const parsed = parseFilename(f.name);
      if (!fileMap.has(parsed.baseName)) {
        fileMap.set(parsed.baseName, {});
      }
      if (parsed.isDetail) {
        fileMap.get(parsed.baseName)!.detail = f;
      } else {
        fileMap.get(parsed.baseName)!.main = f;
      }
    });

    const newEntries: JewelryFile[] = [];
    fileMap.forEach((data, baseName) => {
      // Must have at least a main file to proceed
      if (data.main) {
        const parsed = parseFilename(data.main.name);
        newEntries.push({
          id: `${baseName}-${Date.now()}-${Math.random()}`,
          baseName,
          name: data.main.name,
          karat: parsed.karat,
          mp: parsed.mp,
          file: data.main,
          detailFile: data.detail,
          url: URL.createObjectURL(data.main),
          detailUrl: data.detail ? URL.createObjectURL(data.detail) : undefined,
          category: null,
          detecting: true,
          status: "queued",
          resultUrl: null,
        });
      }
    });

    if (!newEntries.length) return;

    setFiles((prev) => {
      const next = [...prev, ...newEntries];
      if (!activeId && next.length > 0) setActiveId(next[0].id);
      return next;
    });

    const compressImageForAI = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => {
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX_DIM = 512;
            let { width, height } = img;
            if (width > height && width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            } else if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.7));
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    newEntries.forEach(async (entry) => {
      try {
        const base64Image = await compressImageForAI(entry.file);
        const prompt = "Please analyze this jewelry image and reply with ONLY ONE of the following categories: Ring, Necklace, Earrings, Bracelet, Brooch, Pendant. Do not say anything else.";
        
        const response = await fetch("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, imageBase64: base64Image }),
          });

          let category = "Ring";
          if (response.ok) {
            const data = await response.json();
            const reply = data.message?.trim() || "";
            const matched = AI_CATEGORIES.find(c => reply.toLowerCase().includes(c.toLowerCase()));
            if (matched) category = matched;
          }

          let claspBbox = null;
          if ((category === "Necklace" || category === "Bracelet") && entry.detailFile) {
            try {
              const detailBase64 = await compressImageForAI(entry.detailFile);
              
              const claspPrompt = `Analyze this jewelry image. Find the specific location of the main clasp/hook (pengait). You MUST return ONLY a JSON object representing a small bounding box tightly enclosing the clasp. Use fractional coordinates (0.0 to 1.0). For example, if the clasp is small and in the top right, return {"cx": 0.8, "cy": 0.2, "w": 0.1, "h": 0.1}. Do NOT return the bounding box of the entire bracelet/necklace. Return ONLY raw JSON, no markdown, no explanation.`;
              const claspResponse = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: claspPrompt, imageBase64: detailBase64 }),
              });
              
              if (claspResponse.ok) {
                const data = await claspResponse.json();
                const reply = data.message || "";
                const match = reply.match(/\{[\s\S]*\}/);
                if (match) {
                  claspBbox = JSON.parse(match[0]);
                }
              }
            } catch (e) {
              console.error("Failed to detect clasp:", e);
            }
          }

        setFiles((prev) => prev.map((f) => f.id === entry.id ? { ...f, category, claspBbox, detecting: false } : f));
      } catch (e) {
        setFiles((prev) => prev.map((f) => f.id === entry.id ? { ...f, category: "Ring", detecting: false } : f));
      }
    });
  }, [activeId]);

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      return next;
    });
  };

  // ── Compose Engine ──────────────────────────────────────────────────────────
  const drawComposition = async (target: JewelryFile, overrideScale?: number, overrideX?: number, overrideY?: number): Promise<string | null> => {
    try {
      const { canvas: mainCropped, bbox: mainBbox } = await loadAndProcessImage(target.file);
      let detailCropped: HTMLCanvasElement | null = null;
      let resDetails: any = null;
      if (target.detailFile) {
        resDetails = await loadAndProcessImage(target.detailFile);
        detailCropped = resDetails.canvas;
      }

      const templateImg = new Image();
      templateImg.crossOrigin = "anonymous";
      await new Promise((res, rej) => {
        templateImg.onload = res;
        templateImg.onerror = rej;
        templateImg.src = "/Kosongan No Bg.png";
      });

      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = templateImg.width;
      finalCanvas.height = templateImg.height;
      const ctx = finalCanvas.getContext("2d");
      if (!ctx) return null;

      // 1. Fill white background (since template is "No Bg")
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

      // 2. Draw template base (logos, footer, etc.)
      ctx.drawImage(templateImg, 0, 0);

      // 3. Draw Main Jewelry (Centered)
      const currentScale = (overrideScale !== undefined ? overrideScale : scale) / 100;
      const currentX = overrideX !== undefined ? overrideX : posX;
      const currentY = overrideY !== undefined ? overrideY : posY;

      const isNecklace = target.category === "Necklace";
      // Fit to a safe area: 115% for necklaces to overbleed the canvas, 70% for others
      const safeW = finalCanvas.width * (isNecklace ? 1.15 : 0.7);
      const safeH = finalCanvas.height * (isNecklace ? 1.15 : 0.7);
      const scaleFactor = Math.min(safeW / mainBbox.width, safeH / mainBbox.height) * currentScale;

      const drawW = mainBbox.width * scaleFactor;
      const drawH = mainBbox.height * scaleFactor;
      const cx = (finalCanvas.width / 2) - (drawW / 2) + currentX;
      let cy = (finalCanvas.height / 2) - (drawH / 2) + currentY;
      
      // If it's a necklace, push it high up so the cut-off ends bleed completely out of the frame
      if (isNecklace && overrideY === undefined) {
        cy = -100 + currentY; // -100px from top border
      }

      // Add a slight drop shadow for realism
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.1)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 10;
      ctx.drawImage(mainCropped, cx, cy, drawW, drawH);
      ctx.restore();

      // 4. Draw Inset Detail (if exists)
      if (detailCropped) {
        const circleRadius = finalCanvas.width * 0.12; // 12% of width
        const circleX = circleRadius + 80;
        const circleY = finalCanvas.height - circleRadius - 200; // Above footer

        // Draw white circle with shadow
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.15)";
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 10;
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();

        // Draw inner border
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleRadius - 4, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#EDEDF3";
        ctx.stroke();

        // Clip and draw detail image
        ctx.save();
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleRadius - 5, 0, Math.PI * 2);
        ctx.clip();
        
        let detW = 0;
        let detH = 0;
        let cropX = 0;
        let cropY = 0;
        let cropW = detailCropped.width;
        let cropH = detailCropped.height;

        if (target.claspBbox) {
          // target.claspBbox has {cx, cy, w, h} in 0..1 scale relative to original image
          // resDetails has { originalWidth, originalHeight, bbox }
          // We need to map to the detailCropped canvas
          const origW = resDetails.originalWidth;
          const origH = resDetails.originalHeight;
          const absCx = target.claspBbox.cx * origW;
          const absCy = target.claspBbox.cy * origH;
          const absW = target.claspBbox.w * origW;
          const absH = target.claspBbox.h * origH;

          // Map to cropped canvas
          const croppedCx = absCx - resDetails.bbox.x;
          const croppedCy = absCy - resDetails.bbox.y;
          
          let size = Math.max(absW, absH) * 2.5; // padding besar agar zoom-out dan tidak terpotong
          
          // Enforce a minimum zoom size so it doesn't break if AI returns 0
          const minSize = Math.max(origW * 0.08, 150);
          if (size < minSize) {
            size = minSize;
          }

          cropX = croppedCx - size / 2;
          cropY = croppedCy - size / 2;
          cropW = size;
          cropH = size;
        }

        // Scale crop area to fit nicely
        const detScale = (circleRadius * 2) / Math.max(cropW, cropH);
        detW = cropW * detScale;
        detH = cropH * detScale;

        // Draw cropped detail image into the circle
        ctx.drawImage(
          detailCropped, 
          cropX, cropY, cropW, cropH, 
          circleX - detW / 2, circleY - detH / 2, detW, detH
        );
        ctx.restore();
      }

      // 5. Draw Texts (MP & Karat)
      
      // MP text at bottom left
      ctx.font = "600 45px Lora, serif"; 
      ctx.fillStyle = "#ec1e24";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`MP ${target.mp}`, 90, 1155); 

      // Karat text inside existing circle
      const karatCx = 740; 
      const karatCy = 1092;
      
      // Draw Karat text
      ctx.font = "600 72px Lora, serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(target.karat, karatCx, karatCy);

      return finalCanvas.toDataURL("image/jpeg", 0.95);
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handleGenerate = async () => {
    const targets = files.filter((f) => !f.detecting && f.status !== "done");
    if (!targets.length || generating) return;

    setGenerating(true);
    setProgress(0);
    setProcessedCount(0);

    setFiles((prev) => prev.map((f) => targets.find((t) => t.id === f.id) ? { ...f, status: "queued", resultUrl: null } : f));

    let doneCount = 0;
    for (const target of targets) {
      setFiles((prev) => prev.map((f) => f.id === target.id ? { ...f, status: "processing" } : f));
      
      const resultUrl = await drawComposition(target, 100, 0, 0);
      const success = !!resultUrl;
      
      setFiles((prev) => prev.map((f) => f.id === target.id ? { ...f, status: success ? "done" : "error", resultUrl: success ? resultUrl : null } : f));
      
      doneCount++;
      setProgress(Math.round((doneCount / targets.length) * 100));
      setProcessedCount(doneCount);
    }
    
    setTimeout(() => setGenerating(false), 400);
  };

  // Preview Updater
  const activeFile = files.find((f) => f.id === activeId) ?? null;
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);

  const renderTimeout = useRef<NodeJS.Timeout | null>(null);
  
  useCallback(() => {
    if (!activeFile || activeFile.detecting || generating) return;
    setIsRenderingPreview(true);
    if (renderTimeout.current) clearTimeout(renderTimeout.current);
    renderTimeout.current = setTimeout(async () => {
      const url = await drawComposition(activeFile, scale, posX, posY);
      if (url) setLivePreviewUrl(url);
      setIsRenderingPreview(false);
    }, 500);
  }, [activeFile, scale, posX, posY, generating]);

  const doneFiles = files.filter((f) => f.status === "done");
  const allReady = files.length > 0 && files.every((f) => !f.detecting);

  return (
    <div className="min-h-screen bg-[#F8F9FA]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-8 py-4" style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 24px rgba(229,62,62,0.04), 0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #E53E3E 0%, #FC8181 100%)" }}>
            <Gem size={18} className="text-white" strokeWidth={1.8} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-bold text-[15px] tracking-tight text-[#1A1A2E]">Wahyu Redjo</span>
            <span className="text-[10px] font-medium text-[#8A8A9E] tracking-widest uppercase">Studio</span>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          <button onClick={() => setActivePage("dashboard")} className="px-4 py-2 rounded-lg text-sm font-medium transition-all" style={{ background: activePage === "dashboard" ? "rgba(229,62,62,0.08)" : "transparent", color: activePage === "dashboard" ? "#E53E3E" : "#8A8A9E" }}>Dashboard</button>
          <button onClick={() => setActivePage("settings")} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all" style={{ background: activePage === "settings" ? "rgba(229,62,62,0.08)" : "transparent", color: activePage === "settings" ? "#E53E3E" : "#8A8A9E" }}><Settings size={14} strokeWidth={2} /> Setting</button>
        </nav>
        <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9E] hover:text-[#E53E3E] hover:bg-[#FFF0F0] transition-all"><LogOut size={15} strokeWidth={2} /><span>Logout</span></button>
      </header>

      {activePage === "settings" && <SettingsPage />}

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      {activePage === "dashboard" && <main className="max-w-[1360px] mx-auto px-6 md:px-10 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[#8A8A9E] text-sm mb-1.5"><span>Dashboard</span><ChevronRight size={14} /><span className="text-[#E53E3E] font-medium">Jewelry Composer</span></div>
          <h1 className="text-2xl font-bold text-[#1A1A2E] tracking-tight">Jewelry Template Studio</h1>
          <p className="text-[#8A8A9E] text-sm mt-1">Upload folder "sebelum". AI hapus background, sesuaikan cahaya, & deteksi inset otomatis.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
          {/* LEFT ─────────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5">
            {/* Drop zone */}
            <div onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files); }} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} className="relative rounded-2xl transition-all duration-200 overflow-hidden" style={{ background: isDragging ? "rgba(229,62,62,0.05)" : "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: isDragging ? "1.5px dashed #E53E3E" : "1.5px dashed rgba(0,0,0,0.13)", boxShadow: isDragging ? "0 0 0 4px rgba(229,62,62,0.08), 0 4px 24px rgba(0,0,0,0.05)" : "0 2px 12px rgba(0,0,0,0.04)" }}>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && processFiles(e.target.files)} />
              <input ref={folderInputRef} type="file" accept="image/*" multiple 
// @ts-expect-error 
webkitdirectory="" directory="" className="hidden" onChange={(e) => e.target.files && processFiles(e.target.files)} />
              <div className="flex flex-col items-center gap-4 py-7 px-6 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: isDragging ? "rgba(229,62,62,0.12)" : "rgba(229,62,62,0.06)" }}><Upload size={20} className="text-[#E53E3E]" strokeWidth={1.8} /></div>
                <div><p className="text-sm font-semibold text-[#1A1A2E]">{isDragging ? "Lepaskan file di sini" : "Drag & drop foto atau folder"}</p><p className="text-xs text-[#8A8A9E] mt-0.5">PNG, JPG, WEBP — bisa banyak file sekaligus</p></div>
                <div className="flex items-center gap-3">
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#E53E3E] transition-all hover:opacity-80" style={{ background: "rgba(229,62,62,0.08)", border: "1px solid rgba(229,62,62,0.2)" }}><ImageIcon size={14} strokeWidth={2.2} /> Pilih File</button>
                  <button onClick={() => folderInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#1A1A2E] transition-all hover:text-[#E53E3E] hover:bg-[#FFF0F0]" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)" }}><FolderOpen size={14} strokeWidth={2.2} /> Pilih Folder</button>
                </div>
              </div>
              {/* File queue list */}
              {files.length > 0 && (
                <div className="border-t px-4 py-3 flex flex-col gap-1 max-h-44 overflow-y-auto" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
                  {files.map((f) => (
                    <div key={f.id} onClick={() => setActiveId(f.id)} className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all group" style={{ background: activeId === f.id ? "rgba(229,62,62,0.07)" : "transparent", border: activeId === f.id ? "1px solid rgba(229,62,62,0.18)" : "1px solid transparent" }}>
                      <img src={f.url} alt={f.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0 ring-1 ring-black/5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-[#1A1A2E] truncate">{f.baseName}</p>
                          {f.detailFile && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#1A1A2E] text-white">INSET</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {f.detecting ? (
                            <><div className="w-2.5 h-2.5 border border-[#E53E3E]/40 border-t-[#E53E3E] rounded-full animate-spin" /><span className="text-[10px] text-[#8A8A9E]">AI mendeteksi…</span></>
                          ) : (
                            <><Cpu size={10} className="text-[#E53E3E]" /><span className="text-[10px] font-medium text-[#E53E3E]">{f.category}</span><span className="text-[#EDEDF3]">·</span><StatusBadge status={f.status} /></>
                          )}
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removeFile(f.id); }} className="w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-all bg-[#EDEDF3] text-[#8A8A9E] hover:bg-[#FFF0F0] hover:text-[#E53E3E]"><X size={11} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Preview Canvas */}
            <div className="relative rounded-3xl overflow-hidden flex items-center justify-center" style={{ aspectRatio: "1 / 1", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
              {activeFile && !activeFile.detecting && (
                <button 
                  onClick={async () => {
                    setIsRenderingPreview(true);
                    const url = await drawComposition(activeFile, scale, posX, posY);
                    if (url) setLivePreviewUrl(url);
                    setIsRenderingPreview(false);
                  }}
                  className="absolute z-20 top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all hover:scale-105" style={{ background: "rgba(229,62,62,0.9)", color: "white", boxShadow: "0 4px 12px rgba(229,62,62,0.3)" }}>
                  <RotateCcw size={12} className={isRenderingPreview ? "animate-spin" : ""} /> Update Preview
                </button>
              )}
              
              {activeFile?.resultUrl || livePreviewUrl ? (
                <img src={(activeFile?.resultUrl || livePreviewUrl)!} alt="Live Preview" className="w-full h-full object-contain" />
              ) : activeFile && !activeFile.detecting ? (
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-[#E53E3E]/30 border-t-[#E53E3E] rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm font-semibold text-[#8A8A9E]">Klik 'Update Preview' untuk merender kanvas...</p>
                </div>
              ) : null}

              {/* Empty state */}
              {!activeFile && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F8F9FA]/60">
                  <div className="px-6 py-4 rounded-2xl text-center" style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
                    <Gem size={28} className="text-[#E53E3E]/30 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-sm font-semibold text-[#1A1A2E]">Upload foto untuk memulai</p>
                    <p className="text-xs text-[#8A8A9E] mt-0.5">AI mendeteksi kategori perhiasan secara otomatis</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Processed Results Grid ──────────────────────────────────── */}
            {files.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>
                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                  <div className="flex items-center gap-2"><PackageOpen size={15} className="text-[#E53E3E]" strokeWidth={2} /><span className="text-sm font-bold text-[#1A1A2E]">Hasil Proses</span><span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "rgba(229,62,62,0.08)", color: "#E53E3E" }}>{doneFiles.length} selesai</span></div>
                  <div className="flex items-center gap-3 text-xs text-[#8A8A9E]"><span>{files.filter((f) => f.status === "queued").length} antrian</span><span>·</span><span>{files.filter((f) => f.status === "error").length} gagal</span></div>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                  {files.map((f) => (
                    <div key={f.id} onClick={() => { setActiveId(f.id); setLivePreviewUrl(null); }} className="relative rounded-xl overflow-hidden cursor-pointer group transition-all bg-white" style={{ aspectRatio: "1/1", border: activeId === f.id ? "2px solid #E53E3E" : "2px solid transparent", boxShadow: activeId === f.id ? "0 0 0 3px rgba(229,62,62,0.15)" : "0 2px 8px rgba(0,0,0,0.06)" }}>
                      <img src={f.resultUrl || f.url} alt={f.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-1.5 left-1.5"><StatusBadge status={f.status} /></div>
                      {f.status === "done" && <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#38A169] flex items-center justify-center shadow"><CheckCircle2 size={11} className="text-white" /></div>}
                      {f.status === "processing" && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
                      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"><div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/90 shadow"><Eye size={10} className="text-[#1A1A2E]" /><span className="text-[9px] font-semibold text-[#1A1A2E]">Preview</span></div></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT ─────────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5 lg:sticky lg:top-[80px]">
            <div className="rounded-3xl p-7 flex flex-col gap-6" style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.95)", boxShadow: "0 8px 40px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)" }}>
              <div><h2 className="text-base font-bold text-[#1A1A2E] tracking-tight">Adjustments</h2><p className="text-xs text-[#8A8A9E] mt-0.5">Berlaku untuk export massal nanti</p></div>
              <div className="flex flex-col gap-6">
                <Slider label="Scale" value={scale} min={40} max={320} step={2} unit="%" icon={<ZoomIn size={14} strokeWidth={2.2} />} onChange={setScale} />
                <Slider label="Position X" value={posX} min={-400} max={400} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={setPosX} />
                <Slider label="Position Y" value={posY} min={-400} max={400} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={setPosY} />
              </div>
              <button onClick={() => { setScale(100); setPosX(0); setPosY(0); }} className="flex items-center gap-2 text-xs font-medium text-[#8A8A9E] hover:text-[#E53E3E] transition-colors self-start"><RotateCcw size={12} strokeWidth={2.2} /> Reset ke default</button>
              <div className="h-px bg-[#EDEDF3]" />
              {(generating || processedCount > 0) && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs"><span className="font-semibold text-[#1A1A2E]">{generating ? "Memproses AI…" : "Selesai"}</span><span className="font-bold tabular-nums" style={{ color: "#E53E3E" }}>{processedCount} / {files.filter((f) => f.status !== "queued" || generating).length}</span></div>
                  <div className="relative h-2 rounded-full bg-[#EDEDF3] overflow-hidden"><div className="absolute top-0 left-0 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: "linear-gradient(to right, #E53E3E, #FC8181)" }} /></div>
                </div>
              )}
              <button onClick={handleGenerate} disabled={generating || !allReady || files.length === 0} className="relative w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-white font-semibold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "linear-gradient(135deg, #E53E3E 0%, #FC8181 100%)", boxShadow: allReady && files.length > 0 && !generating ? "0 8px 32px rgba(229,62,62,0.4), 0 2px 8px rgba(229,62,62,0.2)" : "none" }}>
                {generating ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /><span>Memproses {files.filter((f) => f.status !== "queued" || generating).length} foto…</span></> : <><Sparkles size={16} strokeWidth={2.2} /><span>Generate {files.length > 0 ? `${files.length} Foto` : "Foto"}</span></>}
              </button>
              <button disabled={doneFiles.length === 0} onClick={() => { doneFiles.forEach((file, index) => { const url = file.resultUrl; if (url) { setTimeout(() => { const a = document.createElement("a"); a.href = url; a.download = `WR_${file.baseName}.jpg`; document.body.appendChild(a); a.click(); document.body.removeChild(a); }, index * 500); } }); }} className="relative w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: doneFiles.length > 0 ? "rgba(56,161,105,0.08)" : "rgba(0,0,0,0.03)", border: doneFiles.length > 0 ? "1.5px solid rgba(56,161,105,0.3)" : "1.5px solid rgba(0,0,0,0.08)", color: doneFiles.length > 0 ? "#38A169" : "#8A8A9E", boxShadow: doneFiles.length > 0 ? "0 4px 16px rgba(56,161,105,0.12)" : "none" }}>
                <Download size={15} strokeWidth={2.2} /><span>Export {doneFiles.length > 0 ? `${doneFiles.length} Hasil` : "Hasil"}</span>
              </button>
            </div>
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(0,0,0,0.06)" }}><p className="text-xs font-semibold text-[#1A1A2E] mb-3">Tips</p><ul className="flex flex-col gap-2">{["Pilih folder untuk upload semua foto sekaligus", "AI otomatis menentukan kategori & memisahkan foto detail", "Background akan dihapus secara otomatis", "Export tersedia setelah 1 foto selesai diproses"].map((tip) => (<li key={tip} className="flex items-start gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#E53E3E]/40 flex-shrink-0" /><span className="text-xs text-[#8A8A9E] leading-relaxed">{tip}</span></li>))}</ul></div>
          </div>
        </div>
      </main>}
    </div>
  );
}
