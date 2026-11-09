const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");
const fs = require("node:fs");
const Module = require("node:module");

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

const {
  parseBookFile,
  detectFormat,
  parseMarkdownBook,
  parseTextBook,
  parseJsonBook,
  parseDocxBook,
  parseEpubBook,
  parseMobiBook,
  parsePdfBook,
  sanitizeBook,
  searchBookCoverOnline,
} = require(path.join(base, "src/bookImporter"));

// Helper to create a minimal valid zip in memory
function createMinimalZip(files) {
  // files: [ { name: string, data: Buffer } ]
  const entries = [];
  let offset = 0;
  const localHeaders = [];

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, "utf8");
    const dataBuf = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, "utf8");
    const crc = 0; // for minimal uncompressed zip
    const size = dataBuf.length;

    // Local file header: 30 bytes + name length + extra length (0)
    const lh = Buffer.alloc(30 + nameBuf.length);
    lh.writeUInt32LE(0x04034b50, 0); // signature
    lh.writeUInt16LE(20, 4); // version needed
    lh.writeUInt16LE(0, 6); // flags
    lh.writeUInt16LE(0, 8); // compression: 0 = stored
    lh.writeUInt16LE(0, 10); // mod time
    lh.writeUInt16LE(0, 12); // mod date
    lh.writeUInt32LE(crc, 14); // crc32
    lh.writeUInt32LE(size, 18); // comp size
    lh.writeUInt32LE(size, 22); // uncomp size
    lh.writeUInt16LE(nameBuf.length, 26); // file name length
    lh.writeUInt16LE(0, 28); // extra field length
    nameBuf.copy(lh, 30);

    entries.push({
      name: file.name,
      nameBuf,
      offset,
      size,
      dataBuf,
    });

    localHeaders.push(lh);
    localHeaders.push(dataBuf);
    offset += lh.length + dataBuf.length;
  }

  const centralDirStart = offset;
  const cdHeaders = [];

  for (const entry of entries) {
    const cdh = Buffer.alloc(46 + entry.nameBuf.length);
    cdh.writeUInt32LE(0x02014b50, 0); // signature
    cdh.writeUInt16LE(20, 4); // version made by
    cdh.writeUInt16LE(20, 6); // version needed
    cdh.writeUInt16LE(0, 8); // flags
    cdh.writeUInt16LE(0, 10); // compression: 0
    cdh.writeUInt16LE(0, 12); // mod time
    cdh.writeUInt16LE(0, 14); // mod date
    cdh.writeUInt32LE(0, 16); // crc32
    cdh.writeUInt32LE(entry.size, 20); // comp size
    cdh.writeUInt32LE(entry.size, 24); // uncomp size
    cdh.writeUInt16LE(entry.nameBuf.length, 28); // name len
    cdh.writeUInt16LE(0, 30); // extra len
    cdh.writeUInt16LE(0, 32); // comment len
    cdh.writeUInt16LE(0, 34); // disk start
    cdh.writeUInt16LE(0, 36); // internal attrs
    cdh.writeUInt32LE(0, 38); // external attrs
    cdh.writeUInt32LE(entry.offset, 42); // local header offset
    entry.nameBuf.copy(cdh, 46);
    cdHeaders.push(cdh);
    offset += cdh.length;
  }

  const centralDirSize = offset - centralDirStart;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4); // disk num
  eocd.writeUInt16LE(0, 6); // start disk
  eocd.writeUInt16LE(entries.length, 8); // entries on disk
  eocd.writeUInt16LE(entries.length, 10); // total entries
  eocd.writeUInt32LE(centralDirSize, 12); // cd size
  eocd.writeUInt32LE(centralDirStart, 16); // cd offset
  eocd.writeUInt16LE(0, 20); // comment len

  return Buffer.concat([...localHeaders, ...cdHeaders, eocd]);
}

test("detectFormat reconhece extensões e assinaturas binárias", () => {
  assert.equal(detectFormat("livro.txt", "texto"), "text");
  assert.equal(detectFormat("livro.md", "# Titulo"), "markdown");
  assert.equal(detectFormat("livro.json", '{"title":"Test"}'), "json");
  assert.equal(detectFormat("doc.docx", Buffer.from("PK\x03\x04")), "docx");
  assert.equal(detectFormat("livro.epub", Buffer.from("PK\x03\x04")), "epub");
  assert.equal(detectFormat("livro.pdf", Buffer.from("%PDF-1.4")), "pdf");
  assert.equal(detectFormat("livro.mobi", Buffer.alloc(100)), "mobi");
});

