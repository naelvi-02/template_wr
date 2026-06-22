const fs = require('fs');
const PNG = require('pngjs').PNG;

fs.createReadStream('public/Kosongan No Bg.png')
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function() {
    let minX = this.width, minY = this.height, maxX = 0, maxY = 0;
    
    // Find red pixels (e.g. R > 200, G < 50, B < 50)
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let idx = (this.width * y + x) << 2;
        let r = this.data[idx];
        let g = this.data[idx+1];
        let b = this.data[idx+2];
        let a = this.data[idx+3];
        
        if (a > 200 && r > 200 && g < 80 && b < 80) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    
    console.log(`Red bounding box: minX=${minX}, maxX=${maxX}, minY=${minY}, maxY=${maxY}`);
    console.log(`Center: x=${(minX + maxX)/2}, y=${(minY + maxY)/2}`);
  });
