import { useState } from "react";

const LIMIT = 50;

/* Undo / redo for a value. Each change carries a label ("Edited CONTEXT")
   so the buttons can say what they will undo. Changes that share a
   `mergeKey` with the previous one replace it instead of stacking. */
export default function useHistory(initial) {
  const [state, setState] = useState({ entries: [{ value: initial, label: "Generated" }], index: 0 });
  const { entries, index } = state;

  const set = (next, label, mergeKey) =>
    setState((current) => {
      const top = current.entries[current.index];
      const value = typeof next === "function" ? next(top.value) : next;
      if (mergeKey && top.mergeKey === mergeKey) {
        const kept = current.entries.slice(0, current.index + 1);
        kept[current.index] = { value, label, mergeKey };
        return { entries: kept, index: current.index };
      }
      const kept = current.entries.slice(0, current.index + 1).slice(-(LIMIT - 1));
      return { entries: [...kept, { value, label, mergeKey }], index: kept.length };
    });

  return {
    value: entries[index].value,
    set,
    undo: () => setState((current) => ({ ...current, index: Math.max(0, current.index - 1) })),
    redo: () => setState((current) => ({ ...current, index: Math.min(current.entries.length - 1, current.index + 1) })),
    canUndo: index > 0,
    canRedo: index < entries.length - 1,
    undoLabel: index > 0 ? entries[index].label : "",
    redoLabel: entries[index + 1]?.label ?? "",
  };
}
