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

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

/* Opens the browser's print dialog with a clean copy of the prompt, so it
   can be saved as a PDF. Hand-off point: server-side PDF export. */
export function printPrompt(title, sections) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const body = sections
    .map((section) => {
      const content =
        section.type === "text"
          ? `<p>${escapeHtml(section.content)}</p>`
          : `<${section.type === "numbered" ? "ol" : "ul"}>${section.items
              .map((item) => `<li>${item.key ? `<b>${escapeHtml(item.key)}:</b> ` : ""}${escapeHtml(item.text)}</li>`)
              .join("")}</${section.type === "numbered" ? "ol" : "ul"}>`;
      return `<h2>${escapeHtml(section.label)}</h2>${content}`;
    })
    .join("");
  frame.contentDocument.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font:14px/1.6 system-ui,sans-serif;color:#0f172a;margin:40px}h1{font-size:22px}h2{font-size:12px;letter-spacing:.08em;color:#475569;margin:22px 0 6px}p,li{margin:4px 0}</style></head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`,
  );
  frame.contentDocument.close();
  frame.contentWindow.focus();
  frame.contentWindow.print();
  setTimeout(() => frame.remove(), 1000);
}
