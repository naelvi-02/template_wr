const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

const targetStr = `      if (renderTimeout.current) clearTimeout(renderTimeout.current);
      renderTimeout.current = setTimeout(async () => {
        const currentScale = activeFile.scale ?? scale;`;

const replacement = `      if (renderTimeout.current) clearTimeout(renderTimeout.current);
      renderTimeout.current = setTimeout(async () => {
        if (activeFile.status === "done" && activeFile.resultUrl) {
          setLivePreviewUrl(activeFile.resultUrl);
          setIsRenderingPreview(false);
          return;
        }
        const currentScale = activeFile.scale ?? scale;`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/app/dashboard/page.tsx', code);
  console.log("Success updating page.tsx for resultUrl preview!");
} else {
  console.log("String not found");
}