test("parseTextBook divide capítulos por marcadores ou parágrafos", () => {
  const content = `Capítulo 1: O Começo
Este é o primeiro parágrafo do capítulo introdutório. Tem tamanho suficiente.
Segundo parágrafo com observações importantes sobre o modelo acadêmico.

Capítulo 2: O Desenvolvimento
Aqui iniciamos o segundo momento da obra, com discussões aprofundadas.
Concluímos este bloco com referências acadêmicas claras e fundamentadas.`;

  const book = parseTextBook(content, "Meu Livro Texto");
  assert.equal(book.title, "Meu Livro Texto");
  assert.equal(book.chapters.length, 2);
  assert.equal(book.chapters[0].title, "Capítulo 1: O Começo");
  assert.equal(book.chapters[0].blocks.length, 2);
  assert.ok(book.chapters[0].blocks[0].text.includes("primeiro parágrafo"));
  assert.equal(book.chapters[1].title, "Capítulo 2: O Desenvolvimento");
});

test("parseMarkdownBook converte títulos em capítulos e cercas em código", () => {
  const md = `# Manual de Arquitetura de Software
Autor: Alan Turing

## Fundamentos
A arquitetura de software define as estruturas fundamentais de um sistema.
Cada componente possui responsabilidades delimitadas e contratos claros.

\`\`\`javascript
const sistema = { status: "ativo" };
\`\`\`

## Padrões Modernos
Microsserviços e sistemas modulares permitem desacoplamento e escala.
A observabilidade garante a integridade das transações distribuídas.`;

  const book = parseMarkdownBook(md, "Manual");
  assert.equal(book.title, "Manual de Arquitetura de Software");
  assert.equal(book.author, "Alan Turing");
  assert.equal(book.chapters.length, 2);
  assert.equal(book.chapters[0].title, "Fundamentos");
  assert.equal(book.chapters[0].blocks[0].type, "text");
  assert.equal(book.chapters[0].blocks[2].type, "code");
  assert.ok(book.chapters[0].blocks[2].text.includes("status: \"ativo\""));
  assert.equal(book.chapters[1].title, "Padrões Modernos");
});

test("parseJsonBook valida schema estrito do Cherry Books", () => {
  const valid = {
    title: "Livro JSON",
    author: "Ada Lovelace",
    category: "Programação",
    synopsis: "Sinopse do livro em formato nativo.",
    chapters: [
      {
        id: "c1",
        title: "Capítulo Único",
        blocks: [
          { id: "b1", type: "text", text: "Texto com mais de vinte caracteres para passar na validação estrita." }
        ]
      }
    ]
  };

  const book = parseJsonBook(JSON.stringify(valid));
  assert.equal(book.title, "Livro JSON");
  assert.equal(book.chapters.length, 1);
  assert.equal(book.chapters[0].blocks[0].type, "text");

  // Rejeita JSON malformado ou incompleto
  assert.throws(() => parseJsonBook("{"), /JSON inválido/);
  assert.throws(() => parseJsonBook(JSON.stringify({ title: "" })), /Schema inválido/);
});

test("parseDocxBook extrai parágrafos, headings e metadados de arquivo OOXML", () => {
  const documentXml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>Introdução aos Sistemas</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Este é o primeiro parágrafo extraído diretamente do documento Word DOCX.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>Arquitetura Distribuída</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Segundo capítulo detalhando comunicação assíncrona e tolerância a falhas.</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

  const coreXml = `<?xml version="1.0" encoding="UTF-8"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>Engenharia de Software Moderna</dc:title>
  <dc:creator>Margaret Hamilton</dc:creator>
  <dc:description>Guia prático para sistemas de missão crítica.</dc:description>
</cp:coreProperties>`;

  const zipBuf = createMinimalZip([
    { name: "word/document.xml", data: documentXml },
    { name: "docProps/core.xml", data: coreXml },
  ]);

  const book = parseDocxBook(zipBuf, "Documento.docx");
  assert.equal(book.title, "Engenharia de Software Moderna");
  assert.equal(book.author, "Margaret Hamilton");
  assert.equal(book.chapters.length, 2);
  assert.equal(book.chapters[0].title, "Introdução aos Sistemas");
  assert.ok(book.chapters[0].blocks[0].text.includes("primeiro parágrafo extraído"));
  assert.equal(book.chapters[1].title, "Arquitetura Distribuída");
});

