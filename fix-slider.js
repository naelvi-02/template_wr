const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

const regex = /const pct = \(\(value - min\) \/ \(max - min\)\) \* 100;\s*return \([\s\S]*?\}\);/;

const replacement = `const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#E53E3E]">{icon}</span>
          <span className="text-sm font-medium text-[#1A1A2E]">{label}</span>
        </div>
        <div className="flex items-center justify-end">
          <input 
            type="number" 
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-14 text-right text-sm font-semibold text-[#1A1A2E] tabular-nums bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#E53E3E] focus:outline-none transition-colors py-0.5"
          />
          <span className="text-sm font-semibold text-[#1A1A2E] ml-0.5">{unit}</span>
        </div>
      </div>
      <div className="relative h-1.5 rounded-full bg-[#EDEDF3] group">
        <div className="absolute top-0 left-0 h-full rounded-full transition-all pointer-events-none" style={{ width: \`\${pct}%\`, background: "linear-gradient(to right, #E53E3E, #FC8181)" }} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#E53E3E] shadow-md transition-all group-hover:scale-110 pointer-events-none" style={{ left: \`calc(\${pct}% - 8px)\` }} />
      </div>
    </div>
  );
});`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log("Slider updated successfully.");
