// bookImporter.js - Motor de ingestão e normalização multi-formato para Cherry Books
// Formatos suportados: .txt, .md, .json, .docx, .epub, .mobi/.azw/.azw3 (Kindle sem DRM), .pdf

import { quoteHash, tokenize } from "./model";

// --- Utilitários de Hash e Sanitização ---
export function sanitizeString(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\uD800-\uDFFF]/g, "")
    .trim();
}

export function stripHtml(html) {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<(?:br|p|div|h[1-6]|li|tr)[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
}

export function detectFormat(filename = "", contentOrBuffer = null) {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  if (ext === "md" || ext === "markdown") return "markdown";
  if (ext === "txt") return "text";
  if (ext === "json") return "json";
  if (ext === "docx") return "docx";
  if (ext === "epub") return "epub";
  if (ext === "pdf") return "pdf";
  if (["mobi", "azw", "azw3", "prc"].includes(ext)) return "mobi";

  if (contentOrBuffer) {
    if (typeof contentOrBuffer === "string") {
      const trimmed = contentOrBuffer.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
      if (trimmed.startsWith("#") || trimmed.includes("```")) return "markdown";
      return "text";
    }

    const buf = Buffer.isBuffer(contentOrBuffer)
      ? contentOrBuffer
      : Buffer.from(contentOrBuffer);
    if (buf.length >= 4 && buf.toString("utf8", 0, 4) === "%PDF") return "pdf";
    if (buf.length >= 4 && buf.readUInt32LE(0) === 0x04034b50) {
      if (ext === "docx") return "docx";
      if (ext === "epub") return "epub";
      return "epub";
    }
    if (buf.length >= 68) {
      const ident = buf.toString("ascii", 60, 68);
      if (ident === "BOOKMOBI" || ident === "TEXtREAd") return "mobi";
    }
  }

  return "text";
}

export function sanitizeBook(rawBook) {
  if (!rawBook || typeof rawBook !== "object") {
    throw new Error("Livro inválido: objeto esperado.");
  }

  const title = sanitizeString(rawBook.title) || "Obra Sem Título";
  const author = sanitizeString(rawBook.author) || "Autor Desconhecido";
  const category = sanitizeString(rawBook.category) || "Geral";
  const synopsis = sanitizeString(rawBook.synopsis) || "";
  const rawChapters = Array.isArray(rawBook.chapters) ? rawBook.chapters : [];

  if (rawChapters.length > 1000) {
    throw new Error("Arquivo excede o limite de capítulos permitidos (máximo: 1000).");
  }

  let totalBlocks = 0;
  const chapters = [];

  for (let ci = 0; ci < rawChapters.length; ci++) {
    const rawCh = rawChapters[ci] || {};
    const chTitle = sanitizeString(rawCh.title) || `Capítulo ${ci + 1}`;
    const rawBlocks = Array.isArray(rawCh.blocks) ? rawCh.blocks : [];

    if (rawBlocks.length > 5000) {
      throw new Error(`Capítulo ${ci + 1} excede o limite de 5000 blocos.`);
    }

    const blocks = [];
    for (let bi = 0; bi < rawBlocks.length; bi++) {
      const rawBlk = rawBlocks[bi] || {};
      const text = sanitizeString(rawBlk.text);
      if (!text) continue;

      blocks.push({
        id: sanitizeString(rawBlk.id) || `b${blocks.length + 1}`,
        type: rawBlk.type === "code" ? "code" : "text",
        text,
      });
      totalBlocks++;
    }

    if (blocks.length > 0) {
      chapters.push({
        id: sanitizeString(rawCh.id) || `c${chapters.length + 1}`,
        title: chTitle,
        blocks,
      });
    }
  }

  if (chapters.length === 0) {
    throw new Error("Nenhum conteúdo textual válido encontrado no livro.");
  }

  const sampleText = chapters[0].blocks[0].text;
  const contentVersion =
    Number.isInteger(rawBook.contentVersion) && rawBook.contentVersion > 0
      ? rawBook.contentVersion
      : parseInt(quoteHash(sampleText).slice(0, 7), 16) || 1;

  const id =
    sanitizeString(rawBook.id) ||
    `custom-${quoteHash(title + author + sampleText.slice(0, 40))}`;

  return {
    id,
    title,
    author,
    category,
    synopsis,
    cover: rawBook.cover || null,
    contentVersion,
    format: rawBook.format || "custom",
    chapters,
  };
}

// --- Parser de Texto Puro (.txt) ---
export function parseTextBook(text, defaultTitle = "Obra em Texto") {
  if (typeof text !== "string") throw new Error("Entrada deve ser texto string.");
  const clean = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = clean.split("\n");

  const chapterPattern = /^(?:cap[íi]tulo|chapter|parte|se[çc][ãa]o)\s+[0-9a-zivxlcdm]+[:\-\.]?.*$/i;
  const chapters = [];
  let currentTitle = defaultTitle;
  let currentBlocks = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (chapterPattern.test(trimmed)) {
      if (currentBlocks.length > 0) {
        chapters.push({
          id: `c${chapters.length + 1}`,
          title: currentTitle,
          blocks: currentBlocks,
        });
        currentBlocks = [];
      }
      currentTitle = trimmed;
      continue;
    }

    currentBlocks.push({
      id: `b${currentBlocks.length + 1}`,
      type: "text",
      text: trimmed,
    });
  }

  if (currentBlocks.length > 0) {
    chapters.push({
      id: `c${chapters.length + 1}`,
      title: currentTitle,
      blocks: currentBlocks,
    });
  }

  return sanitizeBook({
    title: defaultTitle,
    format: "text",
    chapters,
  });
}

