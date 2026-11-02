const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { patchImageSize } = require("../scripts/patch-image-size.cjs");
const sdk58 = process.cwd().endsWith("sdk58");
const root = sdk58 ? null : patchImageSize();
const parser = root ? require(path.join(root, "index.js")) : null;
const imageSize = parser && (parser.imageSize || parser.default || parser);
test(
  "patched legacy parser preserves real PNG dimensions and repeatable install",
  { skip: sdk58 },
  () => {
    const image = fs.readFileSync(
      path.resolve(__dirname, "../apps/sdk54/assets/icons/app-icon.png"),
    );
    const result = imageSize(image);
    assert.equal(result.width, 1024);
    assert.equal(result.height, 1024);
    assert.equal(patchImageSize(), root);
  },
);
test(
  "malformed ICNS and ISO boxes terminate instead of looping",
  { skip: sdk58 },
  () => {
    const icns = Buffer.alloc(16);
    icns.write("icns");
    icns.writeUInt32BE(16, 4);
    icns.write("ic07", 8);
    const heif = Buffer.alloc(32);
    heif.write("ftyp", 4);
    heif.write("mif1", 8);
    const jxl = Buffer.alloc(32);
    jxl.write("JXL ", 4);
    jxl.write("ftyp", 12);
    jxl.write("jxl ", 16);
    for (const input of [icns, heif, jxl]) {
      const code = `const m=require(${JSON.stringify(path.join(root, "index.js"))});try{(m.imageSize||m.default||m)(Buffer.from('${input.toString("base64")}','base64'));process.exitCode=2;}catch(e){if(!(e instanceof TypeError))throw e;}`;
      execFileSync(process.execPath, ["-e", code], {
        timeout: 2000,
        stdio: "pipe",
      });
    }
  },
);
test(
  "valid legacy ICNS and HEIF metadata remain readable",
  { skip: sdk58 },
  () => {
    const icns = Buffer.alloc(16);
    icns.write("icns");
    icns.writeUInt32BE(16, 4);
    icns.write("ic07", 8);
    icns.writeUInt32BE(8, 12);
    assert.equal(imageSize(icns).width, 128);
    const heif = Buffer.alloc(64);
    for (const [offset, size, name] of [
      [0, 16, "ftyp"],
      [16, 48, "meta"],
      [28, 36, "iprp"],
      [36, 28, "ipco"],
      [44, 20, "ispe"],
    ]) {
      heif.writeUInt32BE(size, offset);
      heif.write(name, offset + 4);
    }
    heif.write("heic", 8);
    heif.writeUInt32BE(320, 56);
    heif.writeUInt32BE(480, 60);
    assert.equal(imageSize(heif).width, 320);
    assert.equal(imageSize(heif).height, 480);
  },
);
