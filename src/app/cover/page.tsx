"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, Gem, LogOut, Download, Sparkles, Move, ZoomIn, X,
  CheckCircle2, RotateCcw, FolderOpen, Cpu, ChevronRight,
  ImageIcon, Clock, AlertCircle, Eye, PackageOpen, Settings,
  User, Lock, Eye as EyeIcon, EyeOff, Save, ShieldCheck, Plus, Archive
, FolderDown, Sun, Contrast, Droplet, Play, Pause, Square, TextCursorInput, Layers} from "lucide-react";
import JSZip from "jszip";
import { parseFilename, loadAndProcessImage, calculateAutoLighting, preloadBgModel } from "@/lib/imageProcessor";
import { parseDetailsTxt, normalizeFileKey } from "@/lib/coverParser";
import type { EtalaseDetail } from "@/lib/coverParser";
import { detectCoverKind, chunkIntoCovers } from "@/lib/coverLayout";
import { detectKindByVision } from "@/lib/coverKindVision";
import type { CoverKind } from "@/lib/coverLayout";
import { renderCoverBlob } from "@/lib/coverComposer";
import Link from "next/link";
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

type FileStatus = "queued" | "processing" | "done" | "error";
interface JewelryFile {
  id: string;
  baseName: string;
  name: string;
  karat: string;
  mp: string;
  file: File;
  url: string;
  category: string | null;
  detecting: boolean;
  status: FileStatus;
  resultUrl: string | null;
  resultBlob?: Blob;
  kembarId?: string | null;
  exported?: boolean;
  scale?: number;
  posX?: number;
  posY?: number;
  autoAdjust?: boolean;
  brightness?: number;
  contrast?: number;
  saturate?: number;
  folderName?: string;
}

interface CoverResult { folderName: string; index: number; url: string; blob: Blob; fileName: string; kind: string; }

const AI_CATEGORIES = ["Ring","Necklace","Earrings","Bracelet","Brooch","Pendant"];

const Slider = React.memo(function Slider({ label, icon: Icon, value, min, max, step, onChange, unit="" }: any) {
  const [draft, setDraft] = React.useState(String(value));
  React.useEffect(()=>{ setDraft(String(value)); },[value]);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#1A1A2E]"><Icon size={12} />{label}</span>
        <input type="number" min={min} max={max} step={step} value={draft} onChange={(e)=>setDraft(e.target.value)} onBlur={()=>{ let n=Number(draft); if(isNaN(n)) n=value; n=Math.min(max,Math.max(min,n)); setDraft(String(n)); onChange(n); }} onKeyDown={(e:any)=>{ if(e.key==="Enter"){ let n=Number(draft); if(!isNaN(n)){ n=Math.min(max,Math.max(min,n)); onChange(n); (e.target as HTMLInputElement).blur(); }}}} className="w-20 text-right text-xs font-bold text-[#E53E3E] bg-white border border-[#E53E3E]/20 rounded-md px-1.5 py-0.5 outline-none focus:border-[#E53E3E]" />{unit? <span className="text-[10px] text-[#8A8A9E] ml-1">{unit}</span>:null}
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e)=>{ const n=Number(e.target.value); setDraft(String(n)); onChange(n); }} className="w-full accent-[#E53E3E] h-1" />
    </div>
  );
});