test("parseEpubBook extrai manifest, spine e capítulos XHTML de container EPUB", () => {
  const containerXml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  const opfXml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Estruturas de Dados Avançadas</dc:title>
    <dc:creator>Donald Knuth</dc:creator>
    <dc:description>Análise aprofundada de árvores e tabelas hash.</dc:description>
  </metadata>
  <manifest>
    <item id="ch1" href="cap1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="cap2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>`;

  const cap1 = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>Capítulo 1: Árvores Binárias</title></head>
  <body>
    <h1>Capítulo 1: Árvores Binárias</h1>
    <p>Árvores binárias de busca garantem busca em tempo logarítmico balanceado.</p>
    <p>A rotação à esquerda equilibra o fator de balanceamento do nó raiz.</p>
  </body>
</html>`;

  const cap2 = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>Capítulo 2: Tabelas Hash</title></head>
  <body>
    <h1>Capítulo 2: Tabelas Hash</h1>
    <p>Tratamento de colisões por encadeamento ou endereçamento aberto com sondagem.</p>
  </body>
</html>`;

  const zipBuf = createMinimalZip([
    { name: "META-INF/container.xml", data: containerXml },
    { name: "OEBPS/content.opf", data: opfXml },
    { name: "OEBPS/cap1.xhtml", data: cap1 },
    { name: "OEBPS/cap2.xhtml", data: cap2 },
  ]);

  const book = parseEpubBook(zipBuf, "Livro.epub");
  assert.equal(book.title, "Estruturas de Dados Avançadas");
  assert.equal(book.author, "Donald Knuth");
  assert.equal(book.chapters.length, 2);
  assert.equal(book.chapters[0].title, "Capítulo 1: Árvores Binárias");
  assert.equal(book.chapters[0].blocks.length, 2);
  assert.equal(book.chapters[1].title, "Capítulo 2: Tabelas Hash");
});

test("parseMobiBook decodifica PalmDOC sem DRM e rejeita arquivos com DRM", () => {
  // 1. Testa rejeição com DRM: encryption_type = 2
  const drmMobi = Buffer.alloc(128);
  drmMobi.write("Test DRM Book", 0);
  drmMobi.write("BOOKMOBI", 60);
  // PalmDOC header starts at record 0 (simulado em offset 78 para teste rápido)
  drmMobi.writeUInt16BE(2, 78 + 12); // encryption type = 2 (Mobipocket DRM)

  assert.throws(
    () => parseMobiBook(drmMobi, "protegido.mobi"),
    /DRM/i,
  );

  // 2. Testa decodificação de MOBI livre sem DRM (encryption_type = 0)
  // Monta PDB header mínimo: 78 bytes
  const textContent = "Capítulo 1\nEste é um texto livre de um livro Kindle MOBI sem criptografia DRM.\n\nSegundo parágrafo detalhado com reflexões acadêmicas sobre literatura.";
  const textBytes = Buffer.from(textContent, "utf8");

  // Record 0: PalmDOC header (16 bytes) + MOBI header
  const rec0 = Buffer.alloc(128);
  rec0.writeUInt16BE(1, 0); // compression: 1 = uncompressed / 2 = PalmDOC
  rec0.writeUInt16BE(0, 2); // unused
  rec0.writeUInt32BE(textBytes.length, 4); // text length
  rec0.writeUInt16BE(1, 8); // record count
  rec0.writeUInt16BE(4096, 10); // record size
  rec0.writeUInt16BE(0, 12); // encryption: 0 = NO DRM
  rec0.write("MOBI", 16); // mobi identifier
  rec0.writeUInt32BE(232, 20); // header length
  rec0.writeUInt32BE(2, 24); // mobi type = book

  // Palm Database header (78 bytes) + record list
  // numRecords = 2 (Record 0 = headers, Record 1 = text)
  const numRecords = 2;
  const headerLen = 78 + 8 * numRecords + 2;
  const pdb = Buffer.alloc(headerLen);
  pdb.write("Kindle Book Open", 0);
  pdb.write("BOOKMOBI", 60);
  pdb.writeUInt16BE(numRecords, 76);

  const rec0Offset = headerLen;
  const rec1Offset = rec0Offset + rec0.length;

  pdb.writeUInt32BE(rec0Offset, 78); // rec 0 offset
  pdb.writeUInt32BE(0, 82); // rec 0 attributes
  pdb.writeUInt32BE(rec1Offset, 86); // rec 1 offset
  pdb.writeUInt32BE(0, 90);

  const fullMobi = Buffer.concat([pdb, rec0, textBytes]);
  const book = parseMobiBook(fullMobi, "KindleOpen.mobi");
  assert.equal(book.title, "Kindle Book Open");
  assert.ok(book.chapters.length >= 1);
  assert.ok(book.chapters[0].blocks[0].text.includes("texto livre de um livro Kindle"));
});

test("parsePdfBook extrai texto de páginas e rejeita PDFs protegidos ou escaneados", () => {
  // 1. Rejeita PDF com /Encrypt
  const encryptedPdf = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Encrypt 2 0 R >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");
  assert.throws(
    () => parsePdfBook(encryptedPdf, "seguro.pdf"),
    /criptografia|senha/i,
  );

  // 2. Rejeita PDF escaneado (sem texto)
  const emptyPdf = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");
  assert.throws(
    () => parsePdfBook(emptyPdf, "escaneado.pdf"),
    /escaneado|sem camada de texto/i,
  );

  // 3. Extrai texto com operadores PDF padrão (BT ... Tj / TJ ... ET)
  const textPdf = Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 120 >>
stream
BT
/F1 12 Tf
(Capitulo 1: Computacao Quantica) Tj
T*
(Os qubits exploram os fenomenos de superposicao e emaranhamento para computacao paralela.) Tj
ET
endstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF`);

  const book = parsePdfBook(textPdf, "quantica.pdf");
  assert.equal(book.chapters.length, 1);
  assert.ok(book.chapters[0].blocks[0].text.includes("qubits"));
});

