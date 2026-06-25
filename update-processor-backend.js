const fs = require('fs');
let code = fs.readFileSync('src/lib/imageProcessor.ts', 'utf-8');

const regex = /  const \{ removeBackground \} = await import\("@imgly\/background-removal"\);\s*const bgRemovedBlob = await removeBackground\(asBlob, \{\s*progress: \(\) => \{\},\s*\}\);\s*const bgRemovedUrl = URL\.createObjectURL\(bgRemovedBlob\);/;

const replacement = `  // Send to backend API to prevent UI freezing
  const formData = new FormData();
  formData.append("image", asBlob);
  const response = await fetch("/api/remove-bg", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to remove background from backend");
  }

  const bgRemovedBlob = await response.blob();
  const bgRemovedUrl = URL.createObjectURL(bgRemovedBlob);`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/lib/imageProcessor.ts', code);
  console.log("Success replacing removeBackground with API call");
} else {
  console.log("Regex not found");
}
