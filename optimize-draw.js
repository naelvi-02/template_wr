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

// 3. Modify templateImg loading inside drawComposition
const oldTemplateLoad = `      const templateImg = new Image();
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
      if (!ctx) return null;`;

const newTemplateLoad = `      const templateImg = await getTemplateImg();
      const logicalW = templateImg.width;
      const logicalH = templateImg.height;

      const scaleDown = isPreview ? 0.35 : 1.0;
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = logicalW * scaleDown;
      finalCanvas.height = logicalH * scaleDown;
      const ctx = finalCanvas.getContext("2d");
      if (!ctx) return null;
      
      ctx.scale(scaleDown, scaleDown);`;

code = code.replace(oldTemplateLoad, newTemplateLoad);

// 4. Replace finalCanvas.width and finalCanvas.height with logicalW and logicalH in drawComposition
// We will do a targeted string replacement just within the drawComposition function body.
const drawCompStart = code.indexOf('const drawComposition = async');
const drawCompEnd = code.indexOf('const handleGenerate = async', drawCompStart);
let drawCompBody = code.substring(drawCompStart, drawCompEnd);

drawCompBody = drawCompBody.replace(/finalCanvas\.width/g, 'logicalW');
drawCompBody = drawCompBody.replace(/finalCanvas\.height/g, 'logicalH');
// Wait, the declaration \`finalCanvas.width = logicalW * scaleDown\` is inside drawCompBody!
// Let's fix that specific part back.
drawCompBody = drawCompBody.replace('logicalW = logicalW * scaleDown;', 'finalCanvas.width = logicalW * scaleDown;');
drawCompBody = drawCompBody.replace('logicalH = logicalH * scaleDown;', 'finalCanvas.height = logicalH * scaleDown;');

// Also fix the return statement to use toBlob
const oldReturn = `return finalCanvas.toDataURL("image/jpeg", 0.95);`;
const newReturn = `      if (isPreview) {
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
drawCompBody = drawCompBody.replace(oldReturn, newReturn);

code = code.substring(0, drawCompStart) + drawCompBody + code.substring(drawCompEnd);

// 5. Update drawComposition calls in useEffect and handleGenerate
code = code.replace(
  'const url = await drawComposition(activeFile, currentScale, currentX, currentY);',
  'const url = await drawComposition(activeFile, currentScale, currentX, currentY, true);'
);

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log("Success");
