const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

const regex = /const renderTimeout = useRef<NodeJS\.Timeout \| null>\(null\);\s*useEffect\(\(\) => \{[\s\S]*?\}, \[\s*activeFile\?\.id[\s\S]*?globalSaturate\n\s*\]\);/;

const replacement = `const renderTimeout = useRef<NodeJS.Timeout | null>(null);
  const fastPreviewTimeout = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!activeFile || activeFile.detecting || generating) return;
    
    if (activeFile.status === "done") {
      // 1. Fast Real-Time Preview (30ms debounce, isPreview=true)
      if (fastPreviewTimeout.current) clearTimeout(fastPreviewTimeout.current);
      fastPreviewTimeout.current = setTimeout(async () => {
        const url = await drawComposition(activeFile, activeFile.scale ?? scale, activeFile.posX ?? posX, activeFile.posY ?? posY, true);
        if (url) setLivePreviewUrl(url);
      }, 30);

      // 2. High-Res Save to State (500ms debounce, isPreview=false)
      setIsRenderingPreview(true);
      if (renderTimeout.current) clearTimeout(renderTimeout.current);
      renderTimeout.current = setTimeout(async () => {
        const url = await drawComposition(activeFile, activeFile.scale ?? scale, activeFile.posX ?? posX, activeFile.posY ?? posY, false);
        if (url) {
          try {
            const res = await fetch(url);
            const blob = await res.blob();
            setFiles(prev => prev.map(f => {
              if (f.id === activeFile.id) {
                if (f.resultUrl && f.resultUrl !== url && !f.resultUrl.startsWith("data:")) URL.revokeObjectURL(f.resultUrl);
                return { ...f, resultUrl: url, resultBlob: blob };
              }
              return f;
            }));
            setLivePreviewUrl(url); // Ensure it's crystal clear when done
          } catch(e) {}
        }
        setIsRenderingPreview(false);
      }, 500);
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

code = code.replace(regex, replacement);
fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log("Updated preview updater.");
