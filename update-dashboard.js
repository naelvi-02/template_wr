const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

// 1. Add JewelryFile fields
code = code.replace(
  /kembarId\?\: string \| null;\n  exported\?\: boolean;\n}/g,
  `kembarId?: string | null;
  exported?: boolean;
  scale?: number;
  posX?: number;
  posY?: number;
}`
);

// 2. Add process caches to Dashboard component
code = code.replace(
  /const \[activeId, setActiveId\] = useState<string \| null>\(null\);/g,
  `const [activeId, setActiveId] = useState<string | null>(null);

  const processCache = useRef(new Map<string, { mainCropped: HTMLCanvasElement, mainBbox: any }>());
  const kembarDetailCache = useRef(new Map<string, { detailCropped: HTMLCanvasElement, resDetails: any }>());`
);

// 3. Rewrite drawComposition
const oldDrawCompStart = `  type KembarCacheType = Map<string, { mainCropped: HTMLCanvasElement, mainBbox: any, detailCropped: HTMLCanvasElement | null, resDetails: any }>;

  const drawComposition = async (target: JewelryFile, overrideScale?: number, overrideX?: number, overrideY?: number, kembarCache?: KembarCacheType): Promise<string | null> => {`;
  
const oldDrawCompEnd = `      const isNecklace = target.category === "Necklace";`;

const newDrawComp = `  const drawComposition = async (target: JewelryFile, overrideScale?: number, overrideX?: number, overrideY?: number): Promise<string | null> => {
    try {
      let mainCropped: HTMLCanvasElement;
      let mainBbox: any;
      let detailCropped: HTMLCanvasElement | null = null;
      let resDetails: any = null;

      const cacheKey = target.id;
      if (processCache.current.has(cacheKey)) {
        const cached = processCache.current.get(cacheKey)!;
        mainCropped = cached.mainCropped;
        mainBbox = cached.mainBbox;
      } else {
        const resMain = await loadAndProcessImage(target.file, target.category);
        mainCropped = resMain.canvas;
        mainBbox = resMain.bbox;
        processCache.current.set(cacheKey, { mainCropped, mainBbox });
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
            kembarDetailCache.current.set(kembarId, { detailCropped, resDetails });
          }
        }
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

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
      ctx.drawImage(templateImg, 0, 0);

      const currentScale = (overrideScale !== undefined ? overrideScale : 100) / 100;
      const currentX = overrideX !== undefined ? overrideX : 0;
      const currentY = overrideY !== undefined ? overrideY : 0;

      const isNecklace = target.category === "Necklace";`;

code = code.substring(0, code.indexOf(oldDrawCompStart)) + newDrawComp + code.substring(code.indexOf(oldDrawCompEnd) + oldDrawCompEnd.length);


// 4. Rewrite handleGenerate
const oldHandleGenStart = `  const handleGenerate = async () => {`;
const oldHandleGenEnd = `      setFiles((prev) => prev.map((f) => f.id === target.id ? {`;

const newHandleGen = `  const handleGenerate = async () => {
    const targets = files.filter((f) => !f.detecting && f.status !== "done");
    if (!targets.length || generating) return;

    setGenerating(true);
    setProgress(0);
    setProcessedCount(0);

    setFiles((prev) => prev.map((f) => targets.find((t) => t.id === f.id) ? { ...f, status: "queued", resultUrl: null } : f));

    let doneCount = 0;
    
    for (const target of targets) {
      setFiles((prev) => prev.map((f) => f.id === target.id ? { ...f, status: "processing" } : f));
      
      let resultUrl: string | null = null;
      let resultBlob: Blob | undefined;

      resultUrl = await drawComposition(target, target.scale ?? scale, target.posX ?? posX, target.posY ?? posY);
      if (resultUrl) {
        const res = await fetch(resultUrl);
        resultBlob = await res.blob();
      }

      setFiles((prev) => prev.map((f) => f.id === target.id ? {`;

code = code.substring(0, code.indexOf(oldHandleGenStart)) + newHandleGen + code.substring(code.indexOf(oldHandleGenEnd) + oldHandleGenEnd.length);


