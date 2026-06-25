"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, Gem, LogOut, Download, Sparkles, Move, ZoomIn, X,
  CheckCircle2, RotateCcw, FolderOpen, Cpu, ChevronRight,
  ImageIcon, Clock, AlertCircle, Eye, PackageOpen, Settings,
  User, Lock, Eye as EyeIcon, EyeOff, Save, ShieldCheck, Plus, Archive
} from "lucide-react";
import JSZip from "jszip";
import { parseFilename, loadAndProcessImage } from "@/lib/imageProcessor";
import { Project, getProjects, createProject, deleteProject, saveProjectFiles, getProjectFiles, StoredJewelryFile } from "@/lib/db";

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
  resultBlob?: Blob;
  claspBbox?: { cx: number, cy: number, w: number, h: number } | null;
  kembarId?: string | null;
  exported?: boolean;
  scale?: number;
  posX?: number;
  posY?: number;
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

let globalTemplateImg: HTMLImageElement | null = null;

const getTemplateImg = async (): Promise<HTMLImageElement> => {
  if (globalTemplateImg) return globalTemplateImg;
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { globalTemplateImg = img; res(img); };
    img.onerror = rej;
    img.src = "/Kosongan No Bg.png";
  });
};

export default function Dashboard() {
  const [activePage, setActivePage] = useState<"dashboard" | "settings">("dashboard");
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [files, setFiles] = useState<JewelryFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const processCache = useRef(new Map<string, { mainCropped: HTMLCanvasElement, mainBbox: any }>());
  const kembarDetailCache = useRef(new Map<string, { detailCropped: HTMLCanvasElement | null, resDetails: any }>());

  // Load Projects on Mount
  useEffect(() => {
    getProjects().then(p => {
      setProjects(p);
      if (p.length === 0) {
        setShowProjectModal(true);
      } else {
        setActiveProjectId(p[p.length - 1].id);
      }
    });
  }, []);

  // Load Files when active project changes
  useEffect(() => {
    if (!activeProjectId) return;
    getProjectFiles(activeProjectId).then(stored => {
      const rehydrated: JewelryFile[] = stored.map(s => ({
        ...s,
        url: URL.createObjectURL(s.file),
        detailUrl: s.detailFile ? URL.createObjectURL(s.detailFile) : undefined,
        resultUrl: s.resultBlob ? URL.createObjectURL(s.resultBlob) : null,
        status: s.status === "processing" ? "queued" : s.status
      }));
      setFiles(rehydrated);
      if (rehydrated.length > 0) setActiveId(rehydrated[0].id);
      else setActiveId(null);
    });
  }, [activeProjectId]);

  // Auto-Save Files when they change
  useEffect(() => {
    if (!activeProjectId) return;
    
    const toStore: StoredJewelryFile[] = files.map(f => {
      const { url, detailUrl, resultUrl, ...rest } = f;
      return rest;
    });
    
    saveProjectFiles(activeProjectId, toStore).catch(console.error);
  }, [files, activeProjectId]);
  const [isDragging, setIsDragging] = useState(false);
  const [scale, setScale] = useState(100);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const items = e.dataTransfer.items;
    if (!items) {
      processFiles(e.dataTransfer.files);
      return;
    }

    const files: File[] = [];
    const promises: Promise<void>[] = [];

    const traverseFileTree = (item: any, path: string = "") => {
      return new Promise<void>((resolve) => {
        if (item.isFile) {
          item.file((file: File) => {
            Object.defineProperty(file, 'webkitRelativePath', {
              value: path + file.name,
              writable: false
            });
            files.push(file);
            resolve();
          });
        } else if (item.isDirectory) {
          const dirReader = item.createReader();
          dirReader.readEntries((entries: any[]) => {
            const entryPromises = entries.map((entry: any) => traverseFileTree(entry, path + item.name + "/"));
            Promise.all(entryPromises).then(() => resolve());
          });
        }
      });
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i].webkitGetAsEntry();
      if (item) {
        promises.push(traverseFileTree(item));
      }
    }

    await Promise.all(promises);
    processFiles(files);
  };

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
          category: parsed.category || null,
          detecting: true,
          status: "queued",
          resultUrl: null,
          kembarId: data.main ? (() => {
            const path = data.main.webkitRelativePath || "";
            const parts = path.split("/");
            if (parts.length > 1) {
              const folderName = parts[parts.length - 2];
              if (folderName.toUpperCase().includes("KEMBAR")) {
                return folderName;
              }
            }
            return null;
          })() : null,
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

    const processQueue = async () => {
      const maxConcurrency = 3;
      let i = 0;
      const worker = async () => {
        while (i < newEntries.length) {
          const entry = newEntries[i++];
          try {
            let category = entry.category;
            
            if (!category) {
              const base64Image = await compressImageForAI(entry.file);
              const prompt = "Please analyze this jewelry image and reply with ONLY ONE of the following categories: Ring, Necklace, Earrings, Bracelet, Brooch, Pendant. Do not say anything else.";
              
              const response = await fetch("/api/ai", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ prompt, imageBase64: base64Image }),
                });
      
                category = "Ring"; // Default fallback
                if (response.ok) {
                  const data = await response.json();
                  const reply = data.message?.trim() || "";
                  const matched = AI_CATEGORIES.find(c => reply.toLowerCase().includes(c.toLowerCase()));
                  if (matched) category = matched;
                }
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
        }
      };

      const workers = [];
      for (let j = 0; j < maxConcurrency; j++) {
        workers.push(worker());
      }
      await Promise.all(workers);
    };

    processQueue();
  }, [activeId]);

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      return next;
    });
  };

  const drawComposition = async (target: JewelryFile, overrideScale?: number, overrideX?: number, overrideY?: number, isPreview: boolean = false): Promise<string | null> => {
    try {
      let mainCropped: HTMLImageElement | HTMLCanvasElement;
      let mainBbox: any;
      let detailCropped: HTMLImageElement | HTMLCanvasElement | null = null;
      let resDetails: any = null;

      const cacheKey = target.id;

      if (isPreview) {
        // FAST PREVIEW: Just load raw image without AI background removal!
        const loadRaw = async (file: File) => {
          const url = URL.createObjectURL(file);
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
          });
          URL.revokeObjectURL(url);
          return img;
        };

        mainCropped = await loadRaw(target.file);
        mainBbox = { x: 0, y: 0, width: mainCropped.width, height: mainCropped.height };

        if (target.detailFile) {
          detailCropped = await loadRaw(target.detailFile);
          resDetails = { bbox: { x: 0, y: 0, width: detailCropped.width, height: detailCropped.height }, originalWidth: detailCropped.width, originalHeight: detailCropped.height };
        }
      } else {
        // GENERATE MODE: Full AI processing
        if (processCache.current.has(cacheKey)) {
          const cached = processCache.current.get(cacheKey)!;
          mainCropped = cached.mainCropped;
          mainBbox = cached.mainBbox;
        } else {
          const resMain = await loadAndProcessImage(target.file, target.category);
          mainCropped = resMain.canvas;
          mainBbox = resMain.bbox;
          processCache.current.set(cacheKey, { mainCropped: mainCropped as HTMLCanvasElement, mainBbox });
        }

        const kembarId = target.kembarId;
        if (target.detailFile) {
          if (kembarId && kembarDetailCache.current.has(kembarId)) {
            const cachedDet = kembarDetailCache.current.get(kembarId)!;
            detailCropped = cachedDet.detailCropped;
            resDetails = cachedDet.resDetails;
          } else {
            resDetails = await loadAndProcessImage(target.detailFile, target.category);
            detailCropped = resDetails.canvas;
            if (kembarId) {
              kembarDetailCache.current.set(kembarId, { detailCropped: detailCropped as HTMLCanvasElement, resDetails });
            }
          }
        }
      }

      const templateImg = await getTemplateImg();
      const logicalW = templateImg.width;
      const logicalH = templateImg.height;

      const scaleDown = isPreview ? 0.35 : 1.0;
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = logicalW * scaleDown;
      finalCanvas.height = logicalH * scaleDown;
      const ctx = finalCanvas.getContext("2d");
      if (!ctx) return null;
      
      ctx.scale(scaleDown, scaleDown);

      // 1. Fill white background (since template is "No Bg")
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, logicalW, logicalH);

      // 2. Draw template base (logos, footer, etc.)
      ctx.drawImage(templateImg, 0, 0);

      // 3. Draw Main Jewelry (Centered)
      const currentScale = (overrideScale !== undefined ? overrideScale : 100) / 100;
      const currentX = overrideX !== undefined ? overrideX : 0;
      const currentY = overrideY !== undefined ? overrideY : 0;

      const isNecklace = target.category === "Necklace";
      // Fit to a safe area: 85% for necklaces (ideal width), 70% for others
      const safeW = logicalW * (isNecklace ? 0.85 : 0.7);
      const safeH = logicalH * (isNecklace ? 0.85 : 0.7);
      const scaleFactor = Math.min(safeW / mainBbox.width, safeH / mainBbox.height) * currentScale;

      const drawW = mainBbox.width * scaleFactor;
      const drawH = mainBbox.height * scaleFactor;
      const cx = (logicalW / 2) - (drawW / 2) + currentX;
      let cy = (logicalH / 2) - (drawH / 2) + currentY;
      
      // If it's a necklace, pin the top edge exactly to the top of the canvas
      if (isNecklace) {
        cy = 0 + currentY; // Y=0 touches the top border precisely
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
        const circleRadius = logicalW * 0.12; // 12% of width
        const circleX = circleRadius + 80;
        const circleY = logicalH - circleRadius - 200; // Above footer

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

        // CENTER LOCK: Always center the crop on the original detail image
        const origW = resDetails.originalWidth;
        const origH = resDetails.originalHeight;
        const absCx = origW / 2;
        const absCy = origH / 2;
        const croppedCx = absCx - resDetails.bbox.x;
        const croppedCy = absCy - resDetails.bbox.y;

        if (target.claspBbox) {
          // Use AI ONLY for sizing (w and h), ignore its cx and cy
          const absW = target.claspBbox.w * origW;
          const absH = target.claspBbox.h * origH;
          // Map to cropped canvas
          const croppedCx = absCx - resDetails.bbox.x;
          const croppedCy = absCy - resDetails.bbox.y;
          
          // Necklaces need larger padding so they don't look overly zoomed in compared to bracelets
          const isNecklace = target.category === "Necklace";
          let size = Math.max(absW, absH) * (isNecklace ? 1.6 : 1.05); 
          
          // Enforce a smaller minimum zoom size (5% of image or 80px) to ALLOW tight zooming
          const minSize = Math.max(origW * 0.05, 80);
          if (size < minSize) {
            size = minSize;
          }

          // Enforce a maximum size to prevent the crop from exceeding the image bounds
          const maxSize = Math.min(origW, origH);
          if (size > maxSize) {
            size = maxSize;
          }

          cropX = croppedCx - size / 2;
          cropY = croppedCy - size / 2;
          cropW = size;
          cropH = size;
        } else {
          // FALLBACK: If AI completely fails
          const isNecklace = target.category === "Necklace";
          let size = Math.max(origW, origH) * (isNecklace ? 0.35 : 0.25);
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

      if (isPreview) {
        return finalCanvas.toDataURL("image/jpeg", 0.6);
      } else {
        return new Promise<string | null>((resolve) => {
          finalCanvas.toBlob(
            (blob) => {
              if (blob) resolve(URL.createObjectURL(blob));
              else resolve(null);
            },
            "image/jpeg",
            0.95
          );
        });
      }
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
    const maxConcurrency = 3;
    let index = 0;
    
    const worker = async () => {
      while (index < targets.length) {
        const target = targets[index++];
        setFiles((prev) => prev.map((f) => f.id === target.id ? { ...f, status: "processing" } : f));
        
        let resultUrl = null;
        let resultBlob = undefined;
        
        resultUrl = await drawComposition(target, target.scale ?? scale, target.posX ?? posX, target.posY ?? posY, false);
        if (resultUrl) {
          try {
            const res = await fetch(resultUrl);
            resultBlob = await res.blob();
          } catch (e) {
             console.error(e);
             resultUrl = null;
          }
        }

        const success = !!resultUrl;
        setFiles((prev) => prev.map((f) => f.id === target.id ? { 
          ...f, 
          status: success ? "done" : "error", 
          resultUrl: success ? resultUrl : null,
          resultBlob: success ? resultBlob : undefined
        } : f));
        
        doneCount++;
        setProgress(Math.round((doneCount / targets.length) * 100));
        setProcessedCount(doneCount);
      }
    };
    
    const workers = [];
    for (let i = 0; i < maxConcurrency; i++) {
      workers.push(worker());
    }
    await Promise.all(workers);
    
    setTimeout(() => setGenerating(false), 400);
  };

  // Preview Updater
  const activeFile = files.find((f) => f.id === activeId) ?? null;
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);

  const renderTimeout = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!activeFile || activeFile.detecting || generating) return;
    setIsRenderingPreview(true);
    if (renderTimeout.current) clearTimeout(renderTimeout.current);
    renderTimeout.current = setTimeout(async () => {
      const currentScale = activeFile.scale ?? scale;
      const currentX = activeFile.posX ?? posX;
      const currentY = activeFile.posY ?? posY;
      const url = await drawComposition(activeFile, currentScale, currentX, currentY, true);
      if (url) setLivePreviewUrl(url);
      setIsRenderingPreview(false);
    }, 150);
  }, [activeFile?.id, activeFile?.scale, activeFile?.posX, activeFile?.posY, scale, posX, posY, generating]);

  const doneFiles = files.filter((f) => f.status === "done" && !f.exported);
  const pendingTargets = files.filter((f) => !f.detecting && f.status !== "done");
  const allReady = pendingTargets.length > 0 && files.every((f) => !f.detecting);

  return (
    <div className="min-h-screen bg-[#F8F9FA]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-8 py-4" style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 24px rgba(229,62,62,0.04), 0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #E53E3E 0%, #FC8181 100%)" }}>
              <Gem size={18} className="text-white" strokeWidth={1.8} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-[15px] tracking-tight text-[#1A1A2E]">Wahyu Redjo</span>
              <span className="text-[10px] font-medium text-[#8A8A9E] tracking-widest uppercase">Studio</span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-gray-200"></div>

          {/* Project Selector */}
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
            <select
              value={activeProjectId || ""}
              onChange={(e) => {
                if (e.target.value === "NEW") setShowProjectModal(true);
                else setActiveProjectId(e.target.value);
              }}
              className="bg-transparent border-none text-[#1A1A2E] text-sm font-semibold outline-none cursor-pointer hover:bg-gray-100 py-1.5 px-2 rounded-md transition-colors appearance-none"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%231A1A2E%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7em top 50%', backgroundSize: '.65em auto', paddingRight: '2.5em' }}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              <option value="NEW" className="font-bold text-[#E53E3E]">+ Create New Project</option>
            </select>
            
            {activeProjectId && projects.length > 0 && (
              <button
                onClick={async () => {
                  if (confirm("Hapus project ini beserta semua filenya?")) {
                    await deleteProject(activeProjectId);
                    const p = await getProjects();
                    setProjects(p);
                    if (p.length === 0) {
                      setActiveProjectId(null);
                      setFiles([]);
                      setShowProjectModal(true);
                    } else {
                      setActiveProjectId(p[p.length - 1].id);
                    }
                  }
                }}
                className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                title="Hapus Project"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            )}
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
            <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} className="relative rounded-2xl transition-all duration-200 overflow-hidden" style={{ background: isDragging ? "rgba(229,62,62,0.05)" : "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: isDragging ? "1.5px dashed #E53E3E" : "1.5px dashed rgba(0,0,0,0.13)", boxShadow: isDragging ? "0 0 0 4px rgba(229,62,62,0.08), 0 4px 24px rgba(0,0,0,0.05)" : "0 2px 12px rgba(0,0,0,0.04)" }}>
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

            <div className="relative rounded-3xl overflow-hidden flex items-center justify-center" style={{ aspectRatio: "1 / 1", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
              {livePreviewUrl || activeFile?.resultUrl ? (
                <img src={(livePreviewUrl || activeFile?.resultUrl)!} alt="Live Preview" className="w-full h-full object-contain" />
              ) : activeFile && !activeFile.detecting ? (
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-[#E53E3E]/30 border-t-[#E53E3E] rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm font-semibold text-[#8A8A9E]">Memuat preview...</p>
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
                  <div className="flex items-center gap-2">
                    <PackageOpen size={15} className="text-[#E53E3E]" strokeWidth={2} />
                    <span className="text-sm font-bold text-[#1A1A2E]">Hasil Proses</span>
                    <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "rgba(229,62,62,0.08)", color: "#E53E3E" }}>
                      {files.filter(f => f.status === "done").length} selesai 
                      {files.some(f => f.exported) ? ` (${files.filter(f => f.exported).length} exported)` : ""}
                    </span>
                  </div>
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
                <Slider label="Scale" value={activeFile?.scale ?? 100} min={40} max={320} step={2} unit="%" icon={<ZoomIn size={14} strokeWidth={2.2} />} onChange={(val) => {
                  if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, scale: val } : f));
                  else setScale(val);
                }} />
                <Slider label="Position X" value={activeFile?.posX ?? 0} min={-400} max={400} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={(val) => {
                  if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, posX: val } : f));
                  else setPosX(val);
                }} />
                <Slider label="Position Y" value={activeFile?.posY ?? 0} min={-400} max={400} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={(val) => {
                  if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, posY: val } : f));
                  else setPosY(val);
                }} />
              </div>
              <button onClick={() => { 
                if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, scale: undefined, posX: undefined, posY: undefined } : f));
                else { setScale(100); setPosX(0); setPosY(0); }
              }} className="flex items-center gap-2 text-xs font-medium text-[#8A8A9E] hover:text-[#E53E3E] transition-colors self-start"><RotateCcw size={12} strokeWidth={2.2} /> Reset ke default</button>
              <div className="h-px bg-[#EDEDF3]" />
              {(generating || processedCount > 0) && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs"><span className="font-semibold text-[#1A1A2E]">{generating ? "Memproses AI…" : "Selesai"}</span><span className="font-bold tabular-nums" style={{ color: "#E53E3E" }}>{processedCount} / {generating ? files.filter(f => f.status === "queued" || f.status === "processing").length + processedCount : pendingTargets.length}</span></div>
                  <div className="relative h-2 rounded-full bg-[#EDEDF3] overflow-hidden"><div className="absolute top-0 left-0 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: "linear-gradient(to right, #E53E3E, #FC8181)" }} /></div>
                </div>
              )}
              <button onClick={handleGenerate} disabled={generating || !allReady || pendingTargets.length === 0} className="relative w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-white font-semibold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "linear-gradient(135deg, #E53E3E 0%, #FC8181 100%)", boxShadow: allReady && pendingTargets.length > 0 && !generating ? "0 8px 32px rgba(229,62,62,0.4), 0 2px 8px rgba(229,62,62,0.2)" : "none" }}>
                {generating ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /><span>Memproses foto…</span></> : <><Sparkles size={16} strokeWidth={2.2} /><span>Generate {pendingTargets.length > 0 ? `${pendingTargets.length} Foto` : "Foto"}</span></>}
              </button>
              <button disabled={doneFiles.length === 0} onClick={() => { 
                doneFiles.forEach((file, index) => { 
                  const url = file.resultUrl; 
                  if (url) { 
                    setTimeout(() => { 
                      const a = document.createElement("a"); 
                      a.href = url; 
                      a.download = `WR_${file.baseName}.jpg`; 
                      document.body.appendChild(a); 
                      a.click(); 
                      document.body.removeChild(a); 
                    }, index * 500); 
                  } 
                });
                setFiles(prev => prev.map(f => doneFiles.some(d => d.id === f.id) ? { ...f, exported: true } : f));
              }} className="relative w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: doneFiles.length > 0 ? "rgba(56,161,105,0.08)" : "rgba(0,0,0,0.03)", border: doneFiles.length > 0 ? "1.5px solid rgba(56,161,105,0.3)" : "1.5px solid rgba(0,0,0,0.08)", color: doneFiles.length > 0 ? "#38A169" : "#8A8A9E", boxShadow: doneFiles.length > 0 ? "0 4px 16px rgba(56,161,105,0.12)" : "none" }}>
                <Download size={15} strokeWidth={2.2} /><span>Export 1-1 ({doneFiles.length})</span>
              </button>
              <button disabled={doneFiles.length === 0} onClick={async () => {
                const zip = new JSZip();
                for (const file of doneFiles) {
                  if (file.resultUrl) {
                    try {
                      const res = await fetch(file.resultUrl);
                      const blob = await res.blob();
                      zip.file(`WR_${file.baseName}.jpg`, blob);
                    } catch (err) {}
                  }
                }
                const content = await zip.generateAsync({ type: "blob" });
                const url = URL.createObjectURL(content);
                const a = document.createElement("a");
                a.href = url;
                a.download = `WR_Export_${new Date().getTime()}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setFiles(prev => prev.map(f => doneFiles.some(d => d.id === f.id) ? { ...f, exported: true } : f));
              }} className="relative w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: doneFiles.length > 0 ? "#38A169" : "rgba(0,0,0,0.03)", border: doneFiles.length > 0 ? "1.5px solid #38A169" : "1.5px solid rgba(0,0,0,0.08)", color: doneFiles.length > 0 ? "#FFF" : "#8A8A9E", boxShadow: doneFiles.length > 0 ? "0 4px 16px rgba(56,161,105,0.3)" : "none" }}>
                <Archive size={15} strokeWidth={2.2} /><span>Export ZIP ({doneFiles.length})</span>
              </button>
            </div>
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(0,0,0,0.06)" }}><p className="text-xs font-semibold text-[#1A1A2E] mb-3">Tips</p><ul className="flex flex-col gap-2">{["Pilih folder untuk upload semua foto sekaligus", "AI otomatis menentukan kategori & memisahkan foto detail", "Background akan dihapus secara otomatis", "Export tersedia setelah 1 foto selesai diproses"].map((tip) => (<li key={tip} className="flex items-start gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#E53E3E]/40 flex-shrink-0" /><span className="text-xs text-[#8A8A9E] leading-relaxed">{tip}</span></li>))}</ul></div>
          </div>
        </div>
      </main>}

      {showProjectModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mb-4">
                <FolderOpen size={24} strokeWidth={2} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Create New Project</h2>
              <p className="text-sm text-gray-500 mb-6">Start a new batch of jewelry photos. Your work will be automatically saved locally.</p>
              
              <input 
                type="text" 
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g., Cincin Berlian Batch 1"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all mb-6"
                autoFocus
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && newProjectName.trim()) {
                    const p = await createProject(newProjectName.trim());
                    setProjects(prev => [...prev, p]);
                    setActiveProjectId(p.id);
                    setNewProjectName("");
                    setShowProjectModal(false);
                  }
                }}
              />

              <div className="flex gap-3">
                {projects.length > 0 && (
                  <button 
                    onClick={() => setShowProjectModal(false)}
                    className="flex-1 bg-white border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  disabled={!newProjectName.trim()}
                  onClick={async () => {
                    if (newProjectName.trim()) {
                      const p = await createProject(newProjectName.trim());
                      setProjects(prev => [...prev, p]);
                      setActiveProjectId(p.id);
                      setNewProjectName("");
                      setShowProjectModal(false);
                    }
                  }}
                  className="flex-1 bg-red-500 text-white font-semibold py-3 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