// --- Parser de Markdown (.md) ---
export function parseMarkdownBook(md, defaultTitle = "Documento Markdown") {
  if (typeof md !== "string") throw new Error("Entrada deve ser string markdown.");
  const clean = md.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = clean.split("\n");

  let bookTitle = defaultTitle;
  let author = "Autor Desconhecido";
  let foundFirstH1 = false;

  const chapters = [];
  let currentTitle = "Início";
  let currentBlocks = [];

  let inCodeBlock = false;
  let codeBuffer = [];

  const flushChapter = () => {
    if (currentBlocks.length > 0) {
      chapters.push({
        id: `c${chapters.length + 1}`,
        title: currentTitle,
        blocks: currentBlocks,
      });
      currentBlocks = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        inCodeBlock = false;
        currentBlocks.push({
          id: `b${currentBlocks.length + 1}`,
          type: "code",
          text: codeBuffer.join("\n"),
        });
        codeBuffer = [];
      } else {
        inCodeBlock = true;
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (!trimmed) continue;

    if (!foundFirstH1 && trimmed.startsWith("# ")) {
      bookTitle = trimmed.slice(2).trim();
      foundFirstH1 = true;
      continue;
    }

    const authorMatch = trimmed.match(/^Autor(?:a)?:\s*(.+)$/i);
    if (authorMatch && author === "Autor Desconhecido") {
      author = authorMatch[1].trim();
      continue;
    }

    if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
      flushChapter();
      currentTitle = trimmed.replace(/^#+\s*/, "").trim();
      continue;
    }

    currentBlocks.push({
      id: `b${currentBlocks.length + 1}`,
      type: "text",
      text: trimmed,
    });
  }

  flushChapter();

  return sanitizeBook({
    title: bookTitle,
    author,
    format: "markdown",
    chapters,
  });
}

// --- Parser de JSON Cherry Books ---
export function parseJsonBook(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error("JSON inválido: erro de sintaxe.");
  }

  if (!parsed || typeof parsed !== "object" || !parsed.title) {
    throw new Error("Schema inválido: título ou estrutura de livro ausente.");
  }

  return sanitizeBook({
    ...parsed,
    format: "json",
  });
}

