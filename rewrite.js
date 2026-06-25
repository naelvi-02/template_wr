const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

// 1. Add global cache
if (!code.includes('let globalTemplateImg: HTMLImageElement | null = null;')) {
  code = code.replace(
    'export default function Dashboard() {',
    `let globalTemplateImg: HTMLImageElement | null = null;

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

export default function Dashboard() {`
  );
}

// 2. Modify drawComposition signature
code = code.replace(
  'const drawComposition = async (target: JewelryFile, overrideScale?: number, overrideX?: number, overrideY?: number): Promise<string | null> => {',
  'const drawComposition = async (target: JewelryFile, overrideScale?: number, overrideX?: number, overrideY?: number, isPreview: boolean = false): Promise<string | null> => {'
);

const drawStart = code.indexOf('const drawComposition = async');
const drawEnd = code.indexOf('const handleGenerate = async', drawStart);
let drawCode = code.substring(drawStart, drawEnd);

// 3. Modify templateImg loading inside drawComposition
const targetTemplateLoad = /const templateImg = new Image\(\);[\s\S]*?const ctx = finalCanvas\.getContext\("2d"\);\s*if \(!ctx\) return null;/;

const replacementTemplateLoad = `const templateImg = await getTemplateImg();
      const logicalW = templateImg.width;
      const logicalH = templateImg.height;

      const scaleDown = isPreview ? 0.35 : 1.0;
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = logicalW * scaleDown;
      finalCanvas.height = logicalH * scaleDown;
      const ctx = finalCanvas.getContext("2d");
      if (!ctx) return null;
      
      ctx.scale(scaleDown, scaleDown);`;

drawCode = drawCode.replace(targetTemplateLoad, replacementTemplateLoad);

// 4. Replace finalCanvas.width and finalCanvas.height with logicalW and logicalH
drawCode = drawCode.replace(/finalCanvas\.width/g, 'logicalW');
drawCode = drawCode.replace(/finalCanvas\.height/g, 'logicalH');
drawCode = drawCode.replace('logicalW = logicalW * scaleDown;', 'finalCanvas.width = logicalW * scaleDown;');
drawCode = drawCode.replace('logicalH = logicalH * scaleDown;', 'finalCanvas.height = logicalH * scaleDown;');

// 5. Fix return statement
const oldReturn = /return finalCanvas\.toDataURL\("image\/jpeg", 0\.95\);/;
const newReturn = `if (isPreview) {
        return finalCanvas.toDataURL("image/jpeg", 0.6);
      } else {
        return new Promise<string | null>((resolve) => {
          finalCanvas.toBlob(
            (blob) => {
              if (blob) resolve(URL.createObjectURL(blob));
              else resolve(null);
            },
            "image/jpeg",
            0.95
          );
        });
      }`;
drawCode = drawCode.replace(oldReturn, newReturn);

// Apply back
code = code.substring(0, drawStart) + drawCode + code.substring(drawEnd);

// 6. Update drawComposition calls
code = code.replace(
  'const url = await drawComposition(activeFile, currentScale, currentX, currentY);',
  'const url = await drawComposition(activeFile, currentScale, currentX, currentY, true);'
);

// 7. Update handleGenerate concurrency via regex
const handleGenRegex = /const handleGenerate = async \(\) => \{[\s\S]*?setTimeout\(\(\) => setGenerating\(false\), 400\);\s*\};/;
const newHandleGenerate = `const handleGenerate = async () => {
    const targets = files.filter((f) => !f.detecting && f.status !== "done");
    if (!targets.length || generating) return;

    setGenerating(true);
    setProgress(0);
    setProcessedCount(0);

    setFiles((prev) => prev.map((f) => targets.find((t) => t.id === f.id) ? { ...f, status: "queued", resultUrl: null } : f));

    let doneCount = 0;
    const maxConcurrency = 3;
    let index = 0;
    
    const worker = async () => {
      while (index < targets.length) {
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
    
    setTimeout(() => setGenerating(false), 400);
  };`;

if (handleGenRegex.test(code)) {
  code = code.replace(handleGenRegex, newHandleGenerate);
} else {
  console.log("handleGenerate regex not found");
}

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log("Success phase 1");
