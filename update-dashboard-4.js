const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

const oldSliderUI = `                <div className="flex flex-col gap-6">
                  <Slider label="Scale" value={scale} min={40} max={320} step={2} unit="%" icon={<ZoomIn size={14} strokeWidth={2.2} />} onChange={setScale} />
                  <Slider label="Position X" value={posX} min={-400} max={400} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={setPosX} />
                  <Slider label="Position Y" value={posY} min={-400} max={400} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={setPosY} />
                </div>
                <button onClick={() => { setScale(100); setPosX(0); setPosY(0); }} className="flex items-center gap-2 text-xs font-medium text-[#8A8A9E] hover:text-[#E53E3E] transition-colors self-start"><RotateCcw size={12} strokeWidth={2.2} /> Reset ke default</button>`;

const newSliderUI = `                <div className="flex flex-col gap-6">
                  <Slider label="Scale" value={activeFile?.scale ?? scale} min={40} max={320} step={2} unit="%" icon={<ZoomIn size={14} strokeWidth={2.2} />} onChange={(val) => {
                    setScale(val);
                    if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, scale: val } : f));
                  }} />
                  <Slider label="Position X" value={activeFile?.posX ?? posX} min={-400} max={400} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={(val) => {
                    setPosX(val);
                    if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, posX: val } : f));
                  }} />
                  <Slider label="Position Y" value={activeFile?.posY ?? posY} min={-400} max={400} step={2} unit="px" icon={<Move size={14} strokeWidth={2.2} />} onChange={(val) => {
                    setPosY(val);
                    if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, posY: val } : f));
                  }} />
                </div>
                <button onClick={() => { 
                  setScale(100); setPosX(0); setPosY(0); 
                  if (activeFile) setFiles(prev => prev.map(f => f.id === activeFile.id || (activeFile.kembarId && f.kembarId === activeFile.kembarId) ? { ...f, scale: undefined, posX: undefined, posY: undefined } : f));
                }} className="flex items-center gap-2 text-xs font-medium text-[#8A8A9E] hover:text-[#E53E3E] transition-colors self-start"><RotateCcw size={12} strokeWidth={2.2} /> Reset ke default</button>`;

code = code.replace(oldSliderUI, newSliderUI);

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log('Update Sliders UI successful');
