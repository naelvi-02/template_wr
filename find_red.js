const fs = require('fs');
const PNG = require('pngjs').PNG;

fs.createReadStream('public/Kosongan No Bg.png')
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function() {
    let mpPixels = [];
    
    // Find red pixels
    for (let y = 1100; y < this.height; y++) {
      for (let x = 0; x < 300; x++) { // search area for MP 19
        let idx = (this.width * y + x) << 2;
        let r = this.data[idx];
        let g = this.data[idx+1];
        let b = this.data[idx+2];
        let a = this.data[idx+3];
        
        if (a > 200 && r > 200 && g < 80 && b < 80) {
          mpPixels.push({x, y});
        }
      }
    }
    
    let sumX = 0, sumY = 0;
    for (let p of mpPixels) {
      sumX += p.x;
      sumY += p.y;
    }
    
    console.log(`MP Center: x=${sumX/mpPixels.length}, y=${sumY/mpPixels.length}`);
    
    let minX = 1200, maxX = 0, minY = 1200, maxY = 0;
    for (let p of mpPixels) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    console.log(`MP Bounding box: minX=${minX}, maxX=${maxX}, minY=${minY}, maxY=${maxY}`);
  });