// --- Leitor de ZIP em Memória (DOCX & EPUB) ---
function parseZipEntries(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (buf.length < 22) throw new Error("Arquivo ZIP truncado ou inválido.");

  // Procura EOCD (End of Central Directory)
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error("Assinatura de diretório central ZIP não encontrada.");
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);

  const entries = new Map();
  let ptr = cdOffset;

  for (let e = 0; e < totalEntries && ptr + 46 <= buf.length; e++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) break;
    const compression = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const uncompSize = buf.readUInt32LE(ptr + 24);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localHeaderOffset = buf.readUInt32LE(ptr + 42);

    const name = buf.toString("utf8", ptr + 46, ptr + 46 + nameLen);
    ptr += 46 + nameLen + extraLen + commentLen;

    // Lê os dados do arquivo a partir do local header
    if (localHeaderOffset + 30 <= buf.length) {
      const localNameLen = buf.readUInt16LE(localHeaderOffset + 26);
      const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      const compData = buf.slice(dataStart, dataStart + compSize);

      entries.set(name, {
        name,
        compression,
        uncompSize,
        readText: () => {
          if (compression === 0) return compData.toString("utf8");
          if (compression === 8) {
            try {
              const zlib = require("node:zlib");
              return zlib.inflateRawSync(compData).toString("utf8");
            } catch {
              return compData.toString("utf8");
            }
          }
          return compData.toString("utf8");
        },
      });
    }
  }

  return entries;
}

// --- Parser de DOCX (Word) ---
export function parseDocxBook(buffer, filename = "documento.docx") {
  const entries = parseZipEntries(buffer);
  const docEntry = entries.get("word/document.xml");
  if (!docEntry) {
    throw new Error("Arquivo DOCX inválido: word/document.xml não encontrado.");
  }

  let title = filename.replace(/\.docx$/i, "");
  let author = "Autor Desconhecido";
  let synopsis = "";

  const coreEntry = entries.get("docProps/core.xml");
  if (coreEntry) {
    const coreXml = coreEntry.readText();
    const tMatch = coreXml.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
    const aMatch = coreXml.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);
    const sMatch = coreXml.match(/<dc:description[^>]*>([\s\S]*?)<\/dc:description>/i);
    if (tMatch && tMatch[1].trim()) title = stripHtml(tMatch[1]);
    if (aMatch && aMatch[1].trim()) author = stripHtml(aMatch[1]);
    if (sMatch && sMatch[1].trim()) synopsis = stripHtml(sMatch[1]);
  }

  const xml = docEntry.readText();
  // Divide parágrafos <w:p>...</w:p>
  const pRegex = /<w:p(?:[\s>][\s\S]*?<\/w:p>)/gi;
  const matches = xml.match(pRegex) || [];

  const chapters = [];
  let currentTitle = "Introdução";
  let currentBlocks = [];

  for (const pXml of matches) {
    // Verifica se é título (Heading)
    const isHeading =
      /w:pStyle\s+w:val=["']Heading/i.test(pXml) ||
      /w:pStyle\s+w:val=["']Ttulo/i.test(pXml);

    // Extrai textos de <w:t>
    const tRegex = /<w:t(?:[\s>][\s\S]*?<\/w:t>)/gi;
    const tMatches = pXml.match(tRegex) || [];
    const text = tMatches
      .map((t) => t.replace(/<[^>]+>/g, ""))
      .join("")
      .trim();

    if (!text) continue;

    if (isHeading) {
      if (currentBlocks.length > 0) {
        chapters.push({
          id: `c${chapters.length + 1}`,
          title: currentTitle,
          blocks: currentBlocks,
        });
        currentBlocks = [];
      }
      currentTitle = text;
    } else {
      currentBlocks.push({
        id: `b${currentBlocks.length + 1}`,
        type: "text",
        text,
      });
    }
  }

  if (currentBlocks.length > 0) {
    chapters.push({
      id: `c${chapters.length + 1}`,
      title: currentTitle,
      blocks: currentBlocks,
    });
  }

  return sanitizeBook({
    title,
    author,
    synopsis,
    format: "docx",
    chapters,
  });
}

// --- Parser de EPUB ---
export function parseEpubBook(buffer, filename = "livro.epub") {
  const entries = parseZipEntries(buffer);
  const containerEntry = entries.get("META-INF/container.xml");
  if (!containerEntry) {
    throw new Error("Arquivo EPUB inválido: META-INF/container.xml ausente.");
  }

  const containerXml = containerEntry.readText();
  const rootfileMatch = containerXml.match(/full-path=["']([^"']+)["']/i);
  if (!rootfileMatch) {
    throw new Error("EPUB: Caminho do pacote .opf não encontrado.");
  }

  const opfPath = rootfileMatch[1];
  const opfEntry = entries.get(opfPath);
  if (!opfEntry) {
    throw new Error(`EPUB: Arquivo de manifesto ${opfPath} ausente.`);
  }

  const opfXml = opfEntry.readText();
  const opfDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";

  let title = filename.replace(/\.epub$/i, "");
  let author = "Autor Desconhecido";
  let synopsis = "";

  const tMatch = opfXml.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
  const aMatch = opfXml.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);
  const sMatch = opfXml.match(/<dc:description[^>]*>([\s\S]*?)<\/dc:description>/i);
  if (tMatch && tMatch[1].trim()) title = stripHtml(tMatch[1]);
  if (aMatch && aMatch[1].trim()) author = stripHtml(aMatch[1]);
  if (sMatch && sMatch[1].trim()) synopsis = stripHtml(sMatch[1]);

  // Mapeia manifest items: id -> href
  const manifest = new Map();
  const itemRegex = /<item\s+[^>]*id=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = itemRegex.exec(opfXml)) !== null) {
    manifest.set(m[1], opfDir + m[2]);
  }

  // Lê spine itemrefs
  const spineRegex = /<itemref\s+[^>]*idref=["']([^"']+)["'][^>]*>/gi;
  const spine = [];
  while ((m = spineRegex.exec(opfXml)) !== null) {
    const href = manifest.get(m[1]);
    if (href) spine.push(href);
  }

  const chapters = [];
  for (const href of spine) {
    const entry = entries.get(href) || entries.get(decodeURIComponent(href));
    if (!entry) continue;

    const xhtml = entry.readText();
    // Extrai título do capítulo
    const h1Match = xhtml.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i);
    const titleMatch = xhtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const chapterTitle = stripHtml((h1Match && h1Match[1]) || (titleMatch && titleMatch[1]) || `Capítulo ${chapters.length + 1}`);

    // Extrai parágrafos <p>
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    const blocks = [];
    let pMatch;
    while ((pMatch = pRegex.exec(xhtml)) !== null) {
      const text = stripHtml(pMatch[1]);
      if (text.length > 0) {
        blocks.push({
          id: `b${blocks.length + 1}`,
          type: "text",
          text,
        });
      }
    }

    if (blocks.length > 0) {
      chapters.push({
        id: `c${chapters.length + 1}`,
        title: chapterTitle,
        blocks,
      });
    }
  }

  return sanitizeBook({
    title,
    author,
    synopsis,
    format: "epub",
    chapters,
  });
}

