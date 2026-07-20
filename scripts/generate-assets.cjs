const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'apps', 'game-lab', 'public', 'assets', 'cartridges', 'my-game');

// Minimal PNG encoder (solid color rectangle)
function createPNG(w, h, r, g, b, a = 255) {
  const raw = [];
  for (let y = 0; y < h; y++) {
    raw.push(0); // filter byte
    for (let x = 0; x < w; x++) {
      raw.push(r, g, b, a);
    }
  }
  const rawData = Buffer.from(raw);
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawData);

  function crc32(buf) {
    let c = 0xffffffff;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let v = n;
      for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
      table[n] = v;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type, 'ascii');
    const crcB = Buffer.alloc(4);
    crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
    return Buffer.concat([len, typeB, data, crcB]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0);
  ihdrData.writeUInt32BE(h, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;

  return Buffer.concat([sig, chunk('IHDR', ihdrData), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

// Create diamond shape PNG (for ships)
function createDiamond(w, h, r, g, b) {
  const raw = [];
  const cx = w / 2, cy = h / 2;
  for (let y = 0; y < h; y++) {
    raw.push(0);
    for (let x = 0; x < w; x++) {
      const dx = Math.abs(x - cx) / cx;
      const dy = Math.abs(y - cy) / cy;
      if (dx + dy <= 1.0) {
        raw.push(r, g, b, 255);
      } else {
        raw.push(0, 0, 0, 0);
      }
    }
  }
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(raw));

  function crc32(buf) {
    let c = 0xffffffff;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let v = n;
      for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
      table[n] = v;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type, 'ascii');
    const crcB = Buffer.alloc(4); crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
    return Buffer.concat([len, typeB, data, crcB]);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0); ihdrData.writeUInt32BE(h, 4);
  ihdrData[8] = 8; ihdrData[9] = 6;
  return Buffer.concat([sig, chunk('IHDR', ihdrData), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

// Create triangle shape (for player ships pointing up)
function createTriangle(w, h, r, g, b) {
  const raw = [];
  const cx = w / 2;
  for (let y = 0; y < h; y++) {
    raw.push(0);
    const t = y / h;
    const halfW = cx * t;
    for (let x = 0; x < w; x++) {
      if (x >= cx - halfW && x <= cx + halfW) {
        raw.push(r, g, b, 255);
      } else {
        raw.push(0, 0, 0, 0);
      }
    }
  }
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(raw));
  function crc32(buf) {
    let c = 0xffffffff;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) { let v = n; for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1; table[n] = v; }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type, 'ascii');
    const crcB = Buffer.alloc(4); crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
    return Buffer.concat([len, typeB, data, crcB]);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0); ihdrData.writeUInt32BE(h, 4);
  ihdrData[8] = 8; ihdrData[9] = 6;
  return Buffer.concat([sig, chunk('IHDR', ihdrData), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

// Create pentagon/hexagon shape (for bosses)
function createBossShape(w, h, r, g, b, sides = 6) {
  const raw = [];
  const cx = w / 2, cy = h / 2;
  const radius = Math.min(cx, cy) * 0.9;
  for (let y = 0; y < h; y++) {
    raw.push(0);
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const sector = (Math.PI * 2) / sides;
      const mod = ((angle % sector) + sector) % sector;
      const edgeDist = radius * Math.cos(mod - sector / 2);
      if (dist <= edgeDist) {
        raw.push(r, g, b, 255);
      } else {
        raw.push(0, 0, 0, 0);
      }
    }
  }
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(raw));
  function crc32(buf) {
    let c = 0xffffffff;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) { let v = n; for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1; table[n] = v; }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type, 'ascii');
    const crcB = Buffer.alloc(4); crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
    return Buffer.concat([len, typeB, data, crcB]);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0); ihdrData.writeUInt32BE(h, 4);
  ihdrData[8] = 8; ihdrData[9] = 6;
  return Buffer.concat([sig, chunk('IHDR', ihdrData), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

// Create small circle (for bullets)
function createCircle(d, r, g, b) {
  const raw = [];
  const cx = d / 2, cy = d / 2, rad = d / 2;
  for (let y = 0; y < d; y++) {
    raw.push(0);
    for (let x = 0; x < d; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= rad) {
        raw.push(r, g, b, 255);
      } else {
        raw.push(0, 0, 0, 0);
      }
    }
  }
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(raw));
  function crc32(buf) {
    let c = 0xffffffff;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) { let v = n; for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1; table[n] = v; }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type, 'ascii');
    const crcB = Buffer.alloc(4); crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
    return Buffer.concat([len, typeB, data, crcB]);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(d, 0); ihdrData.writeUInt32BE(d, 4);
  ihdrData[8] = 8; ihdrData[9] = 6;
  return Buffer.concat([sig, chunk('IHDR', ihdrData), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

// Create laser beam (tall thin rectangle)
function createLaser(w, h, r, g, b) {
  return createPNG(w, h, r, g, b);
}

// --- Generate all assets ---
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// Player ships (triangle, pointing up) - 128x128
fs.writeFileSync(path.join(OUT, 'Player1.png'), createTriangle(128, 128, 0, 200, 255));   // cyan
fs.writeFileSync(path.join(OUT, 'Player2.png'), createTriangle(128, 128, 255, 100, 255));  // magenta

// Boss ships (hexagon) - 160x160, different colors
const bossColors = [
  [220, 50, 50],    // red
  [255, 140, 0],    // orange
  [255, 215, 0],    // gold
  [50, 200, 50],    // green
  [0, 150, 255],    // blue
  [150, 50, 255],   // purple
  [255, 50, 150],   // pink
  [0, 200, 200],    // teal
  [200, 100, 50],   // brown
  [180, 180, 180],  // silver
];
for (let i = 0; i < 10; i++) {
  const [r, g, b] = bossColors[i];
  fs.writeFileSync(path.join(OUT, `Boss${i + 1}.png`), createBossShape(160, 160, r, g, b, 6));
}

// Gigy minions (small diamond) - 64x64, different colors
const gigyColors = [
  [100, 255, 100],  // lime
  [255, 255, 100],  // yellow
  [100, 200, 255],  // light blue
  [255, 150, 100],  // salmon
  [200, 100, 255],  // violet
  [255, 200, 100],  // amber
];
for (let i = 0; i < 6; i++) {
  const [r, g, b] = gigyColors[i];
  fs.writeFileSync(path.join(OUT, `Gigy${i + 1}.png`), createDiamond(64, 64, r, g, b));
}

// Bullets (small circle) - 24x24
fs.writeFileSync(path.join(OUT, 'Bullet1.png'), createCircle(24, 0, 255, 200));   // cyan-green (player)
fs.writeFileSync(path.join(OUT, 'Bullet2.png'), createCircle(24, 255, 80, 80));   // red (enemy)

// Lasers (tall thin rectangle) - 12x80
fs.writeFileSync(path.join(OUT, 'Laser1.png'), createLaser(12, 80, 0, 255, 255));   // cyan
fs.writeFileSync(path.join(OUT, 'Laser2.png'), createLaser(12, 80, 255, 100, 0));   // orange

console.log('Generated all assets in', OUT);
const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png'));
console.log(`Created ${files.length} PNG files:`, files.join(', '));
