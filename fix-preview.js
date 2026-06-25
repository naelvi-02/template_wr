const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

const oldBlock = `  useCallback(() => {
    if (!activeFile || activeFile.detecting || generating) return;
    setIsRenderingPreview(true);
    if (renderTimeout.current) clearTimeout(renderTimeout.current);
    renderTimeout.current = setTimeout(async () => {
      const url = await drawComposition(activeFile, scale, posX, posY);
      if (url) setLivePreviewUrl(url);
      setIsRenderingPreview(false);
    }, 500);
  }, [activeFile, scale, posX, posY, generating]);`;

const newBlock = `  useEffect(() => {
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
      }
      setIsRenderingPreview(false);
    }, 150);
  }, [activeFile?.id, activeFile?.scale, activeFile?.posX, activeFile?.posY, scale, posX, posY, generating]);`;

if (!code.includes('useCallback(() => {')) {
  console.log("String not found?");
} else {
  code = code.replace(oldBlock, newBlock);
  fs.writeFileSync('src/app/dashboard/page.tsx', code);
  console.log("Success");
}
