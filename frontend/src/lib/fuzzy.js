const WORD = /[\p{L}\p{N}]+/gu;
const WORD_CHAR = /[\p{L}\p{N}]/u;

const range = (start, length) => Array.from({ length }, (_, i) => start + i);

/* Positions of `needle`'s letters appearing in order inside `word`, or null. */
function subsequence(needle, word) {
  const indices = [];
  let from = 0;
  for (const char of needle) {
    const found = word.indexOf(char, from);
    if (found === -1) return null;
    indices.push(found);
    from = found + 1;
  }
  return indices;
}

/* Best match of one lowercase query word in `text`, scored 0–1:
   substring at a word start > substring mid-word > letters in order within
   one word that starts with the same letter ("mktg" → "marketing"). The
   last is skipped for `exact` fields, where long prose makes it too loose. */
function matchText(needle, text, exact) {
  const hay = text.toLowerCase();
  const at = hay.indexOf(needle);
  if (at !== -1) {
    const atWordStart = at === 0 || !WORD_CHAR.test(hay[at - 1]);
    return { score: atWordStart ? 1 : 0.8, indices: range(at, needle.length) };
  }
  if (exact || needle.length < 2) return null;

  let best = null;
  for (const { 0: word, index } of hay.matchAll(WORD)) {
    if (word[0] !== needle[0]) continue;
    const indices = subsequence(needle, word);
    if (!indices) continue;
    const score = 0.6 * (needle.length / word.length);
    if (!best || score > best.score) best = { score, indices: indices.map((i) => index + i) };
  }
  return best;
}

/* Lightweight fuzzy search for short, local lists. Every query word must
   match at least one field ({ key, weight, exact }); results come back
   best-first. `hits[key]` holds one Set of matched character positions per
   value of that field (string fields have a single value), for highlighting. */
export function fuzzySearch(items, query, fields) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return items.map((item) => ({ item, score: 0, hits: {} }));

  const results = [];
  for (const item of items) {
    const hits = {};
    let total = 0;
    const matchesEveryWord = words.every((word) => {
      let best = 0;
      fields.forEach(({ key, weight = 1, exact = false }) => {
        const values = [].concat(item[key]);
        values.forEach((value, valueIndex) => {
          const match = matchText(word, value, exact);
          if (!match) return;
          best = Math.max(best, match.score * weight);
          hits[key] ??= values.map(() => new Set());
          match.indices.forEach((position) => hits[key][valueIndex].add(position));
        });
      });
      total += best;
      return best > 0;
    });
    if (matchesEveryWord) results.push({ item, score: total, hits });
  }
  return results.sort((a, b) => b.score - a.score);
}
