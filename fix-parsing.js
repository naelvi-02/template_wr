const fs = require('fs');
let code = fs.readFileSync('src/lib/imageProcessor.ts', 'utf-8');

const regex = /if \(tokens\.length > 0\) \{\s*const fullText = nameWithoutExt\.toUpperCase\(\);\s*if \(fullText\.includes\("KL"\) \|\| fullText\.includes\("KALUNG"\) \|\| fullText\.includes\("NECKLACE"\)\) category = "Necklace";\s*else if \(fullText\.includes\("GL"\) \|\| fullText\.includes\("GELANG"\) \|\| fullText\.includes\("BRACELET"\)\) category = "Bracelet";\s*else if \(fullText\.includes\("CC"\) \|\| fullText\.includes\("CINCIN"\) \|\| fullText\.includes\("RING"\)\) category = "Ring";\s*else if \(fullText\.includes\("AT"\) \|\| fullText\.includes\("ANTING"\) \|\| fullText\.includes\("ANT"\) \|\| fullText\.includes\("EARRINGS"\)\) category = "Earrings";\s*else if \(fullText\.includes\("LT"\) \|\| fullText\.includes\("LIONTIN"\) \|\| fullText\.includes\("PENDANT"\)\) category = "Pendant";\s*else if \(fullText\.includes\("BR"\) \|\| fullText\.includes\("BROS"\) \|\| fullText\.includes\("BROOCH"\)\) category = "Brooch";\s*\}/;

const replacement = `if (tokens.length > 0) {
    const fullText = nameWithoutExt.toUpperCase();
    const matchWord = (words) => {
      return words.some(w => new RegExp(\`(?:^|[\\\\s_\\\\-])\${w}(?:[\\\\s_\\\\-]|$)\`, "i").test(fullText));
    };

    if (matchWord(["KL", "KALUNG", "NECKLACE"])) category = "Necklace";
    else if (matchWord(["GL", "GELANG", "BRACELET"])) category = "Bracelet";
    else if (matchWord(["CC", "CINCIN", "RING"])) category = "Ring";
    else if (matchWord(["AT", "ANTING", "ANT", "EARRINGS"])) category = "Earrings";
    else if (matchWord(["LT", "LIONTIN", "PENDANT"])) category = "Pendant";
    else if (matchWord(["BR", "BROS", "BROOCH"])) category = "Brooch";
  }`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/lib/imageProcessor.ts', code);
console.log("Parsing logic fixed.");
