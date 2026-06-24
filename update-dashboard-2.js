const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

// Replace useCallback with useEffect
const oldCallbackRegex = /useCallback\(\(\) => \{\s*if \(\!activeFile[\s\S]*?\}, \[activeFile, scale, posX, posY, generating\]\);/m;
const newEffect = `useEffect(() => {
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
  }, [activeFile?.id, activeFile?.scale, activeFile?.posX, activeFile?.posY, scale, posX, posY, generating]);`;

code = code.replace(oldCallbackRegex, newEffect);


// Replace Sliders
const oldSlidersRegex = /<Slider label="Scale" value=\{scale\}.*?onChange=\{setScale\} \/>\s*<Slider label="Position X" value=\{posX\}.*?onChange=\{setPosX\} \/>\s*<Slider label="Position Y" value=\{posY\}.*?onChange=\{setPosY\} \/>/m;

const newSliders = `<Slider label="Scale" value={activeFile?.scale ?? scale} min={40} max={320} step={2} unit="%" icon={<ZoomIn size={14} strokeWidth={2.2} />} onChange={(val) => {
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
                }} />`;

code = code.replace(oldSlidersRegex, newSliders);


// Replace Reset Button
const oldResetRegex = /<button onClick=\{\(\) => \{ setScale\(100\); setPosX\(0\); setPosY\(0\); \}\} className="flex items-center gap-2 text-xs font-medium text-\[#8A8A9E\] hover:text-\[#E53E3E\] transition-colors self-start">.*?Reset ke default<\/button>/m;

const newReset = `<button onClick={() => { 
                  setScale(100); setPosX(0); setPosY(0); 
                  if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, scale: undefined, posX: undefined, posY: undefined } : f));
                }} className="flex items-center gap-2 text-xs font-medium text-[#8A8A9E] hover:text-[#E53E3E] transition-colors self-start"><RotateCcw size={12} strokeWidth={2.2} /> Reset ke default</button>`;

code = code.replace(oldResetRegex, newReset);


// Fix image rendering logic (livePreviewUrl over activeFile.resultUrl)
// Wait! If auto-apply works, activeFile.resultUrl will be updated. So we can just show `activeFile.resultUrl || livePreviewUrl`.
// BUT if the auto-apply is taking 400ms + fetch blob time, we want to show `livePreviewUrl` IMMEDIATELY to avoid lag.
// So `livePreviewUrl || activeFile.resultUrl` is better!
const oldImgRenderRegex = /\{activeFile\?\.resultUrl \|\| livePreviewUrl \? \(\s*<img src=\{\(activeFile\?\.resultUrl \|\| livePreviewUrl\)\!\} /m;
const newImgRender = `{livePreviewUrl || activeFile?.resultUrl ? (
                  <img src={(livePreviewUrl || activeFile?.resultUrl)!} `;

code = code.replace(oldImgRenderRegex, newImgRender);


fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log('Update successful');