// --- Parser de MOBI / AZW3 (Kindle) ---
export function parseMobiBook(buffer, filename = "livro.mobi") {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (buf.length < 78) {
    throw new Error("Arquivo MOBI inválido: cabeçalho PalmDOC corrompido.");
  }

  // Detecta DRM prematuramente se sinalizado em offset 78+12 ou no record 0
  if (buf.length >= 92) {
    const encFast = buf.readUInt16BE(90); // offset 78 + 12
    if (encFast === 1 || encFast === 2) {
      throw new Error("Arquivo Kindle protegido por DRM não é suportado pelo Cherry Books.");
    }
  }

  let title = buf.toString("ascii", 0, 32).replace(/\0/g, "").trim() || filename.replace(/\.mobi$/i, "");
  const numRecords = buf.readUInt16BE(76);

  if (numRecords < 1) {
    throw new Error("Arquivo MOBI sem registros.");
  }

  // Offset do record 0
  const rec0Offset = buf.readUInt32BE(78);
  if (rec0Offset + 14 > buf.length) {
    throw new Error("Offset de cabeçalho MOBI fora dos limites do arquivo.");
  }

  // Verifica DRM (encryption_type em Record 0, offset 12)
  const encryptionType = buf.readUInt16BE(rec0Offset + 12);
  if (encryptionType !== 0) {
    throw new Error("Arquivo Kindle protegido por DRM não é suportado pelo Cherry Books.");
  }

  // Verifica contagem de records de texto
  const recordCount = buf.readUInt16BE(rec0Offset + 8);
  const textRecords = Math.min(recordCount, numRecords - 1);

  // Lê metadados EXTH (se existirem após MOBI header)
  let author = "Autor Desconhecido";
  let synopsis = "";
  const mobiHeaderLen = buf.readUInt32BE(rec0Offset + 20);
  const exthStart = rec0Offset + 16 + mobiHeaderLen;

  if (exthStart + 12 <= buf.length && buf.toString("ascii", exthStart, exthStart + 4) === "EXTH") {
    const exthCount = buf.readUInt32BE(exthStart + 8);
    let cur = exthStart + 12;
    for (let i = 0; i < exthCount && cur + 8 <= buf.length; i++) {
      const tag = buf.readUInt32BE(cur);
      const len = buf.readUInt32BE(cur + 4);
      if (cur + len > buf.length || len < 8) break;
      const val = buf.toString("utf8", cur + 8, cur + len);
      if (tag === 100) author = sanitizeString(val); // Autor
      if (tag === 103) synopsis = sanitizeString(val); // Sinopse
      if (tag === 503) title = sanitizeString(val); // Título atualizado
      cur += len;
    }
  }

  // Extrai texto dos records
  let rawText = "";
  for (let r = 1; r <= textRecords; r++) {
    const rOffset = buf.readUInt32BE(78 + r * 8);
    const nextOffset = r + 1 < numRecords ? buf.readUInt32BE(78 + (r + 1) * 8) : buf.length;
    if (rOffset < buf.length && nextOffset <= buf.length) {
      const recData = buf.slice(rOffset, nextOffset);
      rawText += recData.toString("utf8");
    }
  }

  const cleanText = stripHtml(rawText);
  return parseTextBook(cleanText, title);
}

