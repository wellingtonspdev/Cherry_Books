const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module");
const baseline = process.cwd().endsWith("sdk58") ? "sdk58" : "sdk54";
const base = path.resolve(__dirname, `../apps/${baseline}`);
const babel = require(path.join(base, "node_modules/@babel/core"));
const original = Module._extensions[".js"];
Module._extensions[".png"] = (module, file) => (module.exports = file);
Module._extensions[".js"] = (module, file) => {
  if (file.startsWith(path.join(base, "src")))
    module._compile(
      babel.transformSync(fs.readFileSync(file, "utf8"), {
        configFile: false,
        babelrc: false,
        plugins: [
          require.resolve("@babel/plugin-transform-modules-commonjs", {
            paths: [base],
          }),
        ],
      }).code,
      file,
    );
  else original(module, file);
};
const { books, searchBooks } = require(path.join(base, "src/catalog"));
const {
  initialState,
  tokenize,
  quoteHash,
  hydrate,
  makeProgress,
  validateHighlight,
  createWriteQueue,
} = require(path.join(base, "src/model"));
test("catálogo original: 12 livros, capas e âncoras únicas", () => {
  assert.equal(books.length, 12);
  assert.equal(new Set(books.map((b) => b.id)).size, 12);
  for (const b of books) {
    assert.ok(fs.existsSync(b.cover));
    assert.equal(b.chapters.length, 3);
    for (const ch of b.chapters) {
      assert.equal(new Set(ch.blocks.map((p) => p.id)).size, ch.blocks.length);
      assert.ok(ch.blocks.every((p) => p.text.length > 20));
    }
  }
});
test("busca normaliza acentos, título, autor e categoria", () => {
  assert.equal(searchBooks("automacao")[0].id, "python");
  assert.equal(searchBooks("CHERRY BOOKS").length, 12);
  assert.equal(searchBooks("", "Segurança").length, 1);
  assert.equal(searchBooks("inexistente").length, 0);
});
test("tokens mantêm texto e intervalo exato com pontuação", () => {
  const text = "Uma frase, com  espaços.\nOutra linha!";
  const t = tokenize(text);
  assert.equal(t.join(""), text);
  assert.equal(t.slice(1, 3).join(""), "frase, com  ");
});
test("progresso valida âncora e conclusão", () => {
  assert.equal(makeProgress("no", "no", "p1"), null);
  assert.equal(makeProgress("arquitetura", "fundamentos", "p1").percent, 0);
  assert.equal(
    makeProgress("arquitetura", "pratica", "p4", 0, true).percent,
    100,
  );
});
test("storage recupera JSON inválido, schema desconhecido e referências inválidas", () => {
  assert.equal(hydrate("{").recovered, true);
  assert.equal(hydrate('{"version":9}').recovered, true);
  const s = initialState();
  s.savedBookIds = ["inexistente", "python", "python"];
  s.progressByBook.no = {};
  assert.deepEqual(hydrate(JSON.stringify(s)).state.savedBookIds, ["python"]);
});
test("grifos/notas persistem e rejeitam intervalo/hash/versão inválidos", () => {
  const block = books[0].chapters[0].blocks[0];
  const h = {
    id: "test",
    bookId: "arquitetura",
    chapterId: "fundamentos",
    blockId: "p1",
    startToken: 2,
    endToken: 5,
    color: "Rosa",
    note: "Nota original",
    contentVersion: 1,
    quoteHash: quoteHash(tokenize(block.text).slice(2, 6).join("")),
  };
  assert.ok(validateHighlight(h));
  for (const patch of [
    { endToken: 9999 },
    { startToken: -1 },
    { quoteHash: "wrong" },
    { contentVersion: 9 },
    { note: null },
  ])
    assert.equal(validateHighlight({ ...h, ...patch }), false);
  const s = initialState();
  s.highlights = [h];
  assert.deepEqual(hydrate(JSON.stringify(s)).state.highlights, [h]);
});
test("preferências corrompidas restauram limites seguros", () => {
  const s = initialState();
  s.readerPreferences = { fontSize: 100, theme: "bad", margins: -1 };
  assert.deepEqual(
    hydrate(JSON.stringify(s)).state.readerPreferences,
    initialState().readerPreferences,
  );
});
test("fila serializa gravações e continua após falha", async () => {
  const writes = [];
  const queue = createWriteQueue(async (x) => {
    await new Promise((r) => setTimeout(r, x === 1 ? 20 : 1));
    if (x === 2) throw Error("disk");
    writes.push(x);
  });
  const a = queue(1),
    b = queue(2).catch(() => {}),
    c = queue(3);
  await Promise.all([a, b, c]);
  assert.deepEqual(writes, [1, 3]);
});
test("contraste mínimo dos temas e grifos", () => {
  const { themes, highlightColors } = require(path.join(base, "src/tokens"));
  const lum = (hex) => {
    const rgb = hex
      .slice(1)
      .match(/../g)
      .map((n) => parseInt(n, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const contrast = (a, b) =>
    (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  for (const t of Object.values(themes))
    assert.ok(contrast(t.ink, t.background) >= 4.5);
  for (const h of Object.values(highlightColors))
    assert.ok(contrast("#402E31", h) >= 4.5);
  assert.ok(contrast("#FFFFFF", "#8F3A50") >= 4.5);
});
const { linesToAnchors, tokenAtLine, lineAtToken } = require(
  path.join(base, "src/anchors"),
);
test("âncora intra-parágrafo preserva token após reflow", () => {
  const text = "Um texto com palavras e linhas.";
  const lines = linesToAnchors(text, [
    { text: "Um texto com ", y: 0 },
    { text: "palavras e linhas.", y: 29 },
  ]);
  assert.equal(tokenAtLine(lines, 35), 3);
  assert.equal(lineAtToken(lines, 4), 29);
  const reflow = linesToAnchors(text, [
    { text: "Um texto ", y: 0 },
    { text: "com palavras ", y: 35 },
    { text: "e linhas.", y: 70 },
  ]);
  assert.equal(lineAtToken(reflow, 4), 70);
});
test("um registro corrompido não apaga favoritos válidos", () => {
  const state = initialState();
  state.savedBookIds = ["python"];
  state.highlights = [null, 3, {}];
  assert.deepEqual(hydrate(JSON.stringify(state)).state.savedBookIds, [
    "python",
  ]);
});
const { chooseMaterial } = require(path.join(base, "src/material-policy"));
test("material respeita capacidade, plataforma e redução de transparência", () => {
  const ios = {
    platform: "ios",
    iosVersion: 26,
    nativeGlass: true,
    blur: true,
    reduceTransparency: false,
  };
  assert.equal(chooseMaterial(ios), "native-glass");
  assert.equal(chooseMaterial({ ...ios, reduceTransparency: true }), "opaque");
  assert.equal(chooseMaterial({ ...ios, highContrast: true }), "opaque");
  assert.equal(chooseMaterial({ ...ios, iosVersion: 25 }), "blur");
  assert.equal(chooseMaterial({ ...ios, nativeGlass: false }), "blur");
  assert.equal(
    chooseMaterial({
      platform: "android",
      blur: true,
      reduceTransparency: false,
    }),
    "opaque",
  );
  assert.equal(
    chooseMaterial({ platform: "web", blur: true, reduceTransparency: false }),
    "blur",
  );
  assert.equal(
    chooseMaterial({ platform: "web", blur: false, reduceTransparency: false }),
    "opaque",
  );
});
