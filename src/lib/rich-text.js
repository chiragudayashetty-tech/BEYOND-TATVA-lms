// Turns what Chirag types in Studio (course and lesson descriptions) into simple blocks, so line breaks,
// "- " bullet lists and **bold** show the way they were typed. Plain data only, never HTML.
// Returns [{ type: "p", lines: [spans] } | { type: "list", items: [spans] }], spans = [{ text, bold }].

const spans = (line) => line.split(/(\*\*[^*]+\*\*)/).filter(Boolean)
  .map((part) => (/^\*\*[^*]+\*\*$/.test(part) ? { text: part.slice(2, -2), bold: true } : { text: part, bold: false }));

export function parseRichText(text) {
  const blocks = [];
  let open = null; // the paragraph or list being filled
  for (const raw of String(text ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) { open = null; continue; } // an empty line ends the block
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const type = bullet ? "list" : "p";
    if (open?.type !== type) { open = type === "list" ? { type, items: [] } : { type, lines: [] }; blocks.push(open); }
    if (bullet) open.items.push(spans(bullet[1])); else open.lines.push(spans(line));
  }
  return blocks;
}
