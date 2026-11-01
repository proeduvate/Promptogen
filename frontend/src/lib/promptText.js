/* ---------------------------------------------------------------
   A prompt is a list of sections. Each section is one of:
     { type: "text",     content }
     { type: "list",     items: [{ key?, text }] }   bulleted
     { type: "numbered", items: [{ key?, text }] }
   These helpers turn sections into plain text / markdown and back.
----------------------------------------------------------------*/
const itemText = ({ key, text }) => (key ? `${key}: ${text}` : text);

export function sectionBody(section) {
  if (section.type === "text") return section.content;
  return section.items
    .map((item, index) => `${section.type === "numbered" ? `${index + 1}.` : "-"} ${itemText(item)}`)
    .join("\n");
}

export const promptToText = (sections) =>
  sections.map((section) => `${section.label}\n${sectionBody(section)}`).join("\n\n");

export const promptToMarkdown = (sections) =>
  sections.map((section) => `## ${section.label}\n\n${sectionBody(section)}`).join("\n\n");

/* Reverse of sectionBody, used when the user finishes editing a section. */
export function parseSectionBody(section, body) {
  if (section.type === "text") return { ...section, content: body.trim() };

  const keyed = section.items.some((item) => item.key);
  const items = body
    .split("\n")
    .map((line) => line.trim().replace(/^(\d+[.)]|[-*•])\s*/, ""))
    .filter(Boolean)
    .map((line) => {
      const colon = line.indexOf(":");
      return keyed && colon > 0
        ? { key: line.slice(0, colon).trim(), text: line.slice(colon + 1).trim() }
        : { text: line };
    });

  return { ...section, items };
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadFile(filename, contents, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
