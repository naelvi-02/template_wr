const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

// 1. Update drawComposition to apply filters
const drawRegex = /      \/\/ Add a slight drop shadow for realism\s*ctx\.save\(\);\s*ctx\.shadowColor = "rgba\(0,0,0,0\.1\)";\s*ctx\.shadowBlur = 20;\s*ctx\.shadowOffsetY = 10;\s*ctx\.drawImage\(mainCropped, cx, cy, drawW, drawH\);\s*ctx\.restore\(\);/;

const drawReplacement = `      // Lighting Adjustment Logic
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
      } catch (e) {
        console.error("Error calculating lighting:", e);
      }

      // Add a slight drop shadow for realism
      ctx.save();
      ctx.filter = filterStr;
      ctx.shadowColor = "rgba(0,0,0,0.1)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 10;
      ctx.drawImage(mainCropped, cx, cy, drawW, drawH);
      ctx.restore();`;

code = code.replace(drawRegex, drawReplacement);

// 2. Also apply to detailCropped
const detailDrawRegex = /        ctx\.drawImage\(\s*detailCropped,\s*cropX,\s*cropY,\s*cropW,\s*cropH,\s*circleX - circleRadius \+ 5,\s*circleY - circleRadius \+ 5,\s*circleRadius \* 2 - 10,\s*circleRadius \* 2 - 10\s*\);/;

const detailDrawReplacement = `        ctx.filter = filterStr;
        ctx.drawImage(
          detailCropped,
          cropX, cropY, cropW, cropH,
          circleX - circleRadius + 5,
          circleY - circleRadius + 5,
          circleRadius * 2 - 10,
          circleRadius * 2 - 10
        );`;
code = code.replace(detailDrawRegex, detailDrawReplacement);

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log("Success step 2 page.tsx");
