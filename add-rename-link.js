const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

// 1. Add TextCursorInput (or Type or Edit3) to lucide-react imports
if (!code.includes('TextCursorInput')) {
  code = code.replace('from "lucide-react";', ', TextCursorInput} from "lucide-react";');
}

// 2. Add the Rename link to the navbar
const navRegex = /<button onClick=\{\(\) => setActivePage\("settings"\)\} className="flex items-center gap-1\.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"[^>]+><Settings size=\{14\} strokeWidth=\{2\} \/> Setting<\/button>\n\s*<\/nav>/;
const navReplacement = `<button onClick={() => setActivePage("settings")} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all" style={{ background: activePage === "settings" ? "rgba(229,62,62,0.08)" : "transparent", color: activePage === "settings" ? "#E53E3E" : "#8A8A9E" }}><Settings size={14} strokeWidth={2} /> Setting</button>
            <a href="https://wr.naelvi.com/rename/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all text-[#8A8A9E] hover:text-[#E53E3E] hover:bg-[rgba(229,62,62,0.08)]"><TextCursorInput size={14} strokeWidth={2} /> Rename</a>
          </nav>`;

code = code.replace(navRegex, navReplacement);
fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log("Navbar updated with Rename link.");