export default function CoverPage(){
  const [files, setFiles] = useState<JewelryFile[]>([]);
  const [activeId, setActiveId] = useState<string|null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [globalAutoAdjust, setGlobalAutoAdjust] = useState(true);
  const [globalBrightness, setGlobalBrightness] = useState(100);
  const [globalContrast, setGlobalContrast] = useState(100);
  const [globalSaturate, setGlobalSaturate] = useState(100);
  const [scale, setScale] = useState(100);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generateState, setGenerateState] = useState<"idle"|"generating"|"paused">("idle");
  const [progress, setProgress] = useState(0);
  const [etaText, setEtaText] = useState<string | null>(null);
  const etaRef = useRef<number | null>(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [livePreviewUrl, setLivePreviewUrl] = useState<string|null>(null);
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);

  const [etalaseDetails, setEtalaseDetails] = useState<Map<string,EtalaseDetail>>(new Map());
  const [coverResults, setCoverResults] = useState<CoverResult[]>([]);
  const [mainHandle, setMainHandle] = useState<any>(null);
  const [kategoriKinds, setKategoriKinds] = useState<Map<string,{kind:CoverKind,by:string}>>(new Map());
  const [coverGenerating, setCoverGenerating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(()=>{ try{ preloadBgModel(); }catch{} },[]);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const processCache = useRef(new Map<string, { mainCropped: HTMLCanvasElement; mainBbox: any; lighting?: {brightness:number;contrast:number;saturate:number} }>());
  const renderTimeout = useRef<NodeJS.Timeout|null>(null);
  const stopSignal = useRef(false);
  const pauseSignal = useRef(false);

  const activeFile = files.find(f=>f.id===activeId) ?? null;

    const folderToCatKind = (folder:string): {cat:string;kind:string|null}|null => {
    const up=(folder||"").toUpperCase();
    let cat = "Ring";
    let kind: string | null = null;
    if(up.includes("GELANG")){
      cat = "Bracelet";
      if(up.includes("RANTAI") || up.includes("EXTENSION") || up.includes("BELAH")) kind = "single";
      else if(up.includes("BANGLE") || up.includes("PLAT") || up.includes("KAKI")) kind = "grid4";
    } else if(up.includes("KALUNG")){
      cat = "Necklace";
      if(up.includes("RANTAI")) kind = "single";
    } else if(up.includes("ANTING")){
      cat = "Earrings";
      if(up.includes("TUSUK") || up.includes("GANTUNG")) kind = "grid6";
    } else if(up.includes("CINCIN") || up.includes("RING")){
      cat = "Ring";
      kind = "grid6";
    } else if(up.includes("LIONTIN") || up.includes("PENDANT")){
      cat = "Pendant";
      kind = "grid6";
    } else if(up.includes("BROS") || up.includes("BROOCH")){
      cat = "Brooch";
      kind = "grid6";
    } else {
      return null;
    }
    return { cat, kind };
  };
  const handleOpenMainFolder = async ()=>{
    try{
      if(!("showDirectoryPicker" in window)){ folderInputRef.current?.click(); return; }
      const h:any = await (window as any).showDirectoryPicker({mode:"readwrite"});
      setMainHandle(h);
      // enumerate subfolders
      const groups: Map<string, File[]> = new Map();
      const txts: Map<string, File> = new Map();
      for await (const [name, entry] of h.entries()){
        if(entry.kind==="directory"){
          const sub:any = entry;
          for await (const [fname, fentry] of sub.entries()){
            if(fentry.kind==="file"){
              const file:File = await (fentry as any).getFile();
              Object.defineProperty(file,"webkitRelativePath",{value: name+"/"+file.name, writable:false});
              if(/\.txt$/i.test(file.name)) txts.set(name, file);
              else if(file.type.startsWith("image/")){ if(!groups.has(name)) groups.set(name,[]); groups.get(name)!.push(file); }
            }
          }
        }
      }
      const allFiles: File[] = [];
      txts.forEach(f=> allFiles.push(f));
      groups.forEach(arr=> arr.forEach(f=> allFiles.push(f)));
      // also catch root txt/photos
      processFiles(allFiles);
      // vision per kategori parallel 2
      const folderNames = Array.from(groups.keys());
      let idx=0;
      const worker = async()=>{
        while(idx < folderNames.length){
          const fn = folderNames[idx++];
          const sample = groups.get(fn)?.[0];
          if(!sample) continue;
          const res = await detectKindByVision(sample, fn);
          setKategoriKinds(prev=>{ const n=new Map(prev); n.set(fn,{kind:res.kind,by:res.by}); return n; });
        }
      };
      // also auto-set kategoriKinds from folder name map for immediate correct cover kind, vision as override only if needed
      folderNames.forEach(fn=>{
        const m=folderToCatKind(fn);
        if(m) setKategoriKinds(prev=>{ const n=new Map(prev); if(!n.has(fn)) n.set(fn,{kind:m.kind as any, by:'keyword'}); return n; });
      });
      const ws = [worker(), worker()];
      await Promise.all(ws);
    }catch(e:any){
      if(e?.name!=="AbortError") console.error(e);
    }
  };
  const handleDrop = async (e: React.DragEvent) =>{
    e.preventDefault(); setIsDragging(false);
    const items = e.dataTransfer.items;
    if(!items) return;
    const files: File[] = [];
    const traverse = (entry:any, path="")=> new Promise<void>((resolve)=>{
      if(entry.isFile){
        entry.file((file:File)=>{
          Object.defineProperty(file,'webkitRelativePath',{value:path+file.name,writable:false});
          files.push(file); resolve();
        });
      } else if(entry.isDirectory){
        const dirReader = entry.createReader();
        dirReader.readEntries((entries:any[])=>{
          Promise.all(entries.map((en:any)=>traverse(en, path+entry.name+"/"))).then(()=>resolve());
        });
      } else resolve();
    });
    const promises:Promise<void>[]=[];
    for(let i=0;i<items.length;i++){
      const entry = items[i].webkitGetAsEntry();
      if(entry) promises.push(traverse(entry));
    }
    await Promise.all(promises);
    processFiles(files);
  };

  const processFiles = useCallback((rawFiles: FileList|File[])=>{
    const allFiles = Array.from(rawFiles);
    const txtFiles = allFiles.filter((f:any)=>/\.txt$/i.test(f.name));
    if(txtFiles.length>0){
      txtFiles.forEach((txtFile:any)=>{
        const relPath = txtFile.webkitRelativePath || "";
        const parts = relPath ? relPath.split("/") : [txtFile.name];
        const folderName = parts.length>1 ? parts[parts.length-2] : (txtFile.name.replace(/\.txt$/i,""));
        txtFile.text().then((content:string)=>{
          const detail = parseDetailsTxt(content);
          // live update files karat/mp so list does not stay 16K MP16
          setFiles(prev=> prev.map(f=> f.folderName===folderName ? {...f, karat: detail.karat||f.karat, mp: detail.nampan||f.mp} : f));
          setEtalaseDetails(prev=>{
            const next=new Map(prev);
            next.set(folderName, detail);
            // also try without extension key variations
            return next;
          });
        });
      });
    }
    const imageFiles = allFiles.filter((f:any)=>f.type.startsWith("image/"));
    if(!imageFiles.length) return;
    const fileMap=new Map<string,{main?:File;baseName?:string}>();
    imageFiles.forEach(f=>{
      const parsed=parseFilename(f.name);
      if(!fileMap.has(parsed.groupId)){
        fileMap.set(parsed.groupId,{main:f, baseName:parsed.baseName});
      }
    });
    const newEntries:JewelryFile[]=[];
    fileMap.forEach((data)=>{
      if(data.main){
        const parsed=parseFilename(data.main.name);
        const relPath=(data.main as any).webkitRelativePath||"";
        const parts=relPath.split("/");
        const folderName=parts.length>1?parts[parts.length-2]:"";
        newEntries.push({
          id: `${data.baseName}-${Date.now()}-${Math.random()}`,
          baseName: data.baseName||parsed.baseName,
          name: data.main.name,
          karat: parsed.karat,
          mp: parsed.mp,
          file: data.main,
          url: URL.createObjectURL(data.main),
          category: parsed.category||null,
          detecting: true,
          status:"queued",
          resultUrl:null,
          folderName,
          kembarId:null,
        });
      }
    });
    if(!newEntries.length) return;
    setFiles(prev=>{
      const next=[...prev,...newEntries];
      if(!activeId && next.length>0) setActiveId(next[0].id);
      return next;
    });
    const compressImageForAI=(file:File):Promise<string>=> new Promise((resolve,reject)=>{
      const img=new Image();
      const reader=new FileReader();
      reader.onload=(e)=>{
        img.onload=()=>{
          const canvas=document.createElement("canvas");
          const MAX_DIM=512;
          let {width,height}=img;
          if(width>height && width>MAX_DIM){ height*=MAX_DIM/width; width=MAX_DIM; }
          else if(height>MAX_DIM){ width*=MAX_DIM/height; height=MAX_DIM; }
          canvas.width=width; canvas.height=height;
          const ctx=canvas.getContext("2d");
          if(ctx) ctx.drawImage(img,0,0,width,height);
          resolve(canvas.toDataURL("image/jpeg",0.7));
        };
        img.onerror=reject;
        img.src=e.target?.result as string;
      };
      reader.onerror=reject;
      reader.readAsDataURL(file);
    });

  const processQueue=async()=>{
        const hw = (typeof navigator !== "undefined" && (navigator as any).hardwareConcurrency) || 4;
  const maxConcurrency = Math.min(3, Math.max(1, Math.floor(hw/4)+1));
      let i=0;
      const worker=async()=>{
        while(i<newEntries.length){
          const entry=newEntries[i++];
          try{
            let category=entry.category;
            const mapped = folderToCatKind(entry.folderName||"");
            if(mapped){ category = mapped.cat; }
            if(!category){
              const base64=await compressImageForAI(entry.file);
              const prompt="LIHAT REFERENSI: ANTING GANTUNG/TUSUK=anting, CINCIN=cincin bulat kecil, GELANG BANGLE=gelang kaku tebal, GELANG RANTAI=rantai banyak sambung memanjang di tray, LIONTIN=liontin. Klasifikasi KE SATU KATA: Ring, Necklace, Earrings, Bracelet, Brooch, Pendant. GELANG EXTENSION / BELAH TENGAH yang fotonya berisi 3-5 gelang memanjang berjejer di tray adalah GELANG RANTAI = Bracelet (BUKAN grid4). Jika BANYAK GELANG BERJEJER MEMANJANG=Bracelet rantai. Jawab HANYA satu kata.";
              const response=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt, imageBase64:base64, visionUrl:"https://9router.naelvi.com/v1", visionKey:"sk-9router-naelvi-master", visionModel:"ag/gemini-3.7-flash-medium"})});
              if(response.ok){
                const data=await response.json();
                const reply=data.message?.trim()||"";
                console.log("[vision per-file]", entry.file.name, "reply=", reply, "matched=", AI_CATEGORIES.find(c=>reply.toLowerCase().includes(c.toLowerCase())));
                const matched=AI_CATEGORIES.find(c=>reply.toLowerCase().includes(c.toLowerCase()));
                if(matched) category=matched;
              }
            }
            if(!category){
              const fnUp = (entry.folderName||"").toUpperCase();
              if(fnUp.includes("GELANG")) category="Bracelet";
              else if(fnUp.includes("KALUNG")) category="Necklace";
              else if(fnUp.includes("ANTING")) category="Earrings";
              else if(fnUp.includes("LIONTIN")||fnUp.includes("PENDANT")) category="Pendant";
              else if(fnUp.includes("BROS")||fnUp.includes("BROOCH")) category="Brooch";
              else category="Ring";
            }
            setFiles(prev=>prev.map(f=>f.id===entry.id?{...f, category, detecting:false}:f));
          }catch(e){
            const fnUp = (entry.folderName||"").toUpperCase();
            let cat="Ring";
            if(fnUp.includes("GELANG")) cat="Bracelet";
            else if(fnUp.includes("KALUNG")) cat="Necklace";
            else if(fnUp.includes("ANTING")) cat="Earrings";
            else if(fnUp.includes("LIONTIN")||fnUp.includes("PENDANT")) cat="Pendant";
            else if(fnUp.includes("BROS")||fnUp.includes("BROOCH")) cat="Brooch";
            setFiles(prev=>prev.map(f=>f.id===entry.id?{...f, category:cat, detecting:false}:f));
          }
        }
      };
      const workers=[];
      for(let j=0;j<maxConcurrency;j++) workers.push(worker());
      await Promise.all(workers);
    };
    processQueue();
  },[activeId]);

    const removeFile=(id:string)=>{
    const victim = files.find(f=>f.id===id);
    if(victim){ try{ URL.revokeObjectURL(victim.url);}catch{} try{ if(victim.resultUrl) URL.revokeObjectURL(victim.resultUrl);}catch{} processCache.current.delete(id); }
    setFiles(prev=>{
      const next=prev.filter(f=>f.id!==id);
      if(activeId===id) setActiveId(next[0]?.id??null);
      return next;
    });
    setCoverResults(prev=>prev.filter(c=>true)); // keep covers but could filter
  };

  const drawVariant = async (target:JewelryFile, overrideScale?:number, overrideX?:number, overrideY?:number, isPreview=false):Promise<string|null>=>{
    try{
      let mainCropped:HTMLCanvasElement;
      let mainBbox:any;
      const cacheKey = (target as any)._rantaiBaseId || target.id;
      if(processCache.current.has(cacheKey)){
        const cached=processCache.current.get(cacheKey)!;
        mainCropped=cached.mainCropped;
        mainBbox=cached.mainBbox;
      } else {
        const isRantaiTarget = isRantaiFolder(target.folderName||"") ||
          kategoriKinds.get(target.folderName||"")?.kind==="single" ||
          (target as any).rantaiIndex !== undefined;
        const keepTray = isRantaiTarget;
        let effCategory = target.category;
        if(isRantaiTarget){
          const up=(target.folderName||"").toUpperCase();
          if(up.includes("KALUNG")) effCategory="Necklace"; else effCategory="Bracelet";
        }
        const resMain=await loadAndProcessImage(target.file, effCategory, keepTray);
        mainCropped=resMain.canvas;
        mainBbox=resMain.bbox;
        processCache.current.set(cacheKey,{mainCropped, mainBbox, lighting: calculateAutoLighting(mainCropped)});
      }
      const templateImg=await getTemplateImg();
      const logicalW=templateImg.width;
      const logicalH=templateImg.height;
      const scaleDown=isPreview?0.25:1.0;
      const finalCanvas=document.createElement("canvas");
      finalCanvas.width=logicalW*scaleDown;
      finalCanvas.height=logicalH*scaleDown;
      const ctx=finalCanvas.getContext("2d");
      if(!ctx) return null;
      ctx.scale(scaleDown, scaleDown);
      ctx.fillStyle="#ffffff";
      ctx.fillRect(0,0,logicalW,logicalH);
      ctx.drawImage(templateImg,0,0);
      const currentScale=(overrideScale!==undefined?overrideScale:100)/100;
      const currentX=overrideX!==undefined?overrideX:0;
      const currentY=overrideY!==undefined?overrideY:0;
      const isNecklace=target.category==="Necklace";
      const isRantaiLike = (kategoriKinds.get(target.folderName||"")?.kind==="single") || isRantaiFolder(target.folderName||"");
      const safeW=logicalW*(isNecklace?0.85:(isRantaiLike?0.82:0.7));
      const safeH=logicalH*(isNecklace?0.85:(isRantaiLike?0.65:0.7)); // rantai: lebih lebar, lebih pendek biar tidak kepotong atas-bawah
      const scaleFactor=Math.min(safeW/mainBbox.width, safeH/mainBbox.height)*currentScale;
      const drawW=mainBbox.width*scaleFactor;
      const drawH=mainBbox.height*scaleFactor;
      const cx=(logicalW/2)-(drawW/2)+currentX;
      let cy=(logicalH/2)-(drawH/2)+currentY;
      if(isNecklace) cy=0+currentY;
      let filterStr="none";
      try{
        let autoLighting:{brightness:number;contrast:number;saturate:number};
        const cachedLighting = processCache.current.get(cacheKey)?.lighting;
        if(cachedLighting && (target.autoAdjust??globalAutoAdjust)){ autoLighting=cachedLighting; } else {
          autoLighting=(target.autoAdjust??globalAutoAdjust)?calculateAutoLighting(mainCropped):{brightness:100,contrast:100,saturate:100};
          const prev=processCache.current.get(cacheKey);
          if(prev && (target.autoAdjust??globalAutoAdjust)) processCache.current.set(cacheKey,{...prev, lighting:autoLighting});
        }
        const manualB=(target.brightness??globalBrightness);
        const manualC=(target.contrast??globalContrast);
        const manualS=(target.saturate??globalSaturate);
        const finalB=Math.max(0,autoLighting.brightness+(manualB-100))/100;
        const finalC=Math.max(0,autoLighting.contrast+(manualC-100))/100;
        const finalS=Math.max(0,autoLighting.saturate+(manualS-100))/100;
        filterStr=`brightness(${finalB}) contrast(${finalC}) saturate(${finalS})`;
      }catch(e){}
      const rIdx=(target as any).rantaiIndex;
      const rTot=(target as any).rantaiTotal;

      if(rIdx!==undefined && rTot && rTot > 1 && rIdx>=0){
        // Bokeh Focus Effect: All other jewelry items blurred, only the active item is sharp in focus!
        const blurCanvas = document.createElement("canvas");
        blurCanvas.width = mainCropped.width;
        blurCanvas.height = mainCropped.height;
        const bCtx = blurCanvas.getContext("2d")!;
        bCtx.filter = "blur(18px)";
        bCtx.drawImage(mainCropped, 0, 0);

        // 1. Draw blurred image over entire jewelry area
        ctx.save();
        ctx.filter = filterStr;
        ctx.shadowColor = "rgba(0,0,0,0.1)";
        ctx.shadowBlur = isPreview ? 0 : 12;
        ctx.shadowOffsetY = 10;
        ctx.drawImage(blurCanvas, cx, cy, drawW, drawH);
        ctx.restore();

        // 2. Reveal the active jewelry item in 100% sharp crisp focus
        const segW = drawW / rTot;
        const padLeft = rIdx === 0 ? 0 : segW * 0.12;
        const padRight = rIdx === rTot - 1 ? 0 : segW * 0.12;
        const activeX = cx + (rIdx * segW) - padLeft;
        const activeW = segW + padLeft + padRight;

        ctx.save();
        ctx.beginPath();
        const clipX = Math.max(cx, activeX);
        const clipW = Math.min(cx + drawW - clipX, activeW);
        const clipY = cy - 10;
        const clipH = drawH + 20;
        if (typeof (ctx as any).roundRect === "function") {
          (ctx as any).roundRect(clipX, clipY, clipW, clipH, 16);
        } else {
          ctx.rect(clipX, clipY, clipW, clipH);
        }
        ctx.clip();
        ctx.filter = filterStr;
        ctx.drawImage(mainCropped, cx, cy, drawW, drawH);
        ctx.restore();
      } else {
        // Normal single jewelry: draw sharp original image
        ctx.save();
        ctx.filter = filterStr;
        ctx.shadowColor = "rgba(0,0,0,0.1)";
        ctx.shadowBlur = isPreview ? 0 : 12;
        ctx.shadowOffsetY = 10;
        ctx.drawImage(mainCropped, cx, cy, drawW, drawH);
        ctx.restore();
      }

      // Folder-level kadar/nampan from txt (always override if folder has txt), item-level berat/size via txtItem match
      let karatText=target.karat;
      let nampanText=target.mp;
      if(target.folderName){
        const d=etalaseDetails.get(target.folderName);
        if(d){
          if(d.karat) karatText=d.karat;
          if(d.nampan) nampanText=d.nampan;
        }
      }
      let txtItem:any=null;
      if(target.folderName){
        const detail=etalaseDetails.get(target.folderName)||null;
        if(detail){
          const rIdx = (target as any).rantaiIndex;
          if(rIdx !== undefined && rIdx >= 0){
            const itemsArr = Array.from(detail.items.values());
            if(itemsArr[rIdx]) txtItem = itemsArr[rIdx];
          }
          if(!txtItem){
            const key=normalizeFileKey(target.baseName);
            txtItem=detail.items.get(key)||null;
            if(!txtItem){
              for(const v of detail.items.values()){
                if(normalizeFileKey(v.code)===key || normalizeFileKey(v.fileName).includes(key) || key.includes(normalizeFileKey(v.code))){
                  txtItem=v; break;
                }
              }
            }
          }
        }
      }

      // Draw berat/size pill near top safe area above jewelry
      if(txtItem){
        const berat = txtItem.berat||"";
        const size = txtItem.size||"";
        const label = `${berat}${size?` • Size ${size}`:""}`;
        // pill background
        ctx.font="600 28px Inter, sans-serif";
        const metrics=ctx.measureText(label);
        const padX=18; const padY=10;
        const pillW=metrics.width+padX*2;
        const pillH=40;
        const pillX=(logicalW-pillW)/2;
        const pillY=122; // near top
        ctx.fillStyle="rgba(26,26,46,0.88)";
        // rounded rect
        const r=12;
        ctx.beginPath();
        ctx.moveTo(pillX+r, pillY);
        ctx.lineTo(pillX+pillW-r, pillY);
        ctx.quadraticCurveTo(pillX+pillW, pillY, pillX+pillW, pillY+r);
        ctx.lineTo(pillX+pillW, pillY+pillH-r);
        ctx.quadraticCurveTo(pillX+pillW, pillY+pillH, pillX+pillW-r, pillY+pillH);
        ctx.lineTo(pillX+r, pillY+pillH);
        ctx.quadraticCurveTo(pillX, pillY+pillH, pillX, pillY+pillH-r);
        ctx.lineTo(pillX, pillY+r);
        ctx.quadraticCurveTo(pillX, pillY, pillX+r, pillY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle="#ffffff";
        ctx.textAlign="center";
        ctx.textBaseline="middle";
        ctx.fillText(label, logicalW/2, pillY+pillH/2+1);
      }

      ctx.font="600 45px Lora, serif";
      ctx.fillStyle="#ec1e24";
      ctx.textAlign="left";
      ctx.textBaseline="middle";
      ctx.fillText(nampanText,90,1155);

      const karatCx=740;
      const karatCy=1092;
      ctx.font="600 72px Lora, serif";
      ctx.fillStyle="#ffffff";
      ctx.textAlign="center";
      ctx.textBaseline="middle";
      ctx.fillText(karatText,karatCx,karatCy);

      if(isPreview){
        return finalCanvas.toDataURL("image/jpeg",0.5);
      } else {
        return new Promise<string|null>((resolve)=>{
          finalCanvas.toBlob((blob)=>{
            if(blob) resolve(URL.createObjectURL(blob));
            else resolve(null);
          },"image/jpeg",0.95);
        });
      }
    }catch(err){
      console.error(err);
      return null;
    }
  };

  const isRantaiFolder = (f: string)=>{
    const up=(f||"").toUpperCase();
    return up.includes("RANTAI") || up.includes("EXTENSION");
  };
  const handleGenerate = async ()=>{
    if(generateState==="paused"){ pauseSignal.current=false; setGenerateState("generating"); return; }
    // 1 foto -> N varian HANYA jika jumlah foto dalam folder lebih sedikit dari jumlah item txt (misal 1 foto isi 4 gelang)
    let currentFiles = [...files];
    let hasExpanded = false;
    const expandedList: JewelryFile[] = [];

    for(const f of currentFiles){
      const folderPhotos = currentFiles.filter(cf => (cf.folderName || "") === (f.folderName || "") && !cf.id.includes("-rantai-"));
      const det = etalaseDetails.get(f.folderName||"");
      let n = det?.items.size || 0;
      if(!n && isRantaiFolder(f.folderName||"")){
        const txtNFallback = Array.from(etalaseDetails.values()).reduce((a,v)=> Math.max(a, v.items.size), 0);
        if(txtNFallback>1) n=txtNFallback;
      }

      // Syarat multi-item: foto dalam folder < jumlah item di txt (contoh: 1 foto tapi txt ada 4 item)
      const isMultiItem = n > 1 && folderPhotos.length < n && (
        isRantaiFolder(f.folderName||"") ||
        (kategoriKinds.get(f.folderName||"")?.kind==="single") ||
        (f.category==="Bracelet" && folderPhotos.length === 1)
      );

      if(isMultiItem && !f.id.includes("-rantai-")){
        hasExpanded = true;
        const ext = f.name.includes(".") ? f.name.slice(f.name.lastIndexOf(".")) : ".jpg";
        const rawBase = f.name.replace(/\.[^/.]+$/, "");
        for(let i=0; i<n; i++){
          expandedList.push({
            ...f,
            id: `${f.id}-rantai-${i}`,
            baseName: `${f.baseName} (${i+1}/${n})`,
            name: `${rawBase}_${i+1}${ext}`,
            status: "queued",
            resultUrl: null,
            resultBlob: undefined,
            rantaiIndex: i,
            rantaiTotal: n,
            _rantaiBaseId: f.id,
          } as any);
        }
      } else {
        expandedList.push(f);
      }
    }

    if(hasExpanded){
      currentFiles = expandedList;
      setFiles(expandedList);
    }

    const targets = currentFiles.filter(f=>!f.detecting && f.status!=="done");
    if(!targets.length || generating) return;
    setGenerating(true); setGenerateState("generating"); stopSignal.current=false; pauseSignal.current=false; setProgress(0); setProcessedCount(0); setEtaText(null); etaRef.current = Date.now();
    setFiles(prev=>prev.map(f=>{ const isT = targets.find(t=>t.id===f.id); return isT?{...f,status:"queued",resultUrl:null,exported:false}:f; }));
    let doneCount=0;
    const hw2 = (typeof navigator !== "undefined" && (navigator as any).hardwareConcurrency) || 4;
    const maxConcurrency = Math.min(3, Math.max(1, Math.floor(hw2/4)+1));
    let index=0;
    const worker=async()=>{
      while(index<targets.length){
        if(stopSignal.current) break;
        while(pauseSignal.current){
          if(stopSignal.current) break;
          await new Promise(r=>setTimeout(r,200));
        }
        if(stopSignal.current) break;
        const target=targets[index++];
        setFiles(prev=>prev.map(f=>f.id===target.id?{...f,status:"processing"}:f));
        let resultUrl=null;
        let resultBlob:Blob|undefined=undefined;
        resultUrl=await drawVariant(target, target.scale??scale, target.posX??posX, target.posY??posY, false);
        if(resultUrl){
          try{
            const res=await fetch(resultUrl);
            resultBlob=await res.blob();
          }catch(e){ resultUrl=null; }
        }
        if(stopSignal.current) break;
        const success=!!resultUrl;
        setFiles(prev=>prev.map(f=>f.id===target.id?{...f,status: success?"done":"error",resultUrl: success?resultUrl:null,resultBlob: success?resultBlob:undefined,exported:false}:f));
        doneCount++;
        setProgress(Math.round((doneCount/targets.length)*100));
        if(etaRef.current!=null && doneCount>0){
          const elapsed = Date.now()-etaRef.current;
          const avg = elapsed/doneCount;
          const remain = Math.round((avg*(targets.length-doneCount))/1000);
          if(remain>=60) setEtaText(`${Math.floor(remain/60)}m ${remain%60}s lagi`); else setEtaText(`${remain}s lagi`);
        }
        setProcessedCount(doneCount);
      }
    };
    const workers=[];
    for(let i=0;i<maxConcurrency;i++) workers.push(worker());
    await Promise.all(workers);
    if(!stopSignal.current){
      setTimeout(()=>{setGenerating(false); setGenerateState("idle");},250);
    }
  };
  const handlePause=()=>{pauseSignal.current=true; setGenerateState("paused");};
  const handleStop=()=>{stopSignal.current=true; pauseSignal.current=false; setGenerateState("idle"); setGenerating(false); setFiles(prev=>prev.map(f=>f.status==="processing"?{...f,status:"queued"}:f));};

  // Preview updater
  useEffect(()=>{
    if(!activeFile || activeFile.detecting || generating) return;
    if(activeFile.status==="done"){
      setIsRenderingPreview(true);
      if(renderTimeout.current) clearTimeout(renderTimeout.current);
      renderTimeout.current=setTimeout(async()=>{
        const url=await drawVariant(activeFile, activeFile.scale??scale, activeFile.posX??posX, activeFile.posY??posY, false);
        if(url){
          try{
            const res=await fetch(url);
            const blob=await res.blob();
            setFiles(prev=>prev.map(f=>f.id===activeFile.id?{...f,resultUrl:url,resultBlob:blob,exported:false}:f));
            setLivePreviewUrl(url);
          }catch(e){}
        }
        setIsRenderingPreview(false);
      },250);
    } else {
      setLivePreviewUrl(activeFile.url);
    }
  },[activeFile?.id, activeFile?.status, generating, activeFile?.scale, activeFile?.posX, activeFile?.posY, activeFile?.autoAdjust, activeFile?.brightness, activeFile?.contrast, activeFile?.saturate, scale,posX,posY, globalAutoAdjust, globalBrightness, globalContrast, globalSaturate, etalaseDetails]);

  const doneFiles=files.filter(f=>f.status==="done");
  const pendingTargets=files.filter(f=>!f.detecting && f.status!=="done");
  const allReady=pendingTargets.length>0 && files.every(f=>!f.detecting);

  // Cover generation
  const handleGenerateCovers = async ()=>{
    const done=files.filter(f=>f.status==="done");
    if(!done.length) { alert("Belum ada varian yang jadi. Generate varian dulu."); return; }
    setCoverGenerating(true);
    setCoverResults([]);
    try{
      const templateImg=await getTemplateImg();
      const groupsByFolder=new Map<string,JewelryFile[]>();
      done.forEach(f=>{
        const key=f.folderName||"Tanpa Folder";
        if(!groupsByFolder.has(key)) groupsByFolder.set(key,[]);
        groupsByFolder.get(key)!.push(f);
      });
      const newCovers:CoverResult[]=[];
      for(const [folderName, groupFiles] of groupsByFolder.entries()){
        const kind=detectCoverKind(folderName);
        const chunks=chunkIntoCovers(groupFiles.map(g=>({id:g.id})), kind);
        for(let idx=0; idx<chunks.length; idx++){
          const chunk=chunks[idx];
          const items=chunk.fileIds.map(id=>{
            const jf=done.find(d=>d.id===id)!;
            const cached=processCache.current.get(jf.id);
            // fallback canvas from resultBlob if cache missing
            let canvas:HTMLCanvasElement|null=null;
            let bbox:any=null;
            if(cached){ canvas=cached.mainCropped; bbox=cached.mainBbox; }
            return { id:jf.id, baseName:jf.baseName, karat:jf.karat, mp:jf.mp, canvas: canvas as HTMLCanvasElement, bbox: bbox||{width:0,height:0} };
          }).filter(x=>x.canvas);
          // if cache missing, try to load from blob url
          const validItems=items;
          if(validItems.length===0) continue;
          const detail=etalaseDetails.get(folderName)||null;
          const blob=await renderCoverBlob({templateImg, items: validItems as any, detail, folderName});
          if(blob){
            const url=URL.createObjectURL(blob);
            const fileName=`COVER_${folderName.replace(/\s+/g,"_")}_${idx+1}.jpg`;
            newCovers.push({folderName, index:idx+1, url, blob, fileName, kind});
          }
        }
      }
      setCoverResults(newCovers);
      if(newCovers.length===0) alert("Gagal generate cover. Cek file varian.");
    } catch(e){ console.error(e); alert("Error generate cover: "+e); }
    setCoverGenerating(false);
  };

  const exportCoversToFolder = async ()=>{
    if(coverResults.length===0){ alert("Belum ada cover."); return; }
    if(!('showDirectoryPicker' in window)){ alert("Browser tidak mendukung. Gunakan Chrome/Edge Desktop."); return; }
    try{
      // @ts-ignore
      const dirHandle=await (window as any).showDirectoryPicker({mode:'readwrite'});
      let success=0;
      // Group covers by folderName for saving inside category folder if possible
      for(const c of coverResults){
        try{
          let targetDir=dirHandle;
          // try to find / create subfolder matching folderName
          if(c.folderName && c.folderName!=="Tanpa Folder"){
            try{
              const parts=c.folderName.split("/").filter(Boolean);
              let cur=dirHandle;
              for(const part of parts){
                try{ cur=await cur.getDirectoryHandle(part); } catch{ cur=await cur.getDirectoryHandle(part,{create:true}); }
              }
              targetDir=cur;
            }catch{}
          }
          const fileHandle=await targetDir.getFileHandle(c.fileName,{create:true});
          // @ts-ignore
          const writable=await fileHandle.createWritable();
          await writable.write(c.blob);
          await writable.close();
          success++;
        }catch(e){ console.error(e); }
      }
      let vOk=0;
      const done2 = files.filter(f=>f.status==="done"&&f.resultBlob);
      for(const f of done2){
        try{
          let td = dirHandle;
          const fk = f.folderName||"";
          if(fk && fk!=="Tanpa Folder"){
            try{ const parts=fk.split("/").filter(Boolean); let cur=dirHandle; for(const part of parts){ try{ cur=await cur.getDirectoryHandle(part); }catch{ cur=await cur.getDirectoryHandle(part,{create:true}); } } td=cur; }catch{}
          }
          const fh=await td.getFileHandle(f.name,{create:true});
          const w=await fh.createWritable(); await w.write(f.resultBlob); await w.close(); vOk++;
        }catch{}
      }
      alert(`Berhasil menyimpan ${success} cover + ${vOk} varian!`);
    }catch(err:any){
      if(err.name!=='AbortError'){ console.error(err); alert("Gagal akses folder."); }
    }
  };

  const exportOverwrite = async ()=>{
    if(!mainHandle){ alert("Buka Main Folder via tombol Buka Main Folder dulu untuk overwrite. Fallback ZIP."); downloadCoverZip(); return; }
    if(coverResults.length===0 && !files.some(f=>f.status==="done"&&f.resultBlob)){ alert("Belum ada hasil."); return; }
    try{
      let ok=0, fail=0;
      const done = files.filter(f=>f.status==="done" && f.resultBlob);
      const byFolder = new Map<string, typeof done>();
      done.forEach(f=>{ const k=f.folderName||"Tanpa Folder"; if(!byFolder.has(k)) byFolder.set(k,[]); byFolder.get(k)!.push(f); });
      for(const [folder, arr] of byFolder.entries()){
        let dir:any = mainHandle;
        const seg = folder.split("/").pop()||folder;
        if(folder && folder!=="Tanpa Folder"){ try{ dir = await mainHandle.getDirectoryHandle(seg); }catch{ try{ dir = await mainHandle.getDirectoryHandle(folder);}catch{} } }
        for(const f of arr){ try{ const fh:any = await dir.getFileHandle(f.name,{create:true}); const w:any = await fh.createWritable(); await w.write(f.resultBlob!); await w.close(); ok++; }catch{ fail++; } }
      }
      for(const c of coverResults){
        let dir:any = mainHandle;
        const seg = (c.folderName||"").split("/").pop()||c.folderName;
        if(seg) try{ dir = await mainHandle.getDirectoryHandle(seg); }catch{}
        try{ const fh:any = await dir.getFileHandle(c.fileName,{create:true}); const w:any = await fh.createWritable(); await w.write(c.blob); await w.close(); ok++; }catch{ fail++; }
      }
      alert(`Overwrite selesai: ${ok} berhasil, ${fail} gagal.`);
    }catch(e:any){ console.error(e); alert("Gagal: "+e.message); }
  };
  const downloadCoverZip = async ()=>{
    if(coverResults.length===0) return;
    const zip=new JSZip();
    coverResults.forEach(c=>{
      zip.file(c.fileName, c.blob);
    });
    // also add variants
    for(const f of doneFiles){
      if(f.resultBlob) zip.file(f.name.replace(/\.[^/.]+$/,"")+".jpg", f.resultBlob);
    }
    const content=await zip.generateAsync({type:"blob"});
    const url=URL.createObjectURL(content);
    const a=document.createElement("a");
    a.href=url; a.download=`cover_varian_${Date.now()}.zip`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]" style={{fontFamily:"'Inter', sans-serif"}}>
      <header className="sticky top-0 z-50 flex items-center justify-between px-8 py-4" style={{background:"rgba(255,255,255,0.75)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderBottom:"1px solid rgba(0,0,0,0.07)",boxShadow:"0 1px 24px rgba(229,62,62,0.04), 0 1px 4px rgba(0,0,0,0.04)"}}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:"linear-gradient(135deg, #E53E3E 0%, #FC8181 100%)"}}><Gem size={18} className="text-white" strokeWidth={1.8} /></div>
            <div className="flex flex-col leading-none"><span className="font-bold text-[15px] tracking-tight text-[#1A1A2E]">Wahyu Redjo</span><span className="text-[10px] font-medium text-[#8A8A9E] tracking-widest uppercase">Studio</span></div>
          </div>
          <div className="h-6 w-[1px] bg-gray-200"></div>
          <nav className="flex items-center gap-1 p-1 rounded-xl" style={{background:"rgba(0,0,0,0.04)"}}>
            <Link href="/dashboard" className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all text-[#8A8A9E] hover:text-[#1A1A2E]">Varian (Lama)</Link>
            <span className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white" style={{background:"linear-gradient(135deg, #E53E3E 0%, #FC8181 100%)",boxShadow:"0 2px 8px rgba(229,62,62,0.25)"}}>Cover (Baru)</span>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <a href="https://wr.naelvi.com/rename/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all text-[#8A8A9E] hover:text-[#E53E3E] hover:bg-[rgba(229,62,62,0.08)]"><TextCursorInput size={14} strokeWidth={2} /> Rename</a>
          <button onClick={()=>signOut({callbackUrl:'/login'})} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[#8A8A9E] hover:text-[#E53E3E] hover:bg-[#FFF0F0] transition-all"><LogOut size={15} strokeWidth={2} /><span>Logout</span></button>
        </div>
      </header>

      <main className="max-w-[1360px] mx-auto px-6 md:px-10 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[#8A8A9E] text-sm mb-1.5"><span>Dashboard</span><ChevronRight size={14} /><span className="text-[#E53E3E] font-medium">Cover & Varian</span></div>
          <h1 className="text-2xl font-bold text-[#1A1A2E] tracking-tight">Cover Template Studio</h1>
          <p className="text-[#8A8A9E] text-sm mt-1">Upload folder kategori (foto + file .txt). Varian diproses 1-1 dengan label berat & size dari txt, cover digabung otomatis.</p>
          {etalaseDetails.size>0 && <div className="mt-3 flex flex-wrap gap-2">{Array.from(etalaseDetails.entries()).map(([k,v])=><span key={k} className="px-3 py-1 rounded-full text-xs font-semibold" style={{background:"rgba(229,62,62,0.08)",color:"#E53E3E",border:"1px solid rgba(229,62,62,0.15)"}}>{k||"Tanpa Folder"} • {v.karat} • {v.nampan} • {v.items.size} varian</span>)}</div>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
          <div className="flex flex-col gap-5">
            <div onDrop={handleDrop} onDragOver={(e)=>{e.preventDefault(); setIsDragging(true);}} onDragLeave={()=>setIsDragging(false)} className="relative rounded-2xl transition-all duration-200 overflow-hidden" style={{background:isDragging?"rgba(229,62,62,0.05)":"rgba(255,255,255,0.7)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:isDragging?"1.5px dashed #E53E3E":"1.5px dashed rgba(0,0,0,0.13)",boxShadow:isDragging?"0 0 0 4px rgba(229,62,62,0.08), 0 4px 24px rgba(0,0,0,0.05)":"0 2px 12px rgba(0,0,0,0.04)"}}>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e)=>e.target.files && processFiles(e.target.files)} />
              <input ref={folderInputRef} type="file" accept="image/*,.txt" multiple // @ts-expect-error
webkitdirectory="" directory="" className="hidden" onChange={(e)=>e.target.files && processFiles(e.target.files)} />
              <div className="flex flex-col items-center gap-4 py-7 px-6 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{background:isDragging?"rgba(229,62,62,0.12)":"rgba(229,62,62,0.06)"}}><Upload size={20} className="text-[#E53E3E]" strokeWidth={1.8} /></div>
                <div><p className="text-sm font-semibold text-[#1A1A2E]">{isDragging?"Lepaskan file di sini":"Drag & drop folder kategori (foto + .txt)"}</p><p className="text-xs text-[#8A8A9E] mt-0.5">Pilih folder, sistem baca .txt otomatis (kadar, nampan, berat, size)</p></div>
                <div className="flex items-center gap-3">
                  <button onClick={()=>fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#E53E3E] transition-all hover:opacity-80" style={{background:"rgba(229,62,62,0.08)",border:"1px solid rgba(229,62,62,0.2)"}}><ImageIcon size={14} strokeWidth={2.2} /> Pilih File</button>
                  <button onClick={handleOpenMainFolder} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:"linear-gradient(135deg, #1A1A2E 0%, #3A3A5E 100%)"}}><FolderOpen size={14}/> Buka Main Folder (Overwrite)</button><button onClick={()=>folderInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#1A1A2E] transition-all hover:text-[#E53E3E] hover:bg-[#FFF0F0]" style={{background:"rgba(0,0,0,0.04)",border:"1px solid rgba(0,0,0,0.08)"}}><FolderOpen size={14} strokeWidth={2.2} /> Pilih Folder</button>
                </div>
              </div>
              {files.length>0 && (
                <div className="border-t px-4 py-3 flex flex-col gap-1 max-h-52 overflow-y-auto" style={{borderColor:"rgba(0,0,0,0.07)"}}>
                  {files.map(f=>(
                    <div key={f.id} onClick={()=>setActiveId(f.id)} className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all ${activeId===f.id?"bg-[#FFF0F0] border border-[rgba(229,62,62,0.15)]":"hover:bg-gray-50 border border-transparent"}`}>
                      <img src={f.url} alt="" className="w-10 h-10 rounded-lg object-cover bg-white border border-gray-100" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#1A1A2E] truncate">{f.baseName}</p>
                        <p className="text-[11px] text-[#8A8A9E] truncate">{f.folderName?`📁 ${f.folderName} • `:""}{f.karat} • {f.mp} • {f.category||"Detecting..."}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${f.status==="done"?"bg-green-50 text-green-600":f.status==="processing"?"bg-amber-50 text-amber-600":f.status==="error"?"bg-red-50 text-red-600":"bg-gray-50 text-gray-400"}`}>{f.detecting?"AI...":f.status}</span>
                      <button onClick={(e)=>{e.stopPropagation(); removeFile(f.id);}} className="w-6 h-6 flex items-center justify-center rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {files.length>0 && (
              <div className="rounded-2xl p-5 flex flex-col gap-4" style={{background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.07)",boxShadow:"0 2px 16px rgba(0,0,0,0.04)"}}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1A1A2E]">Generate Varian</h3>
                  {generating && <span className="text-xs font-semibold text-[#E53E3E]">{processedCount}/{files.length} • {progress}%{etaText ? ` • ${etaText}` : ""}</span>}
                </div>
                {generating && <div className="h-2 rounded-full overflow-hidden bg-gray-100"><div className="h-full transition-all" style={{width:`${progress}%`,background:"linear-gradient(90deg, #E53E3E, #FC8181)"}} /></div>}
                <div className="flex gap-2">
                  {generateState==="idle" && <button onClick={handleGenerate} disabled={!allReady} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${allReady?"text-white":"text-gray-400 bg-gray-100 cursor-not-allowed"}`} style={allReady?{background:"linear-gradient(135deg, #E53E3E 0%, #FC8181 100%)",boxShadow:"0 4px 16px rgba(229,62,62,0.3)"}:{}}><Play size={14} /> Generate {pendingTargets.length} Varian</button>}
                  {generateState==="generating" && <><button onClick={handlePause} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-amber-500 text-white"><Pause size={14}/> Pause</button><button onClick={handleStop} className="px-5 py-3 rounded-xl text-sm font-bold bg-gray-900 text-white"><Square size={14}/></button></>}
                  {generateState==="paused" && <><button onClick={handleGenerate} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-green-600 text-white"><Play size={14}/> Lanjut</button><button onClick={handleStop} className="px-5 py-3 rounded-xl text-sm font-bold bg-gray-900 text-white"><Square size={14}/></button></>}
                </div>
                {pendingTargets.length>0 && !generating && <p className="text-xs text-[#8A8A9E]">{pendingTargets.length} varian siap diproses. Hasil varian akan pakai label berat & size dari .txt.</p>}
                {doneFiles.length>0 && (
                  <div className="flex flex-col gap-2 pt-3 border-t" style={{borderColor:"rgba(0,0,0,0.06)"}}>
                    <p className="text-xs font-semibold text-[#1A1A2E]">{doneFiles.length} varian selesai — siap bikin cover</p>
                    <button onClick={handleGenerateCovers} disabled={coverGenerating} className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50" style={{background:"linear-gradient(135deg, #1A1A2E 0%, #3A3A5E 100%)",boxShadow:"0 4px 16px rgba(26,26,46,0.2)"}}>{coverGenerating?<><Cpu size={14} className="animate-spin"/> Membuat Cover...</>:<><Layers size={14}/> Generate {doneFiles.length} Cover Collage</>}</button>
                    {coverResults.length>0 && <div className="grid grid-cols-3 gap-2 mt-2">{coverResults.map(c=><div key={c.fileName} className="rounded-xl overflow-hidden border bg-white" style={{borderColor:"rgba(0,0,0,0.08)"}}><img src={c.url} alt={c.fileName} className="w-full aspect-square object-cover" /><div className="px-2 py-1.5"><p className="text-[10px] font-bold text-[#1A1A2E] truncate">{c.fileName}</p><p className="text-[9px] text-[#8A8A9E]">{c.folderName} • {c.kind}</p></div></div>)}</div>}
                    {coverResults.length>0 && <div className="flex gap-2 mt-2"><button onClick={exportOverwrite} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-[#E53E3E]" style={{background:"rgba(229,62,62,0.08)",border:"1px solid rgba(229,62,62,0.15)"}}><Archive size={13}/> Download ZIP (varian+cover)</button><button onClick={downloadCoverZip} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white border">ZIP</button><button onClick={exportCoversToFolder} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white" style={{background:"linear-gradient(135deg, #E53E3E 0%, #FC8181 100%)"}}><FolderDown size={13}/> Simpan Cover ke Folder</button></div>}
                  </div>
                )}
              </div>
            )}

            {files.length===0 && <div className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center" style={{background:"rgba(255,255,255,0.5)",border:"1px dashed rgba(0,0,0,0.1)"}}><PackageOpen size={28} className="text-[#8A8A9E]" /><p className="text-sm font-semibold text-[#1A1A2E]">Belum ada file</p><p className="text-xs text-[#8A8A9E]">Pilih folder kategori yang berisi foto + file .txt. Contoh: folder "CINCIN SOLITARE" berisi 6 foto + 1 .txt.</p></div>}
          </div>

          <div className="flex flex-col gap-5 lg:sticky lg:top-[88px]">
            <div className="rounded-2xl overflow-hidden" style={{background:"rgba(255,255,255,0.85)",border:"1px solid rgba(0,0,0,0.07)",boxShadow:"0 4px 24px rgba(0,0,0,0.06)"}}>
              <div className="px-5 py-4 flex items-center justify-between border-b" style={{borderColor:"rgba(0,0,0,0.06)"}}>
                <span className="text-sm font-bold text-[#1A1A2E] flex items-center gap-2"><Eye size={14}/> Preview Varian</span>
                {isRenderingPreview && <span className="text-xs text-[#E53E3E] flex items-center gap-1"><Cpu size={11} className="animate-spin"/> rendering...</span>}
              </div>
              <div className="p-4">
                {activeFile ? (
                  <div className="rounded-xl overflow-hidden bg-[#F8F9FA] border" style={{borderColor:"rgba(0,0,0,0.06)"}}>
                    <img src={livePreviewUrl||activeFile.url} alt="preview" className="w-full aspect-square object-contain bg-white" />
                    <div className="px-3 py-2 flex items-center justify-between bg-white border-t" style={{borderColor:"rgba(0,0,0,0.06)"}}>
                      <span className="text-xs font-semibold text-[#1A1A2E] truncate">{activeFile.baseName}</span>
                      <span className="text-[11px] text-[#8A8A9E]">{activeFile.folderName||"-"}</span>
                    </div>
                  </div>
                ) : <div className="aspect-square rounded-xl flex flex-col items-center justify-center gap-2" style={{background:"rgba(0,0,0,0.02)",border:"1px dashed rgba(0,0,0,0.08)"}}><ImageIcon size={28} className="text-gray-300"/><p className="text-xs text-[#8A8A9E]">Pilih file untuk preview</p></div>}
              </div>
              {activeFile && !activeFile.detecting && (
                <div className="px-5 pb-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-[#1A1A2E] cursor-pointer"><input type="checkbox" checked={activeFile.autoAdjust??globalAutoAdjust} onChange={(e)=>setFiles(prev=>prev.map(f=>f.id===activeFile.id?{...f,autoAdjust:e.target.checked}:f))} className="accent-[#E53E3E]" /> Auto Lighting</label>
                  </div>
                  <Slider label="Scale" icon={ZoomIn} value={activeFile.scale??scale} min={50} max={200} step={1} onChange={(v:number)=>setFiles(prev=>prev.map(f=>f.id===activeFile.id?{...f,scale:v}:f))} unit="%" />
                  <Slider label="Pos X" icon={Move} value={activeFile.posX??posX} min={-300} max={300} step={1} onChange={(v:number)=>setFiles(prev=>prev.map(f=>f.id===activeFile.id?{...f,posX:v}:f))} />
                  <Slider label="Pos Y" icon={Move} value={activeFile.posY??posY} min={-300} max={300} step={1} onChange={(v:number)=>setFiles(prev=>prev.map(f=>f.id===activeFile.id?{...f,posY:v}:f))} />
                  <button onClick={()=>setFiles(prev=>prev.map(f=>f.id===activeFile.id?{...f,scale:100,posX:0,posY:0}:f))} className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-[#8A8A9E] hover:text-[#1A1A2E] hover:bg-gray-50"><RotateCcw size={12}/> Reset Posisi</button>
                </div>
              )}
            </div>

            <div className="rounded-2xl p-5 flex flex-col gap-3" style={{background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.07)"}}>
              <h4 className="text-xs font-bold text-[#1A1A2E] flex items-center gap-1.5"><Settings size={12}/> Global Adjust</h4>
              <Slider label="Brightness" icon={Sun} value={globalBrightness} min={0} max={200} step={1} onChange={setGlobalBrightness} unit="%" />
              <Slider label="Contrast" icon={Contrast} value={globalContrast} min={0} max={200} step={1} onChange={setGlobalContrast} unit="%" />
              <Slider label="Saturate" icon={Droplet} value={globalSaturate} min={0} max={200} step={1} onChange={setGlobalSaturate} unit="%" />
              <label className="flex items-center gap-2 text-xs font-semibold text-[#1A1A2E] cursor-pointer mt-1"><input type="checkbox" checked={globalAutoAdjust} onChange={e=>setGlobalAutoAdjust(e.target.checked)} className="accent-[#E53E3E]" /> Auto Lighting Global</label>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