test("sanitizeBook garante conformidade com contrato do leitor e limites de segurança", () => {
  const oversized = {
    title: "Livro Teste",
    author: "Autor",
    category: "Programação",
    synopsis: "Sinopse",
    chapters: Array.from({ length: 1001 }, (_, i) => ({
      id: `c${i}`,
      title: `Cap ${i}`,
      blocks: [{ id: "b1", type: "text", text: "Texto válido com tamanho mínimo de vinte caracteres." }]
    }))
  };

  assert.throws(
    () => sanitizeBook(oversized),
    /limite de capítulos/i,
  );

  const clean = sanitizeBook({
    title: "  Obra Limpa com Espaços  ",
    author: "",
    category: "",
    synopsis: "",
    chapters: [
      {
        id: "",
        title: "Primeiro Capítulo",
        blocks: [
          { id: "", type: "text", text: "Primeiro bloco de texto com tamanho adequado para leitura no app." }
        ]
      }
    ]
  });

  assert.equal(clean.title, "Obra Limpa com Espaços");
  assert.equal(clean.author, "Autor Desconhecido");
  assert.equal(clean.category, "Geral");
  assert.equal(clean.chapters[0].id, "c1");
  assert.equal(clean.chapters[0].blocks[0].id, "b1");
  assert.ok(Number.isInteger(clean.contentVersion));
});

test("registro dinâmico de catálogo e preservação na hidratação de estado", () => {
  const {
    registerCustomBooks,
    unregisterCustomBook,
    getCustomBooks,
    getAllBooks,
    getBook,
    searchBooks,
  } = require(path.join(base, "src/catalog"));
  const { hydrate, initialState } = require(path.join(base, "src/model"));

  const customBook = {
    id: "meu-livro-personalizado",
    title: "Compiladores Modernos em Rust",
    author: "Grace Hopper",
    category: "Programação",
    synopsis: "Guia de parsing, AST e geradores de código intermediário.",
    contentVersion: 1,
    cover: null,
    format: "markdown",
    chapters: [
      {
        id: "c1",
        title: "Capítulo 1: Léxico",
        blocks: [
          {
            id: "b1",
            type: "text",
            text: "O analisador léxico converte o fluxo de caracteres em tokens semânticos estruturados.",
          },
        ],
      },
    ],
  };

  registerCustomBooks(customBook);
  assert.ok(getBook("meu-livro-personalizado"));
  assert.equal(getBook("meu-livro-personalizado").author, "Grace Hopper");
  assert.ok(getAllBooks().some((b) => b.id === "meu-livro-personalizado"));

  const searchResult = searchBooks("Compiladores");
  assert.ok(searchResult.some((b) => b.id === "meu-livro-personalizado"));

  // Testa hidratação com ID do livro customizado
  const s = initialState();
  s.savedBookIds = ["meu-livro-personalizado", "python"];
  s.progressByBook["meu-livro-personalizado"] = {
    bookId: "meu-livro-personalizado",
    chapterId: "c1",
    blockId: "b1",
    tokenOffset: 0,
    percent: 50,
    completed: false,
    updatedAt: 1000,
  };

  const hydrated = hydrate(JSON.stringify(s));
  assert.ok(hydrated.state.savedBookIds.includes("meu-livro-personalizado"));
  assert.ok(hydrated.state.progressByBook["meu-livro-personalizado"]);

  // Limpeza
  unregisterCustomBook("meu-livro-personalizado");
  assert.equal(getBook("meu-livro-personalizado"), undefined);
});

