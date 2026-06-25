const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

// 1. Fix Auto-Save: Debounce and remove resultBlob
const autoSaveRegex = /\/\/ Auto-Save Files when they change\s*useEffect\(\(\) => \{\s*if \(\!activeProjectId\) return;\s*const toStore: StoredJewelryFile\[\] = files\.map\(f => \{\s*const \{ url, detailUrl, resultUrl, \.\.\.rest \} = f;\s*return rest;\s*\}\);\s*saveProjectFiles\(activeProjectId, toStore\)\.catch\(console\.error\);\s*\}, \[files, activeProjectId\]\);/;

const autoSaveReplacement = `  // Auto-Save Files when they change
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!activeProjectId) return;
    
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      const toStore: StoredJewelryFile[] = files.map(f => {
        // DO NOT save resultBlob to prevent 100MB+ IndexedDB writes
        const { url, detailUrl, resultUrl, resultBlob, ...rest } = f;
        return rest;
      });
      saveProjectFiles(activeProjectId, toStore).catch(console.error);
    }, 2000); // 2 second debounce
  }, [files, activeProjectId]);`;

code = code.replace(autoSaveRegex, autoSaveReplacement);

// 2. Cache calculateAutoLighting
// We need to add lighting to processCache, or just calculate it once inside drawComposition and store it.
// processCache currently stores { mainCropped, mainBbox }
const processCacheRegex = /const processCache = useRef\(new Map<string, \{ mainCropped: HTMLCanvasElement, mainBbox: any \}>\(\)\);/;
const processCacheReplacement = `const processCache = useRef(new Map<string, { mainCropped: HTMLCanvasElement, mainBbox: any, autoLighting?: {brightness: number, contrast: number, saturate: number} }>());`;
code = code.replace(processCacheRegex, processCacheReplacement);

const lightingCalcRegex = /        const autoLighting = \(target\.autoAdjust \?\? globalAutoAdjust\) \n          \? calculateAutoLighting\(mainCropped as HTMLCanvasElement\) \n          : \{ brightness: 100, contrast: 100, saturate: 100 \};/;

const lightingCalcReplacement = `        let autoLighting = { brightness: 100, contrast: 100, saturate: 100 };
        if (target.autoAdjust ?? globalAutoAdjust) {
          const cached = processCache.current.get(cacheKey);
          if (cached && cached.autoLighting) {
            autoLighting = cached.autoLighting;
          } else {
            autoLighting = calculateAutoLighting(mainCropped as HTMLCanvasElement);
            if (cached) {
              cached.autoLighting = autoLighting;
              processCache.current.set(cacheKey, cached);
            }
          }
        }`;
code = code.replace(lightingCalcRegex, lightingCalcReplacement);

// 3. Fix Memory Leak in URL.createObjectURL
// We should revoke old URLs. When updating resultUrl, we create a new one.
// We can do it inside the slider preview effect.
const previewEffectRegex = /\/\/ Important: only update if it actually changed to avoid infinite loops, but blob URLs are always new\.\n\s*\/\/ So we just update files state\. Since we don't depend on activeFile\.resultUrl, it's safe\.\n\s*setFiles\(prev => prev\.map\(f => f\.id === activeFile\.id \? \{ \.\.\.f, resultUrl: url, resultBlob: blob \} : f\)\);\n\s*setLivePreviewUrl\(url\);/;

const previewEffectReplacement = `            setFiles(prev => prev.map(f => {
              if (f.id === activeFile.id) {
                if (f.resultUrl && f.resultUrl !== url) URL.revokeObjectURL(f.resultUrl); // Revoke old
                return { ...f, resultUrl: url, resultBlob: blob };
              }
              return f;
            }));
            setLivePreviewUrl(url);`;
code = code.replace(previewEffectRegex, previewEffectReplacement);

// 4. Add loading="lazy" to grid images
const imgTagRegex = /<img src=\{f\.resultUrl \|\| f\.url\} alt=\{f\.name\} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" \/>/;
const imgTagReplacement = `<img src={f.resultUrl || f.url} alt={f.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 bg-gray-50" />`;
code = code.replace(imgTagRegex, imgTagReplacement);

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log("Phase 1 patches applied.");
