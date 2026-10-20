/* ---------------------------------------------------------------
   Line-level diff between two prompt versions. Keyed items
   ("Product Name: ...") match by key, plain items match by position.
   The newer side marks unmatched lines "added", the older "removed".
----------------------------------------------------------------*/
function diffSide(sections, against, missing) {
  const peers = new Map(against.map((section) => [section.id, section]));

  return Object.fromEntries(
    sections.map((section) => {
      const peer = peers.get(section.id);
      if (!peer) return [section.id, { whole: missing }];

      if (section.type === "text") {
        return [section.id, { content: section.content === peer.content ? null : "modified" }];
      }

      const items = section.items.map((item, index) => {
        const match = item.key
          ? peer.items?.find((candidate) => candidate.key === item.key)
          : peer.items?.[index];
        if (!match) return missing;
        return match.text === item.text ? null : "modified";
      });
      return [section.id, { items }];
    }),
  );
}

export function diffVersions(left, right, leftIsNewer) {
  if (left.id === right.id) return { left: {}, right: {} };
  return {
    left: diffSide(left.sections, right.sections, leftIsNewer ? "added" : "removed"),
    right: diffSide(right.sections, left.sections, leftIsNewer ? "removed" : "added"),
  };
}

/* Word-level diff for one changed line (spec §9): returns the before and
   after tokens, each marked when it was removed / added. */
export function wordDiff(before, after) {
  const tokens = (text) => text.split(/(\s+|[.,;:!?]+)/).filter(Boolean);
  const a = tokens(before);
  const b = tokens(after);
  const lcs = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const left = [];
  const right = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      left.push({ text: a[i] });
      right.push({ text: b[j] });
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      left.push({ text: a[i], changed: !/^\s+$/.test(a[i]) });
      i += 1;
    } else {
      right.push({ text: b[j], changed: !/^\s+$/.test(b[j]) });
      j += 1;
    }
  }
  a.slice(i).forEach((text) => left.push({ text, changed: !/^\s+$/.test(text) }));
  b.slice(j).forEach((text) => right.push({ text, changed: !/^\s+$/.test(text) }));
  return { before: left, after: right };
}
