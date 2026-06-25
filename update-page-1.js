const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

// 1. Update JewelryFile interface
const fileTypeRegex = /export interface JewelryFile \{[\s\S]*?kembarId: string \| null;/;
const fileTypeReplacement = `export interface JewelryFile {
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
  kembarId: string | null;`;
code = code.replace(fileTypeRegex, fileTypeReplacement);

// 2. Add imports
code = code.replace('import { loadAndProcessImage } from "@/lib/imageProcessor";', 'import { loadAndProcessImage, calculateAutoLighting } from "@/lib/imageProcessor";');
code = code.replace('import { Play, Upload, Settings, LogOut, PackageOpen, LayoutDashboard, Gem, Cpu, FileArchive, X, ImageIcon, FolderOpen, Image as ImageIcon2, Download, CheckCircle2, ChevronRight, Sun, Contrast, Droplet, Pause, Square } from "lucide-react";', 'import { Play, Upload, Settings, LogOut, PackageOpen, LayoutDashboard, Gem, Cpu, FileArchive, X, ImageIcon, FolderOpen, Image as ImageIcon2, Download, CheckCircle2, ChevronRight, Sun, Contrast, Droplet, Pause, Square } from "lucide-react";'); // ensure icons are there

if (!code.includes('Droplet')) {
  code = code.replace(/import \{ Play, Upload, (.*?) \} from "lucide-react";/, 'import { Play, Upload, $1, Sun, Contrast, Droplet, Pause, Square } from "lucide-react";');
}

// 3. Add global states
const stateRegex = /  const \[files, setFiles\] = useState<JewelryFile\[\]>\(\[\]\);/;
const stateReplacement = `  const [files, setFiles] = useState<JewelryFile[]>([]);
  const [globalAutoAdjust, setGlobalAutoAdjust] = useState(true);
  const [globalBrightness, setGlobalBrightness] = useState(100);
  const [globalContrast, setGlobalContrast] = useState(100);
  const [globalSaturate, setGlobalSaturate] = useState(100);
  
  const [generateState, setGenerateState] = useState<"idle" | "generating" | "paused">("idle");
  const stopSignal = useRef(false);
  const pauseSignal = useRef(false);`;
code = code.replace(stateRegex, stateReplacement);

// 4. Update handleGenerate and queue
const genRegex = /  const handleGenerate = async \(\) => \{[\s\S]*?setTimeout\(\(\) => setGenerating\(false\), 400\);\s*\};/;
const genReplacement = `  const handlePause = () => {
    pauseSignal.current = true;
    setGenerateState("paused");
  };

  const handleStop = () => {
    stopSignal.current = true;
    pauseSignal.current = false;
    setGenerateState("idle");
    setGenerating(false);
    setFiles(prev => prev.map(f => f.status === "processing" ? { ...f, status: "queued" } : f));
  };

  const handleGenerate = async () => {
    if (generateState === "paused") {
      pauseSignal.current = false;
      setGenerateState("generating");
      return;
    }

    const targets = files.filter((f) => !f.detecting && f.status !== "done");
    if (!targets.length || generating) return;

    setGenerating(true);
    setGenerateState("generating");
    stopSignal.current = false;
    pauseSignal.current = false;
    setProgress(0);
    setProcessedCount(0);

    setFiles((prev) => prev.map((f) => targets.find((t) => t.id === f.id) ? { ...f, status: "queued", resultUrl: null } : f));

    let doneCount = 0;
    const maxConcurrency = 3;
    let index = 0;
    
    const worker = async () => {
      while (index < targets.length) {
        if (stopSignal.current) break;
        
        while (pauseSignal.current) {
          if (stopSignal.current) break;
          await new Promise(r => setTimeout(r, 200));
        }
        
        if (stopSignal.current) break;

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

        if (stopSignal.current) break; // Check again after long async operation

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
    
    if (!stopSignal.current) {
      setTimeout(() => {
        setGenerating(false);
        setGenerateState("idle");
      }, 400);
    }
  };`;
code = code.replace(genRegex, genReplacement);

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log("Success step 1 page.tsx");
