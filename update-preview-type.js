const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

code = code.replace(/processCache\.current\.set\(cacheKey, \{ mainCropped, mainBbox \}\);/g, 'processCache.current.set(cacheKey, { mainCropped: mainCropped as HTMLCanvasElement, mainBbox });');
code = code.replace(/kembarDetailCache\.current\.set\(kembarId, \{ detailCropped, resDetails \}\);/g, 'kembarDetailCache.current.set(kembarId, { detailCropped: detailCropped as HTMLCanvasElement, resDetails });');

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log("Success casting to HTMLCanvasElement!");