// 5. Replace preview hooks and slider variables
code = code.replace(
  /  useCallback\(\(\) => \{\n[\s\S]*?\}, \[activeFile, scale, posX, posY, generating\]\);/g,
  `  useEffect(() => {
    if (!activeFile || activeFile.detecting || generating) return;
    setIsRenderingPreview(true);
    if (renderTimeout.current) clearTimeout(renderTimeout.current);
    
    renderTimeout.current = setTimeout(async () => {
      const currentScale = activeFile.scale ?? scale;
      const currentX = activeFile.posX ?? posX;
      const currentY = activeFile.posY ?? posY;
      const url = await drawComposition(activeFile, currentScale, currentX, currentY);
      
      if (url) {
        setLivePreviewUrl(url);
        
        if (activeFile.status === "done") {
          const kembarId = activeFile.kembarId;
          const siblings = files.filter(f => f.status === "done" && (f.id === activeFile.id || (kembarId && f.kembarId === kembarId)));
          
          let updatedUrls = new Map<string, { url: string, blob: Blob }>();
          for (const sib of siblings) {
            const sibUrl = await drawComposition(sib, sib.scale ?? scale, sib.posX ?? posX, sib.posY ?? posY);
            if (sibUrl) {
              const res = await fetch(sibUrl);
              const blob = await res.blob();
              updatedUrls.set(sib.id, { url: sibUrl, blob });
            }
          }
          
          if (updatedUrls.size > 0) {
            setFiles(prev => prev.map(f => {
              if (updatedUrls.has(f.id)) {
                const data = updatedUrls.get(f.id)!;
                return { ...f, resultUrl: data.url, resultBlob: data.blob, exported: false };
              }
              return f;
            }));
          }
        }
      }
      setIsRenderingPreview(false);
    }, 400);
  }, [activeFile?.id, activeFile?.scale, activeFile?.posX, activeFile?.posY, scale, posX, posY, generating]);`
);


// 6. Fix slider updates in UI
const sliderUI = `<div className="flex flex-col gap-6">
                <Slider label="Scale" value={scale} min={40} max={320} step={2} unit="%" icon={<ZoomIn size={14} strokeWidth={2.2} />} onChange={setScale} />
                <Slider label="Position X" value={posX} min={-400} max={400} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={setPosX} />
                <Slider label="Position Y" value={posY} min={-400} max={400} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={setPosY} />
              </div>`;

const newSliderUI = `<div className="flex flex-col gap-6">
                <Slider label="Scale" value={activeFile?.scale ?? scale} min={40} max={320} step={2} unit="%" icon={<ZoomIn size={14} strokeWidth={2.2} />} onChange={(val) => {
                  setScale(val);
                  if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, scale: val } : f));
                }} />
                <Slider label="Position X" value={activeFile?.posX ?? posX} min={-400} max={400} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={(val) => {
                  setPosX(val);
                  if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, posX: val } : f));
                }} />
                <Slider label="Position Y" value={activeFile?.posY ?? posY} min={-400} max={400} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={(val) => {
                  setPosY(val);
                  if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, posY: val } : f));
                }} />
              </div>`;

code = code.replace(sliderUI, newSliderUI);


// 7. Fix Reset Button
code = code.replace(
  /<button onClick=\{\(\) => \{ setScale\(100\); setPosX\(0\); setPosY\(0\); \}\} className="flex items-center gap-2 text-xs font-medium text-\[#8A8A9E\] hover:text-\[#E53E3E\] transition-colors self-start"><RotateCcw size=\{12\} strokeWidth=\{2.2\} \/> Reset ke default<\/button>/g,
  `<button onClick={() => { 
                  setScale(100); setPosX(0); setPosY(0); 
                  if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, scale: undefined, posX: undefined, posY: undefined } : f));
                }} className="flex items-center gap-2 text-xs font-medium text-[#8A8A9E] hover:text-[#E53E3E] transition-colors self-start"><RotateCcw size={12} strokeWidth={2.2} /> Reset ke default</button>`
);

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log('Update successful');
