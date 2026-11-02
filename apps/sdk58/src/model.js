import { getBook } from "./catalog";
import { themes, highlightColors } from "./tokens";
export const initialState = () => ({
  version: 1,
  savedBookIds: [],
  progressByBook: {},
  bookmarks: [],
  highlights: [],
  readerPreferences: {
    fontFamily: "Lora",
    fontSize: 18,
    lineHeightRatio: 1.6,
    margins: 20,
    theme: "Papel",
  },
});
export const tokenize = (text) => text.match(/\S+\s*|\s+/g) || [];
export function quoteHash(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}
export function validAnchor(anchor) {
  const book = getBook(anchor?.bookId),
    chapter = book?.chapters.find((c) => c.id === anchor?.chapterId),
    block = chapter?.blocks.find((b) => b.id === anchor?.blockId);
  return (
    !!block &&
    Number.isInteger(anchor.tokenOffset) &&
    anchor.tokenOffset >= 0 &&
    anchor.tokenOffset < tokenize(block.text).length
  );
}
export function makeProgress(
  bookId,
  chapterId,
  blockId,
  tokenOffset = 0,
  completed = false,
) {
  const book = getBook(bookId),
    chapter = book?.chapters.find((c) => c.id === chapterId);
  if (!chapter || !validAnchor({ bookId, chapterId, blockId, tokenOffset }))
    return null;
  const ci = book.chapters.indexOf(chapter),
    bi = chapter.blocks.findIndex((b) => b.id === blockId);
  const percent = completed
    ? 100
    : Math.min(
        99,
        Math.round(
          (100 *
            (ci +
              (bi + tokenOffset / tokenize(chapter.blocks[bi].text).length) /
                chapter.blocks.length)) /
            book.chapters.length,
        ),
      );
  return {
    bookId,
    chapterId,
    blockId,
    tokenOffset,
    percent,
    completed,
    updatedAt: Date.now(),
  };
}
export function validateHighlight(h) {
  if (!h || typeof h !== "object") return false;
  if (
    !validAnchor({ ...h, tokenOffset: h.startToken }) ||
    !Number.isInteger(h.endToken) ||
    h.endToken < h.startToken ||
    !highlightColors[h.color]
  )
    return false;
  const b = getBook(h.bookId),
    block = b.chapters
      .find((c) => c.id === h.chapterId)
      .blocks.find((p) => p.id === h.blockId);
  return (
    h.contentVersion === b.contentVersion &&
    h.endToken < tokenize(block.text).length &&
    h.quoteHash ===
      quoteHash(
        tokenize(block.text)
          .slice(h.startToken, h.endToken + 1)
          .join(""),
      ) &&
    typeof h.id === "string" &&
    typeof h.note === "string" &&
    h.note.length <= 2000
  );
}
export function hydrate(raw) {
  const empty = initialState();
  if (!raw) return { state: empty, recovered: false };
  try {
    const value = JSON.parse(raw);
    if (value.version !== 1) throw new Error("Versão desconhecida");
    const state = initialState(),
      p = value.readerPreferences || {};
    state.savedBookIds = [
      ...new Set(
        (Array.isArray(value.savedBookIds) ? value.savedBookIds : []).filter(
          (id) => getBook(id),
        ),
      ),
    ];
    for (const [id, anchor] of Object.entries(value.progressByBook || {}))
      if (id === anchor?.bookId && validAnchor(anchor))
        state.progressByBook[id] = {
          ...makeProgress(
            id,
            anchor.chapterId,
            anchor.blockId,
            anchor.tokenOffset,
            anchor.completed === true,
          ),
          updatedAt: Number(anchor.updatedAt) || 0,
        };
    state.bookmarks = (
      Array.isArray(value.bookmarks) ? value.bookmarks : []
    ).filter((a) => validAnchor(a));
    state.highlights = (
      Array.isArray(value.highlights) ? value.highlights : []
    ).filter(validateHighlight);
    state.readerPreferences = {
      fontFamily: ["Lora", "Inter", "Playfair"].includes(p.fontFamily)
        ? p.fontFamily
        : "Lora",
      fontSize: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26].includes(
        p.fontSize,
      )
        ? p.fontSize
        : 18,
      lineHeightRatio: [1.45, 1.6, 1.75].includes(p.lineHeightRatio)
        ? p.lineHeightRatio
        : 1.6,
      margins: [16, 20, 32].includes(p.margins) ? p.margins : 20,
      theme: themes[p.theme] ? p.theme : "Papel",
    };
    return {
      state,
      recovered: JSON.stringify(state) !== JSON.stringify(value),
    };
  } catch {
    return { state: empty, recovered: true };
  }
}
export function createWriteQueue(write) {
  let pending = Promise.resolve();
  return (value) => {
    const result = pending.catch(() => {}).then(() => write(value));
    pending = result;
    return result;
  };
}
