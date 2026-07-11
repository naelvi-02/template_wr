const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

// Fix 1: When hitting Generate button again, ensure exported is false
const regex1 = /setFiles\(\(prev\) => prev\.map\(\(f\) => targets\.find\(\(t\) => t\.id === f\.id\) \? \{ \.\.\.f, status: "queued", resultUrl: null \} : f\)\);/g;
code = code.replace(regex1, `setFiles((prev) => prev.map((f) => targets.find((t) => t.id === f.id) ? { ...f, status: "queued", resultUrl: null, exported: false } : f));`);

// Fix 2: When modifying image (live preview updates), set exported false
const regex2 = /setFiles\(prev => prev\.map\(f => f\.id === activeFile\.id \? \{ \.\.\.f, resultUrl: url, resultBlob: blob \} : f\)\);/g;
code = code.replace(regex2, `setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, resultUrl: url, resultBlob: blob, exported: false } : f));`);

// Fix 3: In the worker response processing just to be safe
const regex3 = /status: success \? "done" : "error",\s*resultUrl: success \? resultUrl : null,\s*resultBlob: success \? resultBlob : undefined/g;
code = code.replace(regex3, `status: success ? "done" : "error", 
          resultUrl: success ? resultUrl : null,
          resultBlob: success ? resultBlob : undefined,
          exported: false`);

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log("Success: exported state reset logic injected.");
