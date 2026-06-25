const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

// 1. Remove isPreview generation in useEffect
const effectRegex = /      if \(!activeFile \|\| activeFile\.detecting \|\| generating\) return;\s*setIsRenderingPreview\(true\);\s*if \(renderTimeout\.current\) clearTimeout\(renderTimeout\.current\);\s*renderTimeout\.current = setTimeout\(async \(\) => \{\s*if \(activeFile\.status === "done" && activeFile\.resultUrl\) \{\s*setLivePreviewUrl\(activeFile\.resultUrl\);\s*setIsRenderingPreview\(false\);\s*return;\s*\}\s*const currentScale = activeFile\.scale \?\? scale;\s*const currentX = activeFile\.posX \?\? posX;\s*const currentY = activeFile\.posY \?\? posY;\s*const url = await drawComposition\(activeFile, currentScale, currentX, currentY, true\);\s*if \(url\) setLivePreviewUrl\(url\);\s*setIsRenderingPreview\(false\);\s*\}, 150\);/;

const newEffect = `      if (!activeFile || activeFile.detecting || generating) return;
      if (activeFile.status === "done" && activeFile.resultUrl) {
        setLivePreviewUrl(activeFile.resultUrl);
      } else {
        // Just show raw image, no preview canvas processing needed!
        setLivePreviewUrl(activeFile.url);
      }`;

if (code.includes('if (!activeFile || activeFile.detecting || generating) return;')) {
  code = code.replace(effectRegex, newEffect);
}

// 2. Remove isPreview from drawComposition
const drawRegex = /if \(isPreview\) \{[\s\S]*?\} else \{/;
const drawReplacement = `if (false) {
      } else {`;
code = code.replace(drawRegex, drawReplacement);

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log("Success updating page.tsx to just show raw image before generate!");
