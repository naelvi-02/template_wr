const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

const oldButtonStart = '{activeFile && !activeFile.detecting && (';
const oldButtonEnd = ')}';

// Wait, I need to match exactly what is there.
const oldSection = `            <div className="relative rounded-3xl overflow-hidden flex items-center justify-center" style={{ aspectRatio: "1 / 1", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
              {activeFile && !activeFile.detecting && (
                <button 
                  onClick={async () => {
                    setIsRenderingPreview(true);
                    const url = await drawComposition(activeFile, scale, posX, posY);
                    if (url) setLivePreviewUrl(url);
                    setIsRenderingPreview(false);
                  }}
                  className="absolute z-20 top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all hover:scale-105" style={{ background: "rgba(229,62,62,0.9)", color: "white", boxShadow: "0 4px 12px rgba(229,62,62,0.3)" }}>
                  <RotateCcw size={12} className={isRenderingPreview ? "animate-spin" : ""} /> Update Preview
                </button>
              )}
              
              {livePreviewUrl || activeFile?.resultUrl ? (`;

const newSection = `            <div className="relative rounded-3xl overflow-hidden flex items-center justify-center" style={{ aspectRatio: "1 / 1", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
              {livePreviewUrl || activeFile?.resultUrl ? (`;

code = code.replace(oldSection, newSection);

// Also let's fix the "Klik 'Update Preview'" text!
const oldText = `<p className="text-sm font-semibold text-[#8A8A9E]">Klik 'Update Preview' untuk merender kanvas...</p>`;
const newText = `<p className="text-sm font-semibold text-[#8A8A9E]">Memuat preview...</p>`;
code = code.replace(oldText, newText);

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log('Update successful');
