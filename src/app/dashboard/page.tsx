"use client";
import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Gem,
  LogOut,
  Download,
  Sparkles,
  Move,
  ZoomIn,
  X,
  CheckCircle2,
  RotateCcw,
  FolderOpen,
  Cpu,
  ChevronRight,
  ImageIcon,
  Clock,
  AlertCircle,
  Eye,
  PackageOpen,
  Settings,
  User,
  Lock,
  Eye as EyeIcon,
  EyeOff,
  Save,
  ShieldCheck,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type FileStatus = "queued" | "processing" | "done" | "error";

interface JewelryFile {
  id: string;
  name: string;
  url: string;
  category: string | null;
  detecting: boolean;
  status: FileStatus;
  resultUrl: string | null; // simulated composite result
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AI_CATEGORIES = ["Ring", "Necklace", "Earrings", "Bracelet", "Brooch", "Pendant"];
const TEMPLATE_PHOTOS: Record<string, string> = {
  Ring: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=480&h=480&fit=crop&auto=format",
  Necklace: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=480&h=480&fit=crop&auto=format",
  Earrings: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=480&h=480&fit=crop&auto=format",
  Bracelet: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=480&h=480&fit=crop&auto=format",
  Brooch: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=480&h=480&fit=crop&auto=format",
  Pendant: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=480&h=480&fit=crop&auto=format",
};

const STATUS_META: Record<FileStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  queued: {
    label: "Antrian",
    color: "#8A8A9E",
    bg: "rgba(138,138,158,0.1)",
    icon: <Clock size={10} />,
  },
  processing: {
    label: "Diproses",
    color: "#E59E3E",
    bg: "rgba(229,158,62,0.1)",
    icon: <div className="w-2.5 h-2.5 border border-[#E59E3E]/40 border-t-[#E59E3E] rounded-full animate-spin" />,
  },
  done: {
    label: "Selesai",
    color: "#38A169",
    bg: "rgba(56,161,105,0.1)",
    icon: <CheckCircle2 size={10} />,
  },
  error: {
    label: "Gagal",
    color: "#E53E3E",
    bg: "rgba(229,62,62,0.1)",
    icon: <AlertCircle size={10} />,
  },
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
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(to right, #E53E3E, #FC8181)",
          }}
        />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#E53E3E] shadow-md transition-all group-hover:scale-110"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: FileStatus }) {
  const m = STATUS_META[status];
  return (
    <span
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ color: m.color, background: m.bg }}
    >
      {m.icon}
      {m.label}
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

  const handleSaveUsername = () => {
    if (!username.trim()) return;
    setUsernameSaved(true);
    setTimeout(() => setUsernameSaved(false), 2500);
  };

  const handleSavePassword = () => {
    setPasswordError("");
    if (!currentPassword) { setPasswordError("Masukkan password saat ini."); return; }
    if (newPassword.length < 6) { setPasswordError("Password baru minimal 6 karakter."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Password baru dan konfirmasi tidak cocok."); return; }
    setPasswordSaved(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPasswordSaved(false), 2500);
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
  const inputStyle = {
    background: "rgba(255,255,255,0.8)",
    border: "1.5px solid rgba(0,0,0,0.09)",
  };

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
        <div
          className="rounded-3xl p-7 flex flex-col gap-6"
          style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.95)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(229,62,62,0.08)" }}>
              <User size={17} className="text-[#E53E3E]" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1A1A2E]">Username</h2>
              <p className="text-xs text-[#8A8A9E]">Nama yang digunakan untuk login</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#1A1A2E]">Username baru</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="contoh: wahyu.redjo"
              className={inputClass}
              style={inputStyle}
            />
            <p className="text-[10px] text-[#8A8A9E]">Gunakan huruf kecil, angka, titik, atau underscore.</p>
          </div>

          <button
            onClick={handleSaveUsername}
            disabled={!username.trim()}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: usernameSaved
                ? "linear-gradient(135deg, #38A169 0%, #68D391 100%)"
                : "linear-gradient(135deg, #E53E3E 0%, #FC8181 100%)",
              color: "#fff",
              boxShadow: username.trim()
                ? usernameSaved
                  ? "0 6px 20px rgba(56,161,105,0.35)"
                  : "0 6px 20px rgba(229,62,62,0.35)"
                : "none",
            }}
          >
            {usernameSaved
              ? <><CheckCircle2 size={15} strokeWidth={2.2} /> Tersimpan</>
              : <><Save size={15} strokeWidth={2.2} /> Simpan Username</>}
          </button>
        </div>

        {/* Password Card */}
        <div
          className="rounded-3xl p-7 flex flex-col gap-6"
          style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.95)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(229,62,62,0.08)" }}>
              <Lock size={17} className="text-[#E53E3E]" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1A1A2E]">Password</h2>
              <p className="text-xs text-[#8A8A9E]">Ganti password akun kamu</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Current password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#1A1A2E]">Password saat ini</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass + " pr-11"}
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A9E] hover:text-[#1A1A2E] transition-colors"
                >
                  {showCurrent ? <EyeOff size={15} strokeWidth={2} /> : <EyeIcon size={15} strokeWidth={2} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#1A1A2E]">Password baru</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass + " pr-11"}
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A9E] hover:text-[#1A1A2E] transition-colors"
                >
                  {showNew ? <EyeOff size={15} strokeWidth={2} /> : <EyeIcon size={15} strokeWidth={2} />}
                </button>
              </div>
              {/* Strength bar */}
              {newPassword.length > 0 && (
                <div className="flex flex-col gap-1 mt-0.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                        style={{ background: i <= score ? strengthColor : "#EDEDF3" }} />
                    ))}
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: strengthColor }}>
                    {strengthLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#1A1A2E]">Konfirmasi password baru</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass + " pr-11"}
                  style={{
                    ...inputStyle,
                    borderColor: confirmPassword && confirmPassword !== newPassword
                      ? "rgba(229,62,62,0.5)"
                      : confirmPassword && confirmPassword === newPassword
                      ? "rgba(56,161,105,0.5)"
                      : "rgba(0,0,0,0.09)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A9E] hover:text-[#1A1A2E] transition-colors"
                >
                  {showConfirm ? <EyeOff size={15} strokeWidth={2} /> : <EyeIcon size={15} strokeWidth={2} />}
                </button>
                {confirmPassword && confirmPassword === newPassword && (
                  <CheckCircle2 size={14} className="absolute right-9 top-1/2 -translate-y-1/2 text-[#38A169]" />
                )}
              </div>
            </div>
          </div>

          {/* Error message */}
          {passwordError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-[#E53E3E]"
              style={{ background: "rgba(229,62,62,0.07)", border: "1px solid rgba(229,62,62,0.15)" }}>
              <AlertCircle size={13} strokeWidth={2} />
              {passwordError}
            </div>
          )}

          <button
            onClick={handleSavePassword}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200"
            style={{
              background: passwordSaved
                ? "linear-gradient(135deg, #38A169 0%, #68D391 100%)"
                : "linear-gradient(135deg, #E53E3E 0%, #FC8181 100%)",
              color: "#fff",
              boxShadow: passwordSaved
                ? "0 6px 20px rgba(56,161,105,0.35)"
                : "0 6px 20px rgba(229,62,62,0.35)",
            }}
          >
            {passwordSaved
              ? <><ShieldCheck size={15} strokeWidth={2.2} /> Password Diperbarui</>
              : <><Lock size={15} strokeWidth={2.2} /> Ganti Password</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [activePage, setActivePage] = useState<"dashboard" | "settings">("dashboard");
  const [files, setFiles] = useState<JewelryFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scale, setScale] = useState(100);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0); // 0–100
  const [processedCount, setProcessedCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // ── File ingestion ──────────────────────────────────────────────────────────
  const processFiles = useCallback((rawFiles: FileList | File[]) => {
    const imageFiles = Array.from(rawFiles).filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;

    const newEntries: JewelryFile[] = imageFiles.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      name: f.name,
      url: URL.createObjectURL(f),
      category: null,
      detecting: true,
      status: "queued",
      resultUrl: null,
    }));

    setFiles((prev) => {
      const next = [...prev, ...newEntries];
      if (!activeId && next.length > 0) setActiveId(next[0].id);
      return next;
    });

    newEntries.forEach(async (entry, i) => {
      try {
        // Convert File to Base64
        const reader = new FileReader();
        reader.readAsDataURL(imageFiles[i]);
        reader.onload = async () => {
          const base64Image = reader.result as string;

          const prompt = "Please analyze this jewelry image and reply with ONLY ONE of the following categories: Ring, Necklace, Earrings, Bracelet, Brooch, Pendant. Do not say anything else.";

          const response = await fetch("/api/grok", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, imageBase64: base64Image }),
          });

          let category = "Ring"; // Fallback
          if (response.ok) {
            const data = await response.json();
            const reply = data.message?.trim() || "";
            // Find a matching category in the reply
            const matched = AI_CATEGORIES.find(c => reply.toLowerCase().includes(c.toLowerCase()));
            if (matched) category = matched;
          }

          setFiles((prev) =>
            prev.map((f) => f.id === entry.id ? { ...f, category, detecting: false } : f)
          );
        };
        reader.onerror = () => {
          // Fallback if read fails
          setFiles((prev) =>
            prev.map((f) => f.id === entry.id ? { ...f, category: "Ring", detecting: false } : f)
          );
        };
      } catch (e) {
        setFiles((prev) =>
          prev.map((f) => f.id === entry.id ? { ...f, category: "Ring", detecting: false } : f)
        );
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

  // ── Bulk generate ───────────────────────────────────────────────────────────
  const handleGenerate = () => {
    const targets = files.filter((f) => !f.detecting && f.status !== "done");
    if (!targets.length || generating) return;

    setGenerating(true);
    setProgress(0);
    setProcessedCount(0);

    // Reset queued
    setFiles((prev) =>
      prev.map((f) => targets.find((t) => t.id === f.id) ? { ...f, status: "queued", resultUrl: null } : f)
    );

    const processImageToCanvas = async (file: JewelryFile) => {
      return new Promise<string | null>((resolve) => {
        const nameParts = file.name.replace(/\.[^/.]+$/, "").split(" ");
        const mp = nameParts.length > 0 ? nameParts.pop() : "MP";
        const kadar = nameParts.length > 0 ? nameParts.pop() : "16K";

        const loadImage = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = src;
        });

        Promise.all([loadImage("/Kosongan.png"), loadImage(file.url)]).then(([templateImg, userImg]) => {
          const canvas = document.createElement("canvas");
          canvas.width = templateImg.width;
          canvas.height = templateImg.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);

          // Fill white bg
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw user image
          const w = userImg.width * (scale / 100);
          const h = userImg.height * (scale / 100);
          const x = canvas.width / 2 - w / 2 + posX;
          const y = canvas.height / 2 - h / 2 + posY;
          ctx.drawImage(userImg, x, y, w, h);

          // Draw template overlay
          ctx.drawImage(templateImg, 0, 0);

          // Draw cover boxes for old text (optional, since we use blank template now, but just in case)
          // ctx.fillStyle = "#F8D4D6";
          // ctx.fillRect(100, 900, 200, 100);

          // Write text
          ctx.font = "bold 60px Inter, sans-serif";
          ctx.fillStyle = "#e53e3e";
          ctx.textAlign = "left";
          ctx.fillText(`MP ${mp}`, 200, canvas.height - 110);

          ctx.font = "bold 55px Inter, sans-serif";
          ctx.fillStyle = "white";
          ctx.textAlign = "center";
          ctx.fillText(kadar || "16K", canvas.width / 2 + 130, canvas.height - 130);

          resolve(canvas.toDataURL("image/jpeg", 0.95));
        }).catch(() => resolve(null));
      });
    };

    targets.forEach((target, i) => {
      const delay = i * 200;

      // Mark processing
      setTimeout(() => {
        setFiles((prev) =>
          prev.map((f) => f.id === target.id ? { ...f, status: "processing" } : f)
        );
      }, delay);

      // Process and mark done
      setTimeout(async () => {
        const resultUrl = await processImageToCanvas(target);
        const success = !!resultUrl;
        
        setFiles((prev) =>
          prev.map((f) =>
            f.id === target.id
              ? { ...f, status: success ? "done" : "error", resultUrl: success ? resultUrl : null }
              : f
          )
        );
        
        setProcessedCount(prev => {
          const doneIdx = prev + 1;
          setProgress(Math.round((doneIdx / targets.length) * 100));
          if (doneIdx >= targets.length) {
            setTimeout(() => setGenerating(false), 400);
          }
          return doneIdx;
        });
      }, delay + 500);
    });
  };

  // ── Active file ─────────────────────────────────────────────────────────────
  const activeFile = files.find((f) => f.id === activeId) ?? null;
  const templateSrc = activeFile?.category ? TEMPLATE_PHOTOS[activeFile.category] : null;
  const doneFiles = files.filter((f) => f.status === "done");
  const allReady = files.length > 0 && files.every((f) => !f.detecting);

  return (
    <div className="min-h-screen bg-[#F8F9FA]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-8 py-4"
        style={{
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 1px 24px rgba(229,62,62,0.04), 0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #E53E3E 0%, #FC8181 100%)" }}
          >
            <Gem size={18} className="text-white" strokeWidth={1.8} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-bold text-[15px] tracking-tight text-[#1A1A2E]">Wahyu Redjo</span>
            <span className="text-[10px] font-medium text-[#8A8A9E] tracking-widest uppercase">Studio</span>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          <button
            onClick={() => setActivePage("dashboard")}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activePage === "dashboard" ? "rgba(229,62,62,0.08)" : "transparent",
              color: activePage === "dashboard" ? "#E53E3E" : "#8A8A9E",
            }}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActivePage("settings")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activePage === "settings" ? "rgba(229,62,62,0.08)" : "transparent",
              color: activePage === "settings" ? "#E53E3E" : "#8A8A9E",
            }}
          >
            <Settings size={14} strokeWidth={2} />
            Setting
          </button>
        </nav>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9E] hover:text-[#E53E3E] hover:bg-[#FFF0F0] transition-all">
          <LogOut size={15} strokeWidth={2} />
          <span>Logout</span>
        </button>
      </header>

      {activePage === "settings" && <SettingsPage />}

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      {activePage === "dashboard" && <main className="max-w-[1360px] mx-auto px-6 md:px-10 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[#8A8A9E] text-sm mb-1.5">
            <span>Dashboard</span>
            <ChevronRight size={14} />
            <span className="text-[#E53E3E] font-medium">Jewelry Composer</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A2E] tracking-tight">Jewelry Template Studio</h1>
          <p className="text-[#8A8A9E] text-sm mt-1">
            Upload satu foto atau seluruh folder — AI otomatis mendeteksi kategori, lalu generate semua sekaligus.
          </p>
        </div>

        {/* ── Two-column ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

          {/* LEFT ─────────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* Drop zone */}
            <div
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files); }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              className="relative rounded-2xl transition-all duration-200 overflow-hidden"
              style={{
                background: isDragging ? "rgba(229,62,62,0.05)" : "rgba(255,255,255,0.7)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: isDragging ? "1.5px dashed #E53E3E" : "1.5px dashed rgba(0,0,0,0.13)",
                boxShadow: isDragging
                  ? "0 0 0 4px rgba(229,62,62,0.08), 0 4px 24px rgba(0,0,0,0.05)"
                  : "0 2px 12px rgba(0,0,0,0.04)",
              }}
            >
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => e.target.files && processFiles(e.target.files)} />
              <input ref={folderInputRef} type="file" accept="image/*" multiple
                // @ts-expect-error
                webkitdirectory="" directory="" className="hidden"
                onChange={(e) => e.target.files && processFiles(e.target.files)} />

              <div className="flex flex-col items-center gap-4 py-7 px-6 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: isDragging ? "rgba(229,62,62,0.12)" : "rgba(229,62,62,0.06)" }}>
                  <Upload size={20} className="text-[#E53E3E]" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A2E]">
                    {isDragging ? "Lepaskan file di sini" : "Drag & drop foto atau folder"}
                  </p>
                  <p className="text-xs text-[#8A8A9E] mt-0.5">PNG, JPG, WEBP — bisa banyak file sekaligus</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#E53E3E] transition-all hover:opacity-80"
                    style={{ background: "rgba(229,62,62,0.08)", border: "1px solid rgba(229,62,62,0.2)" }}>
                    <ImageIcon size={14} strokeWidth={2.2} /> Pilih File
                  </button>
                  <button onClick={() => folderInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#1A1A2E] transition-all hover:text-[#E53E3E] hover:bg-[#FFF0F0]"
                    style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)" }}>
                    <FolderOpen size={14} strokeWidth={2.2} /> Pilih Folder
                  </button>
                </div>
              </div>

              {/* File queue list */}
              {files.length > 0 && (
                <div className="border-t px-4 py-3 flex flex-col gap-1 max-h-44 overflow-y-auto"
                  style={{ borderColor: "rgba(0,0,0,0.07)" }}>
                  {files.map((f) => (
                    <div key={f.id} onClick={() => setActiveId(f.id)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all group"
                      style={{
                        background: activeId === f.id ? "rgba(229,62,62,0.07)" : "transparent",
                        border: activeId === f.id ? "1px solid rgba(229,62,62,0.18)" : "1px solid transparent",
                      }}>
                      <img src={f.url} alt={f.name}
                        className="w-9 h-9 rounded-lg object-cover flex-shrink-0 ring-1 ring-black/5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#1A1A2E] truncate">{f.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {f.detecting ? (
                            <>
                              <div className="w-2.5 h-2.5 border border-[#E53E3E]/40 border-t-[#E53E3E] rounded-full animate-spin" />
                              <span className="text-[10px] text-[#8A8A9E]">AI mendeteksi…</span>
                            </>
                          ) : (
                            <>
                              <Cpu size={10} className="text-[#E53E3E]" />
                              <span className="text-[10px] font-medium text-[#E53E3E]">{f.category}</span>
                              <span className="text-[#EDEDF3]">·</span>
                              <StatusBadge status={f.status} />
                            </>
                          )}
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                        className="w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-all bg-[#EDEDF3] text-[#8A8A9E] hover:bg-[#FFF0F0] hover:text-[#E53E3E]">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Preview Canvas */}
            <div
              className="relative rounded-3xl overflow-hidden"
              style={{
                aspectRatio: "1 / 1",
                background: "rgba(255,255,255,0.6)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.9)",
                boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
              }}
            >
              {/* Live badge */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#E53E3E] animate-pulse" />
                <span className="text-[11px] font-semibold text-[#1A1A2E] tracking-wide uppercase">Live Preview</span>
              </div>

              {/* AI category badge */}
              {activeFile?.category && !activeFile.detecting && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: "linear-gradient(135deg, #E53E3E 0%, #FC8181 100%)", boxShadow: "0 4px 12px rgba(229,62,62,0.3)" }}>
                  <Cpu size={11} className="text-white" />
                  <span className="text-[11px] font-semibold text-white">{activeFile.category}</span>
                </div>
              )}
              {activeFile?.detecting && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(229,62,62,0.2)" }}>
                  <div className="w-2.5 h-2.5 border border-[#E53E3E]/40 border-t-[#E53E3E] rounded-full animate-spin" />
                  <span className="text-[11px] font-semibold text-[#E53E3E]">AI mendeteksi…</span>
                </div>
              )}

              {/* Template BG */}
              {templateSrc && (
                <img src={templateSrc} alt="Jewelry template"
                  className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-white/10" />

              {/* Uploaded photo */}
              {activeFile && !activeFile.detecting && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <img src={activeFile.url} alt="Overlay"
                    className="rounded-full object-cover transition-all duration-300"
                    style={{
                      width: `${scale * 0.9}px`, height: `${scale * 0.9}px`,
                      transform: `translate(${posX}px, ${posY}px)`,
                      opacity: 0.88, mixBlendMode: "multiply",
                      filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.18))",
                    }} />
                </div>
              )}

              {/* Status overlay for active */}
              {activeFile?.status === "done" && (
                <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: "linear-gradient(135deg, #38A169 0%, #68D391 100%)", boxShadow: "0 4px 16px rgba(56,161,105,0.35)" }}>
                  <CheckCircle2 size={12} className="text-white" />
                  <span className="text-[11px] font-semibold text-white">Selesai</span>
                </div>
              )}
              {activeFile?.status === "processing" && (
                <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(229,158,62,0.3)" }}>
                  <div className="w-2.5 h-2.5 border border-[#E59E3E]/40 border-t-[#E59E3E] rounded-full animate-spin" />
                  <span className="text-[11px] font-semibold text-[#E59E3E]">Diproses…</span>
                </div>
              )}

              {/* Counter */}
              {files.length > 1 && (
                <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(0,0,0,0.06)" }}>
                  <span className="text-[11px] font-semibold text-[#1A1A2E]">
                    {files.findIndex((f) => f.id === activeId) + 1} / {files.length}
                  </span>
                </div>
              )}

              {/* Empty state */}
              {!activeFile && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F8F9FA]/60">
                  <div className="px-6 py-4 rounded-2xl text-center"
                    style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
                    <Gem size={28} className="text-[#E53E3E]/30 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-sm font-semibold text-[#1A1A2E]">Upload foto untuk memulai</p>
                    <p className="text-xs text-[#8A8A9E] mt-0.5">AI mendeteksi kategori perhiasan secara otomatis</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Processed Results Grid ──────────────────────────────────── */}
            {files.length > 0 && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.75)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(0,0,0,0.07)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.05)",
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                  <div className="flex items-center gap-2">
                    <PackageOpen size={15} className="text-[#E53E3E]" strokeWidth={2} />
                    <span className="text-sm font-bold text-[#1A1A2E]">Hasil Proses</span>
                    <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: "rgba(229,62,62,0.08)", color: "#E53E3E" }}>
                      {doneFiles.length} selesai
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#8A8A9E]">
                    <span>{files.filter((f) => f.status === "queued").length} antrian</span>
                    <span>·</span>
                    <span>{files.filter((f) => f.status === "error").length} gagal</span>
                  </div>
                </div>

                {/* Grid */}
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                  {files.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => setActiveId(f.id)}
                      className="relative rounded-xl overflow-hidden cursor-pointer group transition-all"
                      style={{
                        aspectRatio: "1/1",
                        border: activeId === f.id
                          ? "2px solid #E53E3E"
                          : "2px solid transparent",
                        boxShadow: activeId === f.id
                          ? "0 0 0 3px rgba(229,62,62,0.15)"
                          : "0 2px 8px rgba(0,0,0,0.06)",
                      }}
                    >
                      <img src={f.url} alt={f.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />

                      {/* Status overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Status badge */}
                      <div className="absolute top-1.5 left-1.5">
                        <StatusBadge status={f.status} />
                      </div>

                      {/* Done tick */}
                      {f.status === "done" && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#38A169] flex items-center justify-center shadow">
                          <CheckCircle2 size={11} className="text-white" />
                        </div>
                      )}

                      {/* Processing shimmer */}
                      {f.status === "processing" && (
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      )}

                      {/* View on hover */}
                      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/90 shadow">
                          <Eye size={10} className="text-[#1A1A2E]" />
                          <span className="text-[9px] font-semibold text-[#1A1A2E]">Preview</span>
                        </div>
                      </div>

                      {/* Category chip */}
                      {f.category && !f.detecting && (
                        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold text-white"
                          style={{ background: "rgba(229,62,62,0.85)" }}>
                          {f.category}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {files.length === 0 && (
                  <div className="py-10 text-center text-sm text-[#8A8A9E]">
                    Belum ada foto yang diproses
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT ─────────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5 lg:sticky lg:top-[80px]">

            {/* Controls card */}
            <div
              className="rounded-3xl p-7 flex flex-col gap-6"
              style={{
                background: "rgba(255,255,255,0.8)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.95)",
                boxShadow: "0 8px 40px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)",
              }}
            >
              <div>
                <h2 className="text-base font-bold text-[#1A1A2E] tracking-tight">Adjustments</h2>
                <p className="text-xs text-[#8A8A9E] mt-0.5">Fine-tune posisi foto pada template</p>
              </div>

              <div className="flex flex-col gap-6">
                <Slider label="Scale" value={scale} min={40} max={320} step={2} unit="%" icon={<ZoomIn size={14} strokeWidth={2.2} />} onChange={setScale} />
                <Slider label="Position X" value={posX} min={-200} max={200} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={setPosX} />
                <Slider label="Position Y" value={posY} min={-200} max={200} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={setPosY} />
              </div>

              <button onClick={() => { setScale(100); setPosX(0); setPosY(0); }}
                className="flex items-center gap-2 text-xs font-medium text-[#8A8A9E] hover:text-[#E53E3E] transition-colors self-start">
                <RotateCcw size={12} strokeWidth={2.2} /> Reset ke default
              </button>

              <div className="h-px bg-[#EDEDF3]" />

              {/* Progress section */}
              {(generating || processedCount > 0) && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#1A1A2E]">
                      {generating ? "Memproses…" : "Selesai"}
                    </span>
                    <span className="font-bold tabular-nums" style={{ color: "#E53E3E" }}>
                      {processedCount} / {files.filter((f) => f.status !== "queued" || generating).length}
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-[#EDEDF3] overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        background: "linear-gradient(to right, #E53E3E, #FC8181)",
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[#8A8A9E]">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#38A169] inline-block" />
                      {files.filter((f) => f.status === "done").length} selesai
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E59E3E] inline-block" />
                      {files.filter((f) => f.status === "processing").length} diproses
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E53E3E] inline-block" />
                      {files.filter((f) => f.status === "error").length} gagal
                    </span>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generating || !allReady || files.length === 0}
                className="relative w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-white font-semibold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #E53E3E 0%, #FC8181 100%)",
                  boxShadow: allReady && files.length > 0 && !generating
                    ? "0 8px 32px rgba(229,62,62,0.4), 0 2px 8px rgba(229,62,62,0.2)"
                    : "none",
                }}
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Generating {files.filter((f) => f.status !== "queued" || generating).length} foto…</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} strokeWidth={2.2} />
                    <span>Generate {files.length > 0 ? `${files.length} Foto` : "Foto"}</span>
                  </>
                )}
              </button>

              {/* Export Button */}
              <button
                disabled={doneFiles.length === 0}
                onClick={() => {
                  doneFiles.forEach((file, index) => {
                    if (file.resultUrl) {
                      setTimeout(() => {
                        const a = document.createElement("a");
                        a.href = file.resultUrl;
                        a.download = `WR_${file.name}`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }, index * 300);
                    }
                  });
                }}
                className="relative w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: doneFiles.length > 0 ? "rgba(56,161,105,0.08)" : "rgba(0,0,0,0.03)",
                  border: doneFiles.length > 0 ? "1.5px solid rgba(56,161,105,0.3)" : "1.5px solid rgba(0,0,0,0.08)",
                  color: doneFiles.length > 0 ? "#38A169" : "#8A8A9E",
                  boxShadow: doneFiles.length > 0 ? "0 4px 16px rgba(56,161,105,0.12)" : "none",
                }}
              >
                <Download size={15} strokeWidth={2.2} />
                <span>
                  Export {doneFiles.length > 0 ? `${doneFiles.length} Hasil` : "Hasil"}
                </span>
              </button>

              {files.length === 0 && (
                <p className="text-center text-xs text-[#8A8A9E] -mt-3">Upload foto terlebih dahulu</p>
              )}
              {files.length > 0 && !allReady && !generating && (
                <p className="text-center text-xs text-[#8A8A9E] -mt-3">Menunggu AI mendeteksi semua kategori…</p>
              )}
            </div>

            {/* Tips */}
            <div className="rounded-2xl p-5"
              style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(0,0,0,0.06)" }}>
              <p className="text-xs font-semibold text-[#1A1A2E] mb-3">Tips</p>
              <ul className="flex flex-col gap-2">
                {[
                  "Pilih folder untuk upload semua foto sekaligus",
                  "AI otomatis menentukan kategori tiap foto",
                  "Klik foto di grid hasil untuk preview detail",
                  "Export tersedia setelah minimal 1 foto selesai diproses",
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#E53E3E]/40 flex-shrink-0" />
                    <span className="text-xs text-[#8A8A9E] leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>}
    </div>
  );
}

