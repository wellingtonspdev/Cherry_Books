const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, ".."),
  source = path.join(root, "apps/sdk54"),
  target = path.join(root, "apps/sdk58");
fs.mkdirSync(target, { recursive: true });
for (const name of ["src", "assets", "App.js", "index.js"])
  fs.cpSync(path.join(source, name), path.join(target, name), {
    recursive: true,
  });
const app = JSON.parse(fs.readFileSync(path.join(source, "app.json"), "utf8"));
app.expo.slug = "cherry-books-modern";
delete app.expo.android.edgeToEdgeEnabled;
delete app.expo.newArchEnabled;
fs.writeFileSync(
  path.join(target, "app.json"),
  JSON.stringify(app, null, 2) + "\n",
);
console.log(
  "Código e assets sincronizados. Manifests e lockfiles preservados.",
);
