const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const tracked = execFileSync("git", ["ls-files", "--cached"], {
  cwd: root,
  encoding: "utf8",
})
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);
const forbidden = (name) =>
  /(^|\/)(Cherry_Books_V3_Planning|\.local|node_modules|dist|\.expo|mockups_individuais)(\/|$)/i.test(
    name,
  ) ||
  /\.env|\.zip$/i.test(name) ||
  (/\.md$/i.test(name) && name !== "README.md");
for (const file of tracked)
  if (forbidden(file)) throw new Error(`Arquivo interno no índice: ${file}`);
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? walk(path.join(dir, entry.name))
        : [path.join(dir, entry.name)],
    );
}
for (const name of ["App.js", "index.js", "src", "assets"]) {
  const source = path.join(root, "apps/sdk54", name),
    target = path.join(root, "apps/sdk58", name);
  for (const file of fs.statSync(source).isDirectory()
    ? walk(source)
    : [source]) {
    const peer = path.join(target, path.relative(source, file));
    if (
      !fs.existsSync(peer) ||
      !fs.readFileSync(file).equals(fs.readFileSync(peer))
    )
      throw new Error(`Variantes divergentes: ${file}`);
  }
}
for (const sdk of ["sdk54", "sdk58"]) {
  const dir = path.join(root, "apps", sdk),
    manifest = JSON.parse(
      fs.readFileSync(path.join(dir, "package.json"), "utf8"),
    );
  if (!manifest.dependencies.expo.includes(sdk.slice(3)))
    throw new Error(`SDK inesperado: ${sdk}`);
  if (!fs.existsSync(path.join(dir, "package-lock.json")))
    throw new Error(`Lockfile ausente: ${sdk}`);
}
console.log(
  `PASS: ${tracked.length} arquivos no índice sem material interno; código e assets equivalentes; manifests e lockfiles independentes.`,
);
