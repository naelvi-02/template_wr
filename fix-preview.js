const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

const regex = /  useEffect\(\(\) => \{\s*if \(\!activeFile \|\| activeFile\.detecting \|\| generating\) return;\s*setIsRenderingPreview\(true\);\s*if \(renderTimeout\.current\) clearTimeout\(renderTimeout\.current\);\s*renderTimeout\.current = setTimeout\(async \(\) => \{\s*const currentScale = activeFile\.scale \?\? scale;\s*const currentX = activeFile\.posX \?\? posX;\s*const currentY = activeFile\.posY \?\? posY;\s*const url = await drawComposition\(activeFile, currentScale, currentX, currentY, true\);\s*if \(url\) setLivePreviewUrl\(url\);\s*setIsRenderingPreview\(false\);\s*\}, 150\);\s*\}, \[activeFile\?\.id, activeFile\?\.scale, activeFile\?\.posX, activeFile\?\.posY, scale, posX, posY, generating\]\);/;

const replacement = `  useEffect(() => {
    if (!activeFile || activeFile.detecting || generating) return;
    
    if (activeFile.status === "done" && activeFile.resultUrl) {
      setLivePreviewUrl(activeFile.resultUrl);
    } else {
      setLivePreviewUrl(activeFile.url);
    }
  }, [activeFile?.id, activeFile?.status, generating]);`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/app/dashboard/page.tsx', code);
  console.log("Successfully updated useEffect");
} else {
  console.log("Regex not found!");
}
