const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

// 1. Add Detail Adjustments to JewelryFile
code = code.replace(
  "  saturate?: number;\n}",
  "  saturate?: number;\n  detailScale?: number;\n  detailPosX?: number;\n  detailPosY?: number;\n}"
);

// 2. Add Detail Sliders to UI
const sliderRegex = /<Slider label="Scale" value=\{activeFile\?\.scale \?\? 100\} min=\{40\} max=\{320\} step=\{2\} unit="%" icon=\{<ZoomIn size=\{14\} strokeWidth=\{2\.2\} \/>\} onChange=\{\(val\) => \{[\s\S]*?\}\} \/>/;

const sliderReplacement = `<Slider label="Main Scale" value={activeFile?.scale ?? 100} min={40} max={320} step={2} unit="%" icon={<ZoomIn size={14} strokeWidth={2.2} />} onChange={(val) => {
                  if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, scale: val } : f));
                  else setScale(val);
                }} />
                <Slider label="Main Pos X" value={activeFile?.posX ?? 0} min={-400} max={400} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={(val) => {
                  if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, posX: val } : f));
                  else setPosX(val);
                }} />
                <Slider label="Main Pos Y" value={activeFile?.posY ?? 0} min={-400} max={400} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={(val) => {
                  if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, posY: val } : f));
                  else setPosY(val);
                }} />
                <div className="h-px bg-[#EDEDF3] my-2" />
                <div className="text-xs font-semibold text-[#8A8A9E] mb-1">Detail Inset Adjustments</div>
                <Slider label="Detail Scale" value={activeFile?.detailScale ?? 100} min={20} max={400} step={2} unit="%" icon={<ZoomIn size={14} strokeWidth={2.2} />} onChange={(val) => {
                  if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, detailScale: val } : f));
                }} />
                <Slider label="Detail Pos X" value={activeFile?.detailPosX ?? 0} min={-600} max={600} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={(val) => {
                  if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, detailPosX: val } : f));
                }} />
                <Slider label="Detail Pos Y" value={activeFile?.detailPosY ?? 0} min={-600} max={600} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={(val) => {
                  if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, detailPosY: val } : f));
                }} />`;

// We also need to remove the old Position X and Position Y sliders because they are replaced above
const oldPosXRegex = /<Slider label="Position X" value=\{activeFile\?\.posX \?\? 0\} min=\{-400\} max=\{400\} step=\{2\} unit="px" icon=\{<Move size=\{14\} strokeWidth=\{2\.2\} \/>\} onChange=\{\(val\) => \{[\s\S]*?\}\} \/>/;
const oldPosYRegex = /<Slider label="Position Y" value=\{activeFile\?\.posY \?\? 0\} min=\{-400\} max=\{400\} step=\{2\} unit="px" icon=\{<Move size=\{14\} strokeWidth=\{2\.2\} \/>\} onChange=\{\(val\) => \{[\s\S]*?\}\} \/>/;

code = code.replace(sliderRegex, sliderReplacement);
code = code.replace(oldPosXRegex, '');
code = code.replace(oldPosYRegex, '');

// Fix Reset button to include detail resets
const resetFileRegex = /f\.id === activeFile\.id \|\| \(activeFile\.kembarId && f\.kembarId === activeFile\.kembarId\) \? \{ \.\.\.f, scale: undefined, posX: undefined, posY: undefined, autoAdjust: undefined, brightness: undefined, contrast: undefined, saturate: undefined \} : f\)\);/;
const resetFileReplacement = `f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, scale: undefined, posX: undefined, posY: undefined, autoAdjust: undefined, brightness: undefined, contrast: undefined, saturate: undefined, detailScale: undefined, detailPosX: undefined, detailPosY: undefined } : f));`;
code = code.replace(resetFileRegex, resetFileReplacement);