// --- Parser de PDF ---
export function parsePdfBook(buffer, filename = "documento.pdf") {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const pdfStr = buf.toString("binary");

  if (!pdfStr.startsWith("%PDF")) {
    throw new Error("Arquivo PDF inválido: cabeçalho %PDF não encontrado.");
  }

  // Verifica proteção / senha (/Encrypt)
  if (/\/Encrypt[\s\/<\[]/i.test(pdfStr)) {
    throw new Error("PDF protegido por senha/criptografia não é suportado.");
  }

  // Extrai blocos de texto PDF (operadores BT ... ET)
  const btRegex = /BT([\s\S]*?)ET/g;
  const textPieces = [];
  let m;

  while ((m = btRegex.exec(pdfStr)) !== null) {
    const block = m[1];
    // Operadores Tj: (texto) Tj
    const tjRegex = /\(([\s\S]*?)\)\s*Tj/g;
    let tj;
    while ((tj = tjRegex.exec(block)) !== null) {
      if (tj[1] && tj[1].trim()) textPieces.push(tj[1].trim());
    }
    // Operadores TJ: [(t1) 20 (t2)] TJ
    const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let tja;
    while ((tja = tjArrayRegex.exec(block)) !== null) {
      const inner = tja[1].replace(/\((.*?)\)/g, "$1 ");
      if (inner.trim()) textPieces.push(inner.trim());
    }
  }

  const fullText = textPieces
    .join("\n")
    .replace(/\\([()\\])/g, "$1")
    .trim();

  if (fullText.length < 20) {
    throw new Error("PDF escaneado ou sem camada de texto selecionável.");
  }

  const title = filename.replace(/\.pdf$/i, "");
  return parseTextBook(fullText, title);
}

// --- Ponto de Entrada Principal ---
export function parseBookFile({ filename, data, type }) {
  const format = type || detectFormat(filename, data);

  switch (format) {
    case "markdown":
      return parseMarkdownBook(typeof data === "string" ? data : data.toString("utf8"), filename);
    case "text":
      return parseTextBook(typeof data === "string" ? data : data.toString("utf8"), filename);
    case "json":
      return parseJsonBook(typeof data === "string" ? data : data.toString("utf8"));
    case "docx":
      return parseDocxBook(data, filename);
    case "epub":
      return parseEpubBook(data, filename);
    case "mobi":
      return parseMobiBook(data, filename);
    case "pdf":
      return parsePdfBook(data, filename);
    default:
      return parseTextBook(typeof data === "string" ? data : data.toString("utf8"), filename);
  }
}
