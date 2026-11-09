import { tokenize } from "./model";
export function linesToAnchors(text, lines) {
  const tokens = tokenize(text),
    starts = [];
  let char = 0;
  for (const token of tokens) {
    starts.push(char);
    char += token.length;
  }
  let offset = 0;
  return lines.map((line) => {
    const found = text.indexOf(line.text, offset);
    if (found >= 0) offset = found;
    let tokenOffset = 0;
    for (let i = 0; i < starts.length; i++) {
      if (starts[i] > offset) break;
      tokenOffset = i;
    }
    offset += line.text.length;
    return { y: line.y, tokenOffset };
  });
}
export function tokenAtLine(lines, y) {
  return (
    (lines.filter((line) => line.y <= y).at(-1) || lines[0])?.tokenOffset || 0
  );
}
export function lineAtToken(lines, tokenOffset) {
  return (
    (lines.filter((line) => line.tokenOffset <= tokenOffset).at(-1) || lines[0])
      ?.y || 0
  );
}
// Web Text does not expose onTextLayout. Measure local text nodes without changing their content.
export function webTextLines(element, text) {
  if (!element?.ownerDocument) return [];
  const document = element.ownerDocument,
    walker = document.createTreeWalker(element, 4),
    nodes = [];
  let node,
    total = 0;
  while ((node = walker.nextNode())) {
    nodes.push({ node, start: total, end: total + node.textContent.length });
    total += node.textContent.length;
  }
  const origin = element.getBoundingClientRect().top,
    lines = [];
  let offset = 0;
  tokenize(text).forEach((token, index) => {
    const entry = nodes.find((n) => offset >= n.start && offset < n.end);
    if (entry) {
      const range = document.createRange();
      range.setStart(entry.node, offset - entry.start);
      range.setEnd(
        entry.node,
        Math.min(entry.node.textContent.length, offset - entry.start + 1),
      );
      const y = Math.round(range.getBoundingClientRect().top - origin);
      if (!lines.some((line) => Math.abs(line.y - y) < 2))
        lines.push({ y, tokenOffset: index });
    }
    offset += token.length;
  });
  return lines;
}
