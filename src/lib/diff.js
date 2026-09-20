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
