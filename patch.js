const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

// 1. Add FolderDown
code = code.replace(', Sun, Contrast, Droplet, Play, Pause, Square, TextCursorInput} from "lucide-react";', ', FolderDown, Sun, Contrast, Droplet, Play, Pause, Square, TextCursorInput} from "lucide-react";');

// 2. Add exportToFolder
const exportFunc = `
  const exportToFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      alert("Browser Anda tidak mendukung fitur ini. Gunakan Chrome atau Edge Desktop.");
      return;
    }
    try {
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      let successCount = 0;
      for (const file of doneFiles) {
        if (!file.resultUrl) continue;
        try {
          const relPath = file.file.webkitRelativePath;
          let targetDir = dirHandle;
          let filename = file.file.name;
          if (relPath) {
            const parts = relPath.split('/');
            filename = parts[parts.length - 1];
            let currentTryDir = dirHandle;
            try {
              for (let i = 1; i < parts.length - 1; i++) currentTryDir = await currentTryDir.getDirectoryHandle(parts[i]);
              targetDir = currentTryDir;
            } catch(e) {
              currentTryDir = dirHandle;
              try {
                for (let i = 0; i < parts.length - 1; i++) currentTryDir = await currentTryDir.getDirectoryHandle(parts[i]);
                targetDir = currentTryDir;
              } catch(e2) {}
            }
          }
          const res = await fetch(file.resultUrl);
          const blob = await res.blob();
          const fileHandle = await targetDir.getFileHandle(filename, { create: true });
          // @ts-ignore
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          if (file.detailFile) {
            const dRelPath = file.detailFile.webkitRelativePath;
            let dTargetDir = dirHandle;
            let dFilename = file.detailFile.name;
            if (dRelPath) {
              const dParts = dRelPath.split('/');
              dFilename = dParts[dParts.length - 1];
              let currentTryDir = dirHandle;
              try {
                for (let i = 1; i < dParts.length - 1; i++) currentTryDir = await currentTryDir.getDirectoryHandle(dParts[i]);
                dTargetDir = currentTryDir;
              } catch(e) {
                currentTryDir = dirHandle;
                try {
                  for (let i = 0; i < dParts.length - 1; i++) currentTryDir = await currentTryDir.getDirectoryHandle(dParts[i]);
                  dTargetDir = currentTryDir;
                } catch(e2) {}
              }
            }
            try {
              await dTargetDir.removeEntry(dFilename);
            } catch(e) {}
          }
          successCount++;
        } catch (err) {
          console.error("Error processing file", file.name, err);
        }
      }
      alert(\`Berhasil menyimpan \${successCount} foto dan menimpa file asli!\`);
      setFiles(prev => prev.map(f => doneFiles.some(d => d.id === f.id) ? { ...f, exported: true } : f));
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err);
        alert("Gagal mengakses folder. Pastikan memberikan izin 'Allow'.");
      }
    }
  };
`;
code = code.replace('  const allReady = pendingTargets.length > 0 && files.every((f) => !f.detecting);', '  const allReady = pendingTargets.length > 0 && files.every((f) => !f.detecting);\n' + exportFunc);

const newButton = `
              <button disabled={doneFiles.length === 0} onClick={exportToFolder} className="relative w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed mt-2" style={{ background: doneFiles.length > 0 ? "linear-gradient(135deg, #E53E3E 0%, #FC8181 100%)" : "rgba(0,0,0,0.03)", color: doneFiles.length > 0 ? "#FFF" : "#8A8A9E", boxShadow: doneFiles.length > 0 ? "0 4px 16px rgba(229,62,62,0.3)" : "none" }}>
                <FolderDown size={15} strokeWidth={2.2} /><span>Simpan ke Folder (Timpa)</span>
              </button>
`;
code = code.replace('<span>Export ZIP ({doneFiles.length})</span>\r\n              </button>', '<span>Export ZIP ({doneFiles.length})</span>\r\n              </button>' + newButton);
code = code.replace('<span>Export ZIP ({doneFiles.length})</span>\n              </button>', '<span>Export ZIP ({doneFiles.length})</span>\n              </button>' + newButton);

fs.writeFileSync('src/app/dashboard/page.tsx', code);
