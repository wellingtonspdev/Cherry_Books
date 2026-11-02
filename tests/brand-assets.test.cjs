const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path");
const assets = path.resolve(__dirname, "../apps/sdk54/assets");
test("seven logo masters are path-based vectors without embedded bitmaps or font dependencies", () => {
  for (const name of [
    "primary",
    "horizontal",
    "vertical",
    "compact",
    "symbol",
    "monochrome",
    "inverted",
  ]) {
    const svg = fs.readFileSync(
      path.join(assets, `brand/logo-${name}.svg`),
      "utf8",
    );
    assert.match(svg, /<path\b/);
    assert.match(svg, /viewBox="[^"]+"/);
    assert.doesNotMatch(svg, /<image\b|data:image|<text\b/);
  }
  const flower = fs.readFileSync(
    path.join(assets, "brand/sakura-flower.svg"),
    "utf8",
  );
  assert.equal((flower.match(/rotate\(/g) || []).length, 5);
});
test("platform icons preserve dimensions, opacity and transparent adaptive layers", () => {
  for (const [name, size, colorType] of [
    ["app-icon", 1024, 2],
    ["adaptive-foreground", 1024, 6],
    ["adaptive-monochrome", 1024, 6],
    ["splash-icon", 512, 6],
    ["web-icon-192", 192, 2],
    ["web-icon-512", 512, 2],
    ["web-maskable-512", 512, 2],
    ["favicon", 48, 2],
  ]) {
    const png = fs.readFileSync(path.join(assets, `icons/${name}.png`));
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
    assert.equal(png[25], colorType);
  }
});
