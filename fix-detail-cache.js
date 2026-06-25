const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

const regex = /const kembarId = target\.kembarId;\s*if \(target\.detailFile\) \{\s*if \(kembarId && kembarDetailCache\.current\.has\(kembarId\)\) \{\s*const cachedDet = kembarDetailCache\.current\.get\(kembarId\)!;\s*detailCropped = cachedDet\.detailCropped;\s*resDetails = cachedDet\.resDetails;\s*\} else \{\s*resDetails = await loadAndProcessImage\(target\.detailFile, target\.category\);\s*detailCropped = resDetails\.canvas;\s*if \(kembarId\) \{\s*kembarDetailCache\.current\.set\(kembarId, \{ detailCropped: detailCropped as HTMLCanvasElement, resDetails \}\);\s*\}\s*\}\s*\}/;

const replacement = `if (target.detailFile) {
          if (kembarDetailCache.current.has(cacheKey)) {
            const cachedDet = kembarDetailCache.current.get(cacheKey)!;
            detailCropped = cachedDet.detailCropped;
            resDetails = cachedDet.resDetails;
          } else {
            resDetails = await loadAndProcessImage(target.detailFile, target.category);
            detailCropped = resDetails.canvas;
            kembarDetailCache.current.set(cacheKey, { detailCropped: detailCropped as HTMLCanvasElement, resDetails });
          }
        }`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log("Fixed detail cache logic.");
