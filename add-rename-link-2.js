const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

const anchorStr = `<a href="https://wr.naelvi.com/rename/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all text-[#8A8A9E] hover:text-[#E53E3E] hover:bg-[rgba(229,62,62,0.08)]"><TextCursorInput size={14} strokeWidth={2} /> Rename</a>`;

// Find </nav> and insert the anchor right before it
const navEndIndex = code.indexOf('</nav>');
if (navEndIndex !== -1) {
  code = code.slice(0, navEndIndex) + anchorStr + '\n          ' + code.slice(navEndIndex);
  fs.writeFileSync('src/app/dashboard/page.tsx', code);
  console.log("Success: Added Rename link.");
} else {
  console.log("Error: </nav> not found.");
}
