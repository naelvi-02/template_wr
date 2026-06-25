const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

const regex = /        let absCx = origW \/ 2;\s*let absCy = origH \/ 2;\s*let size = Math\.max\(origW, origH\);\s*const isNecklace = target\.category === "Necklace";\s*if \(target\.claspBbox\) \{\s*const absW = target\.claspBbox\.w \* origW;\s*const absH = target\.claspBbox\.h \* origH;\s*size = Math\.max\(absW, absH\) \* \(isNecklace \? 1\.6 : 1\.05\);\s*const minSize = Math\.max\(origW \* 0\.05, 80\);\s*if \(size < minSize\) size = minSize;\s*\}/;

const replacement = `        let absCx = origW / 2;
        let absCy = origH / 2;

        let size = Math.max(origW, origH);
        const isNecklace = target.category === "Necklace";
        
        if (target.claspBbox) {
          // Update center to the AI's detected bounding box
          absCx = target.claspBbox.cx * origW;
          absCy = target.claspBbox.cy * origH;

          const absW = target.claspBbox.w * origW;
          const absH = target.claspBbox.h * origH;
          size = Math.max(absW, absH) * (isNecklace ? 1.6 : 1.05); 
          
          // Clamp size to prevent extreme zoom-in or zoom-out
          const minSize = Math.max(origW * 0.15, 120);
          const maxSizeAI = Math.max(origW * 0.5, 300);
          if (size < minSize) size = minSize;
          if (size > maxSizeAI) size = maxSizeAI;
        }`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log("Fixed detail clasp center logic");
