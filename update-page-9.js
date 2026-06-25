const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

// Find the corrupted section. It starts around `// 4. Draw Inset Detail (if exists)` and ends before `// 5. Draw Texts (MP & Karat)`.
// We will just replace it.

const startString = `// 4. Draw Inset Detail (if exists)`;
const endString = `// 5. Draw Texts (MP & Karat)`;

const startIndex = code.indexOf(startString);
const endIndex = code.indexOf(endString);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `// 4. Draw Inset Detail (if exists)
      if (detailCropped) {
        const circleRadius = logicalW * 0.12; // 12% of width
        const circleX = circleRadius + 80;
        const circleY = logicalH - circleRadius - 200; // Above footer

        // Draw white circle with shadow
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.15)";
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 10;
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();

        // Draw inner border
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleRadius - 4, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#EDEDF3";
        ctx.stroke();

        // Clip and draw detail image
        ctx.save();
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleRadius - 5, 0, Math.PI * 2);
        ctx.clip();
        
        let cropW = detailCropped.width;
        let cropH = detailCropped.height;

        // CENTER LOCK: Always center the crop on the original detail image
        const origW = resDetails.originalWidth;
        const origH = resDetails.originalHeight;
        let absCx = origW / 2;
        let absCy = origH / 2;

        let size = Math.max(origW, origH);
        const isNecklace = target.category === "Necklace";
        
        if (target.claspBbox) {
          const absW = target.claspBbox.w * origW;
          const absH = target.claspBbox.h * origH;
          size = Math.max(absW, absH) * (isNecklace ? 1.6 : 1.05); 
          const minSize = Math.max(origW * 0.05, 80);
          if (size < minSize) size = minSize;
        } else {
          // FALLBACK
          size = Math.max(origW, origH) * (isNecklace ? 0.35 : 0.25);
        }

        // Apply Manual Detail Adjustments
        const dScale = target.detailScale ?? 100;
        absCx += (target.detailPosX ?? 0);
        absCy += (target.detailPosY ?? 0);
        
        size = size / (dScale / 100);

        const maxSize = Math.max(origW, origH) * 2; // Allow zooming out more
        if (size > maxSize) size = maxSize;

        const croppedCx = absCx - resDetails.bbox.x;
        const croppedCy = absCy - resDetails.bbox.y;

        const cropX = croppedCx - size / 2;
        const cropY = croppedCy - size / 2;
        cropW = size;
        cropH = size;

        // Scale crop area to fit nicely
        const detScale = (circleRadius * 2) / Math.max(cropW, cropH);
        const detW = cropW * detScale;
        const detH = cropH * detScale;

        // Apply lighting if needed
        let filterStr = "none";
        try {
          const autoLighting = (target.autoAdjust ?? globalAutoAdjust) 
            ? calculateAutoLighting(mainCropped as HTMLCanvasElement) 
            : { brightness: 100, contrast: 100, saturate: 100 };
          
          const manualB = (target.brightness ?? globalBrightness);
          const manualC = (target.contrast ?? globalContrast);
          const manualS = (target.saturate ?? globalSaturate);
          
          const finalB = Math.max(0, autoLighting.brightness + (manualB - 100)) / 100;
          const finalC = Math.max(0, autoLighting.contrast + (manualC - 100)) / 100;
          const finalS = Math.max(0, autoLighting.saturate + (manualS - 100)) / 100;
          
          filterStr = \`brightness(\${finalB}) contrast(\${finalC}) saturate(\${finalS})\`;
        } catch (e) {}

        ctx.filter = filterStr;

        // Draw cropped detail image into the circle
        ctx.drawImage(
          detailCropped, 
          cropX, cropY, cropW, cropH, 
          circleX - detW / 2, circleY - detH / 2, detW, detH
        );
        ctx.restore();
      }

      `;

  const newCode = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync('src/app/dashboard/page.tsx', newCode);
  console.log("Fixed corrupted detail logic");
} else {
  console.log("Could not find start or end strings!");
}
