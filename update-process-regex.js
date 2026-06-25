const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

const regex = /newEntries\.forEach\(async \(entry\) => \{[\s\S]*?\}\);\s*\}, \[activeId\]\);/;

const replacement = `const processQueue = async () => {
      const maxConcurrency = 3;
      let i = 0;
      const worker = async () => {
        while (i < newEntries.length) {
          const entry = newEntries[i++];
          try {
            let category = entry.category;
            
            if (!category) {
              const base64Image = await compressImageForAI(entry.file);
              const prompt = "Please analyze this jewelry image and reply with ONLY ONE of the following categories: Ring, Necklace, Earrings, Bracelet, Brooch, Pendant. Do not say anything else.";
              
              const response = await fetch("/api/ai", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ prompt, imageBase64: base64Image }),
                });
      
                category = "Ring"; // Default fallback
                if (response.ok) {
                  const data = await response.json();
                  const reply = data.message?.trim() || "";
                  const matched = AI_CATEGORIES.find(c => reply.toLowerCase().includes(c.toLowerCase()));
                  if (matched) category = matched;
                }
            }

            let claspBbox = null;
            if ((category === "Necklace" || category === "Bracelet") && entry.detailFile) {
              try {
                const detailBase64 = await compressImageForAI(entry.detailFile);
                
                const claspPrompt = \`Analyze this jewelry image. Find the specific location of the main clasp/hook (pengait). You MUST return ONLY a JSON object representing a small bounding box tightly enclosing the clasp. Use fractional coordinates (0.0 to 1.0). For example, if the clasp is small and in the top right, return {"cx": 0.8, "cy": 0.2, "w": 0.1, "h": 0.1}. Do NOT return the bounding box of the entire bracelet/necklace. Return ONLY raw JSON, no markdown, no explanation.\`;
                const claspResponse = await fetch("/api/ai", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ prompt: claspPrompt, imageBase64: detailBase64 }),
                });
                
                if (claspResponse.ok) {
                  const data = await claspResponse.json();
                  const reply = data.message || "";
                  const match = reply.match(/\\{[\\s\\S]*\\}/);
                  if (match) {
                    claspBbox = JSON.parse(match[0]);
                  }
                }
              } catch (e) {
                console.error("Failed to detect clasp:", e);
              }
            }

            setFiles((prev) => prev.map((f) => f.id === entry.id ? { ...f, category, claspBbox, detecting: false } : f));
          } catch (e) {
            setFiles((prev) => prev.map((f) => f.id === entry.id ? { ...f, category: "Ring", detecting: false } : f));
          }
        }
      };

      const workers = [];
      for (let j = 0; j < maxConcurrency; j++) {
        workers.push(worker());
      }
      await Promise.all(workers);
    };

    processQueue();
  }, [activeId]);`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/app/dashboard/page.tsx', code);
  console.log("Regex match successful, processQueue applied");
} else {
  console.log("Regex failed to match");
}
