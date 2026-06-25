const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

const regex = /  const drawComposition = async \(target: JewelryFile, overrideScale\?: number, overrideX\?: number, overrideY\?: number, isPreview: boolean = false\): Promise<string \| null> => \{[\s\S]*?const scaleDown = isPreview \? 0\.35 : 1\.0;/;

const replacement = `  const drawComposition = async (target: JewelryFile, overrideScale?: number, overrideX?: number, overrideY?: number, isPreview: boolean = false): Promise<string | null> => {
    try {
      let mainCropped: HTMLImageElement | HTMLCanvasElement;
      let mainBbox: any;
      let detailCropped: HTMLImageElement | HTMLCanvasElement | null = null;
      let resDetails: any = null;

      const cacheKey = target.id;

      if (isPreview) {
        // FAST PREVIEW: Just load raw image without AI background removal!
        const loadRaw = async (file: File) => {
          const url = URL.createObjectURL(file);
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
          });
          URL.revokeObjectURL(url);
          return img;
        };

        mainCropped = await loadRaw(target.file);
        mainBbox = { x: 0, y: 0, width: mainCropped.width, height: mainCropped.height };

        if (target.detailFile) {
          detailCropped = await loadRaw(target.detailFile);
          resDetails = { bbox: { x: 0, y: 0, width: detailCropped.width, height: detailCropped.height }, originalWidth: detailCropped.width, originalHeight: detailCropped.height };
        }
      } else {
        // GENERATE MODE: Full AI processing
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
      }

      const templateImg = await getTemplateImg();
      const logicalW = templateImg.width;
      const logicalH = templateImg.height;

      const scaleDown = isPreview ? 0.35 : 1.0;`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/app/dashboard/page.tsx', code);
  console.log("Success updating drawComposition for fast raw preview!");
} else {
  console.log("Regex not found");
}