test("extrai capas automáticas de EPUB, MOBI, DOCX e PDF e preserva capa manual", async () => {
  const fakeJpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
    ...new Array(100).fill(0xaa),
    0xff, 0xd9,
  ]);

  // 1. EPUB com capa via properties="cover-image"
  const containerXml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  const opfXml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Livro com Capa EPUB</dc:title>
    <dc:creator>Ada Lovelace</dc:creator>
  </metadata>
  <manifest>
    <item id="cover-img" href="images/capa.jpg" media-type="image/jpeg" properties="cover-image"/>
    <item id="ch1" href="cap1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
  </spine>
</package>`;

  const cap1 = `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Capítulo 1</h1><p>Conteúdo de teste.</p></body></html>`;

  const epubZip = createMinimalZip([
    { name: "META-INF/container.xml", data: containerXml },
    { name: "OEBPS/content.opf", data: opfXml },
    { name: "OEBPS/images/capa.jpg", data: fakeJpeg },
    { name: "OEBPS/cap1.xhtml", data: cap1 },
  ]);

  const epubBook = parseEpubBook(epubZip, "livro-com-capa.epub");
  assert.ok(epubBook.cover, "Capa do EPUB deve ser extraída");
  assert.ok(epubBook.cover.startsWith("data:image/jpeg;base64,"));

  // 2. MOBI com capa em record PDB
  const mobiBuf = Buffer.alloc(1000);
  mobiBuf.write("Livro Kindle com Capa", 0);
  mobiBuf.write("BOOKMOBI", 60);
  mobiBuf.writeUInt16BE(3, 76); // numRecords = 3
  mobiBuf.writeUInt32BE(100, 78); // rec0Offset = 100
  mobiBuf.writeUInt32BE(300, 78 + 8); // rec1Offset = 300 (text)
  mobiBuf.writeUInt32BE(600, 78 + 16); // rec2Offset = 600 (image)

  // rec 0 (header) em 100
  mobiBuf.writeUInt16BE(0, 100 + 12); // encryption = 0 (livre)
  mobiBuf.writeUInt16BE(1, 100 + 8); // recordCount = 1 text record
  mobiBuf.writeUInt32BE(200, 100 + 20); // mobiHeaderLen
  mobiBuf.writeUInt32BE(2, 100 + 16 + 108); // first_image_index = 2

  // rec 1 (texto)
  Buffer.from("Capítulo 1\nTexto teste de leitura com reflexões acadêmicas.").copy(mobiBuf, 300);

  // rec 2 (imagem JPEG) em offset 600
  fakeJpeg.copy(mobiBuf, 600);

  const mobiBook = parseMobiBook(mobiBuf, "kindle-capa.mobi");
  assert.ok(mobiBook.cover, "Capa do MOBI deve ser extraída dos registros de imagem");
  assert.ok(mobiBook.cover.startsWith("data:image/jpeg;base64,"));

  // 3. DOCX com media/image1.jpeg
  const docxXml = `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Texto do Word</w:t></w:r></w:p></w:body></w:document>`;
  const docxZip = createMinimalZip([
    { name: "word/document.xml", data: docxXml },
    { name: "word/media/image1.jpeg", data: fakeJpeg },
  ]);
  const docxBook = parseDocxBook(docxZip, "documento.docx");
  assert.ok(docxBook.cover, "Capa de mídia do DOCX deve ser extraída");
  assert.ok(docxBook.cover.startsWith("data:image/jpeg;base64,"));

  // 4. PDF com imagem JPEG embutida
  const fakePdf = Buffer.concat([
    Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /XObject /Subtype /Image >>\nstream\n"),
    Buffer.alloc(2500, 0xbb), // padding para tamanho >= 2048
    fakeJpeg,
    Buffer.from("\nendstream\nendobj\nBT /F1 12 Tf (Introdução ao PDF com Capa) Tj ET\n"),
  ]);
  const pdfBook = parsePdfBook(fakePdf, "livro-pdf.pdf");
  assert.ok(pdfBook.cover, "Capa de stream JPEG do PDF deve ser extraída");
  assert.ok(pdfBook.cover.startsWith("data:image/jpeg;base64,"));

  // 5. Preservação de capa personalizada no sanitizeBook
  const sanitized = sanitizeBook({
    title: "Obra com Capa Externa",
    author: "Autor Teste",
    cover: "https://exemplo.com/capa.jpg",
    chapters: [{ title: "C1", blocks: [{ text: "Parágrafo" }] }],
  });
  assert.equal(sanitized.cover, "https://exemplo.com/capa.jpg");
});

test("gerenciamento dinâmico e personalização de categorias temáticas", () => {
  const {
    DEFAULT_CATEGORIES,
    getAllCategories,
    registerCategory,
    registerCategories,
    registerCustomBooks,
    unregisterCustomBook,
    searchBooks,
  } = require(path.join(base, "src/catalog"));

  // 1. Contém categorias padrão e "Todos"
  const withTodos = getAllCategories(true);
  assert.equal(withTodos[0], "Todos");
  for (const def of DEFAULT_CATEGORIES) {
    assert.ok(withTodos.includes(def), `Deve conter categoria padrão ${def}`);
  }

  // 2. Registro manual de categoria personalizada
  const reg1 = registerCategory("Filosofia");
  assert.equal(reg1, "Filosofia");
  assert.ok(getAllCategories().includes("Filosofia"));

  // 3. Sanitização e prevenção de duplicatas (case insensitive e espaços)
  const regDup = registerCategory("  filosofia  ");
  assert.equal(regDup, "Filosofia");
  const countFilosofia = getAllCategories().filter(
    (c) => c.toLowerCase() === "filosofia",
  ).length;
  assert.equal(countFilosofia, 1, "Não deve duplicar categoria existente");

  // 4. Registro de lote
  registerCategories(["DevOps", "Biohacking"]);
  assert.ok(getAllCategories().includes("DevOps"));
  assert.ok(getAllCategories().includes("Biohacking"));

  // 5. Descoberta automática de categoria ao registrar livro personalizado
  registerCustomBooks({
    id: "livro-neuro",
    title: "Mente e Código",
    author: "Santiago Ramón y Cajal",
    category: "Neurociência",
    chapters: [{ title: "C1", blocks: [{ text: "Sinapses" }] }],
  });

  assert.ok(
    getAllCategories().includes("Neurociência"),
    "Nova categoria deve ser adicionada dinamicamente pelo livro",
  );

  // 6. Busca por categoria personalizada
  const searchResults = searchBooks("", "Neurociência");
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0].id, "livro-neuro");

  // Limpeza
  unregisterCustomBook("livro-neuro");
});

test("wrapBuffer, toBuffer e SafeBuffer garantem compatibilidade universal em navegadores", () => {
  const { toBuffer, wrapBuffer, SafeBuffer } = require(path.join(base, "src/bookImporter"));

  // 1. ArrayBuffer para toBuffer
  const ab = new ArrayBuffer(16);
  const dv = new DataView(ab);
  dv.setUint32(0, 0x04034b50, true);
  dv.setUint16(4, 0x1234, true);

  const wrapped = toBuffer(ab);
  assert.equal(wrapped.readUInt32LE(0), 0x04034b50);
  assert.equal(wrapped.readUInt16LE(4), 0x1234);

  // 2. Sub-slice e toString base64 / binary
  const sub = wrapped.slice(0, 6);
  assert.equal(sub.length, 6);
  assert.equal(sub.readUInt32LE(0), 0x04034b50);
  assert.ok(typeof sub.toString("base64") === "string");
  assert.ok(sub.toString("base64").length > 0);

  // 3. String para toBuffer utf8
  const textBuf = toBuffer("Olá Cherry Books", "utf8");
  assert.equal(textBuf.toString("utf8"), "Olá Cherry Books");

  // 4. SafeBuffer global
  assert.ok(SafeBuffer.isBuffer(wrapped));
  assert.ok(SafeBuffer.isBuffer(new Uint8Array(4)));

  // 5. Ingestão de livro usando Uint8Array puro (sem Node Buffer)
  const mdText = "# Livro Web\nAutor: Maria\n\n## Cap 1\nConteúdo puro.";
  const u8 = new TextEncoder().encode(mdText);
  const parsed = parseBookFile({ filename: "web.md", data: u8 });
  assert.equal(parsed.title, "Livro Web");
  assert.equal(parsed.author, "Maria");
  assert.equal(parsed.chapters.length, 1);
});
