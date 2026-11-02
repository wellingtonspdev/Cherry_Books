const fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, ".."),
  source = path.join(root, "apps/sdk54"),
  output = path.join(root, ".local/snack-sdk54");
fs.mkdirSync(output, { recursive: true });
for (const name of [
  "App.js",
  "index.js",
  "src",
  "assets",
  "app.json",
])
  fs.cpSync(path.join(source, name), path.join(output, name), {
    recursive: true,
  });
const manifest = JSON.parse(fs.readFileSync(path.join(source, "package.json"), "utf8"));
fs.writeFileSync(path.join(output, "package.json"), JSON.stringify({
  name: manifest.name, version: manifest.version, private: true,
  main: "index.js", dependencies: manifest.dependencies,
}, null, 2) + "\n");
function verify(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) verify(file);
    else if (/\.md$|\.env|Planning|mockup/i.test(file))
      throw new Error(`Arquivo proibido: ${file}`);
  }
}
verify(output);
console.log(
  `Pacote local preparado: ${output}. Importação e teste real no Snack ainda necessários.`,
);
