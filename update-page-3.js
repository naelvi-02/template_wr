const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

// 1. Add Auto Adjust toggle and Sliders
const sliderRegex = /                <Slider label="Scale" value=\{activeFile\?\.scale \?\? 100\} min=\{40\} max=\{320\} step=\{2\} unit="%" icon=\{<ZoomIn size=\{14\} strokeWidth=\{2\.2\} \/>\} onChange=\{\(val\) => \{/;
const sliderReplacement = `                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-sm font-semibold text-[#1A1A2E]">Auto Adjust Lighting</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={activeFile?.autoAdjust ?? globalAutoAdjust} onChange={(e) => {
                      const val = e.target.checked;
                      if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, autoAdjust: val } : f));
                      else setGlobalAutoAdjust(val);
                    }} />
                    <div className="w-9 h-5 bg-[#EDEDF3] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#38A169]"></div>
                  </label>
                </div>
                <Slider label="Brightness" value={activeFile?.brightness ?? globalBrightness} min={0} max={200} step={2} unit="%" icon={<Sun size={14} strokeWidth={2.2} />} onChange={(val) => {
                  if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, brightness: val } : f));
                  else setGlobalBrightness(val);
                }} />
                <Slider label="Contrast" value={activeFile?.contrast ?? globalContrast} min={0} max={200} step={2} unit="%" icon={<Contrast size={14} strokeWidth={2.2} />} onChange={(val) => {
                  if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, contrast: val } : f));
                  else setGlobalContrast(val);
                }} />
                <Slider label="Saturation" value={activeFile?.saturate ?? globalSaturate} min={0} max={200} step={2} unit="%" icon={<Droplet size={14} strokeWidth={2.2} />} onChange={(val) => {
                  if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, saturate: val } : f));
                  else setGlobalSaturate(val);
                }} />
                <Slider label="Scale" value={activeFile?.scale ?? 100} min={40} max={320} step={2} unit="%" icon={<ZoomIn size={14} strokeWidth={2.2} />} onChange={(val) => {`;
code = code.replace(sliderRegex, sliderReplacement);

// 2. Add Reset mapping
const resetRegex = /else \{ setScale\(100\); setPosX\(0\); setPosY\(0\); \}/;
const resetReplacement = `else { setScale(100); setPosX(0); setPosY(0); setGlobalAutoAdjust(true); setGlobalBrightness(100); setGlobalContrast(100); setGlobalSaturate(100); }`;
code = code.replace(resetRegex, resetReplacement);

const resetFileRegex = /f\.id === activeFile\.id \|\| \(activeFile\.kembarId && f\.kembarId === activeFile\.kembarId\) \? \{ \.\.\.f, scale: undefined, posX: undefined, posY: undefined \} : f\)\);/;
const resetFileReplacement = `f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, scale: undefined, posX: undefined, posY: undefined, autoAdjust: undefined, brightness: undefined, contrast: undefined, saturate: undefined } : f));`;
code = code.replace(resetFileRegex, resetFileReplacement);

// 3. Replace Generation buttons
const btnRegex = /              <button onClick=\{handleGenerate\} disabled=\{generating \|\| !allReady \|\| pendingTargets\.length === 0\} className="relative w-full flex items-center justify-center gap-2\.5 py-4 rounded-2xl text-white font-semibold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" style=\{\{ background: "linear-gradient\(135deg, #E53E3E 0%, #FC8181 100%\)", boxShadow: allReady && pendingTargets\.length > 0 && !generating \? "0 8px 32px rgba\(229,62,62,0\.4\), 0 2px 8px rgba\(229,62,62,0\.2\)" : "none" \}\}>\s*\{generating \? <><div className="w-4 h-4 border-2 border-white\/40 border-t-white rounded-full animate-spin" \/><span>Memproses foto…<\/span><\/> : <><Sparkles size=\{16\} strokeWidth=\{2\.2\} \/><span>Generate \{pendingTargets\.length > 0 \? \`\$\{pendingTargets\.length\} Foto\` : "Foto"\}<\/span><\/>\}\s*<\/button>/;

const btnReplacement = `              {generateState !== "idle" ? (
                <div className="flex gap-2">
                  <button onClick={generateState === "paused" ? handleGenerate : handlePause} className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-semibold text-sm transition-all hover:opacity-90" style={{ background: generateState === "paused" ? "linear-gradient(135deg, #38A169 0%, #48BB78 100%)" : "linear-gradient(135deg, #DD6B20 0%, #ED8936 100%)", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                    {generateState === "paused" ? <><Play size={16} strokeWidth={2.2} /> Lanjut</> : <><Pause size={16} strokeWidth={2.2} /> Jeda</>}
                  </button>
                  <button onClick={handleStop} className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-semibold text-sm transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg, #E53E3E 0%, #FC8181 100%)", boxShadow: "0 4px 16px rgba(229,62,62,0.3)" }}>
                    <Square size={16} strokeWidth={2.2} /> Stop
                  </button>
                </div>
              ) : (
                <button onClick={handleGenerate} disabled={!allReady || pendingTargets.length === 0} className="relative w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-white font-semibold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "linear-gradient(135deg, #E53E3E 0%, #FC8181 100%)", boxShadow: allReady && pendingTargets.length > 0 ? "0 8px 32px rgba(229,62,62,0.4), 0 2px 8px rgba(229,62,62,0.2)" : "none" }}>
                  <Sparkles size={16} strokeWidth={2.2} /><span>Generate {pendingTargets.length > 0 ? \`\${pendingTargets.length} Foto\` : "Foto"}</span>
                </button>
              )}`;
code = code.replace(btnRegex, btnReplacement);

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log("Success step 3 page.tsx");
