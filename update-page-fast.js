const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

// 1. Add import
if (!code.includes('getFastBoundingBox')) {
  code = code.replace(/import \{ loadAndProcessImage \} from "@\/lib\/imageProcessor";/, 'import { loadAndProcessImage, getFastBoundingBox } from "@/lib/imageProcessor";');
}

// 2. Update isPreview block to use fastBoundingBox
const regexBbox = /          mainCropped = await loadRaw\(target\.file\);\s*mainBbox = \{ x: 0, y: 0, width: mainCropped\.width, height: mainCropped\.height \};/;
const replacementBbox = `          mainCropped = await loadRaw(target.file);
          const rawBbox = getFastBoundingBox(mainCropped);
          
          // Pad the bounding box slightly so it matches AI crop feel
          const padX = rawBbox.width * 0.05;
          const padY = rawBbox.height * 0.05;
          mainBbox = {
            x: Math.max(0, rawBbox.x - padX),
            y: Math.max(0, rawBbox.y - padY),
            width: Math.min(mainCropped.width - rawBbox.x, rawBbox.width + padX * 2),
            height: Math.min(mainCropped.height - rawBbox.y, rawBbox.height + padY * 2),
            centerX: rawBbox.centerX
          };`;

code = code.replace(regexBbox, replacementBbox);

// 3. Update drawing logic to use multiply mode for preview
const regexDraw = /        \/\/ 3\. Draw Jewelry Object\s*ctx\.save\(\);\s*ctx\.translate\(centerX \+ currentX, centerY \+ currentY\);\s*ctx\.scale\(currentScale \/ 100, currentScale \/ 100\);/;

const replacementDraw = `        // 3. Draw Jewelry Object
        ctx.save();
        if (isPreview) {
          ctx.globalCompositeOperation = "multiply"; // Makes white background invisible
        }
        ctx.translate(centerX + currentX, centerY + currentY);
        ctx.scale(currentScale / 100, currentScale / 100);`;

code = code.replace(regexDraw, replacementDraw);

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log("Success updating page.tsx for fast bbox and multiply!");