// 3. Update useEffect for Real-time Generation when "done"
const effectRegex = /  useEffect\(\(\) => \{\s*if \(\!activeFile \|\| activeFile\.detecting \|\| generating\) return;\s*if \(activeFile\.status === "done" && activeFile\.resultUrl\) \{\s*setLivePreviewUrl\(activeFile\.resultUrl\);\s*\} else \{\s*setLivePreviewUrl\(activeFile\.url\);\s*\}\s*\}, \[activeFile\?\.id, activeFile\?\.status, generating\]\);/;

const effectReplacement = `  useEffect(() => {
    if (!activeFile || activeFile.detecting || generating) return;
    
    if (activeFile.status === "done") {
      setIsRenderingPreview(true);
      if (renderTimeout.current) clearTimeout(renderTimeout.current);
      renderTimeout.current = setTimeout(async () => {
        const url = await drawComposition(activeFile, activeFile.scale ?? scale, activeFile.posX ?? posX, activeFile.posY ?? posY, false);
        if (url) {
          try {
            const res = await fetch(url);
            const blob = await res.blob();
            // Important: only update if it actually changed to avoid infinite loops, but blob URLs are always new.
            // So we just update files state. Since we don't depend on activeFile.resultUrl, it's safe.
            setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, resultUrl: url, resultBlob: blob } : f));
            setLivePreviewUrl(url);
          } catch(e) {}
        }
        setIsRenderingPreview(false);
      }, 400);
    } else {
      setLivePreviewUrl(activeFile.url);
    }
  }, [
    activeFile?.id, activeFile?.status, generating,
    activeFile?.scale, activeFile?.posX, activeFile?.posY,
    activeFile?.autoAdjust, activeFile?.brightness, activeFile?.contrast, activeFile?.saturate,
    activeFile?.detailScale, activeFile?.detailPosX, activeFile?.detailPosY,
    scale, posX, posY, globalAutoAdjust, globalBrightness, globalContrast, globalSaturate
  ]);`;

code = code.replace(effectRegex, effectReplacement);

// 4. Update drawComposition for Detail Adjustments
const detailMathRegex = /        \/\/ CENTER LOCK: Always center the crop on the original detail image\s*const origW = resDetails\.originalWidth;\s*const origH = resDetails\.originalHeight;\s*const absCx = origW \/ 2;\s*const absCy = origH \/ 2;\s*const croppedCx = absCx - resDetails\.bbox\.x;\s*const croppedCy = absCy - resDetails\.bbox\.y;\s*if \(target\.claspBbox\) \{[\s\S]*?if \(size > maxSize\) \{\s*size = maxSize;\s*\}/;

const detailMathReplacement = `        // CENTER LOCK: Always center the crop on the original detail image
        const origW = resDetails.originalWidth;
        const origH = resDetails.originalHeight;
        let absCx = origW / 2;
        let absCy = origH / 2;

        let size = Math.max(origW, origH);
        if (target.claspBbox) {
          const absW = target.claspBbox.w * origW;
          const absH = target.claspBbox.h * origH;
          const isNecklace = target.category === "Necklace";
          size = Math.max(absW, absH) * (isNecklace ? 1.6 : 1.05); 
          const minSize = Math.max(origW * 0.05, 80);
          if (size < minSize) size = minSize;
        }

        // Apply Manual Detail Adjustments
        const dScale = target.detailScale ?? 100;
        absCx += (target.detailPosX ?? 0);
        absCy += (target.detailPosY ?? 0);
        
        size = size / (dScale / 100);

        const maxSize = Math.max(origW, origH) * 2; // Allow zooming out more
        if (size > maxSize) size = maxSize;

        const croppedCx = absCx - resDetails.bbox.x;
        const croppedCy = absCy - resDetails.bbox.y;`;

code = code.replace(detailMathRegex, detailMathReplacement);

// Ensure ZoomIn and Move are imported if not already
if (!code.includes('import { Move')) {
  code = code.replace(/import \{ Play, Upload, (.*?) \} from "lucide-react";/, 'import { Play, Upload, $1, Move, ZoomIn } from "lucide-react";');
}

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log("Success fix UI and detail scale");
