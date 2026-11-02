// Backport bounded ICNS/ISO-box parsing while keeping Metro SDK54's image-size v1 API.
// Upstream advisories: GHSA-w3rx-r6r6-pgpr and GHSA-5p2g-fcmc-qvqq.
// Remove this patch when Expo SDK54 supports an upstream patched parser unchanged.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { createRequire } = require("node:module");
const hash = (text) => crypto.createHash("sha256").update(text).digest("hex");
function patchImageSize(sdkRoot = path.resolve(__dirname, "../apps/sdk54")) {
  const requireApp = createRequire(path.join(sdkRoot, "package.json"));
  const requireMetro = createRequire(requireApp.resolve("metro"));
  const root = path.dirname(requireMetro.resolve("image-size"));
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "../package.json"), "utf8"),
  );
  if (manifest.version !== "1.2.1")
    throw new Error(
      `Review the security backport for image-size ${manifest.version}`,
    );
  const specs = [
    {
      file: "types/icns.js",
      original:
        "5e6a097fca237b0bb3b68a1be920e39a3846c0018d8917658b5ed88590a710e8",
      anchor:
        "    const imageLengthOffset = imageOffset + ENTRY_LENGTH_OFFSET;",
      insert:
        '\n    if (imageLengthOffset + 4 > input.length) throw new TypeError("Invalid ICNS header");\n    const entryLength = (0, utils_1.readUInt32BE)(input, imageLengthOffset);\n    if (entryLength < 8 || imageOffset + entryLength > input.length) throw new TypeError("Invalid ICNS entry length");',
    },
    {
      file: "types/utils.js",
      original:
        "e9faf86abcc962a5fc2488a4c3c9d8dc915aa22a0dd6a7bad6556cd9a326c349",
      anchor: "    const boxSize = (0, exports.readUInt32BE)(input, offset);",
      insert:
        '\n    if (input.length - offset < 8 || boxSize < 8) throw new TypeError("Invalid ISO box size");',
    },
  ];
  const changes = specs.map((spec) => {
    const file = path.join(root, spec.file),
      current = fs.readFileSync(file, "utf8");
    const unpatched = current.replace(spec.anchor + spec.insert, spec.anchor);
    if (hash(unpatched) !== spec.original)
      throw new Error(
        `Unexpected parser contents: ${spec.file}. No patch written.`,
      );
    if (!unpatched.includes(spec.anchor))
      throw new Error(`Patch anchor missing: ${spec.file}`);
    return {
      file,
      current,
      patched: unpatched.replace(spec.anchor, spec.anchor + spec.insert),
    };
  });
  for (const change of changes)
    if (change.current !== change.patched)
      fs.writeFileSync(change.file, change.patched);
  return root;
}
module.exports = { patchImageSize };
if (require.main === module) {
  patchImageSize();
  console.log(
    "PASS: image-size 1.2.1 security guards applied; upstream version advisories remain visible to npm audit.",
  );
}
