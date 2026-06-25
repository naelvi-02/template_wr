const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

const oldBlock = `                <div className="flex flex-col gap-6">
                  <Slider label="Scale" value={scale} min={40} max={320} step={2} unit="%" icon={<ZoomIn size={14} strokeWidth={2.2} />} onChange={setScale} />
                  <Slider label="Position X" value={posX} min={-400} max={400} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={setPosX} />
                  <Slider label="Position Y" value={posY} min={-400} max={400} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={setPosY} />
                </div>
                <button onClick={() => { setScale(100); setPosX(0); setPosY(0); }} className="flex items-center gap-2 text-xs font-medium text-[#8A8A9E] hover:text-[#E53E3E] transition-colors self-start"><RotateCcw size={12} strokeWidth={2.2} /> Reset ke default</button>`;

const newBlock = `                <div className="flex flex-col gap-6">
                  <Slider label="Scale" value={activeFile?.scale ?? 100} min={40} max={320} step={2} unit="%" icon={<ZoomIn size={14} strokeWidth={2.2} />} onChange={(val) => {
                    if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, scale: val } : f));
                    else setScale(val);
                  }} />
                  <Slider label="Position X" value={activeFile?.posX ?? 0} min={-400} max={400} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={(val) => {
                    if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, posX: val } : f));
                    else setPosX(val);
                  }} />
                  <Slider label="Position Y" value={activeFile?.posY ?? 0} min={-400} max={400} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={(val) => {
                    if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, posY: val } : f));
                    else setPosY(val);
                  }} />
                </div>
                <button onClick={() => { 
                  if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, scale: undefined, posX: undefined, posY: undefined } : f));
                  else { setScale(100); setPosX(0); setPosY(0); }
                }} className="flex items-center gap-2 text-xs font-medium text-[#8A8A9E] hover:text-[#E53E3E] transition-colors self-start"><RotateCcw size={12} strokeWidth={2.2} /> Reset ke default</button>`;

if (!code.includes('Slider label="Scale" value={scale}')) {
  console.log("String not found?");
} else {
  code = code.replace(oldBlock, newBlock);
  fs.writeFileSync('src/app/dashboard/page.tsx', code);
  console.log("Success");
}
