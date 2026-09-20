import TopBar from "./TopBar";

/* Every page shares the same chrome: the top bar (with an optional
   page header on its left) and a padded main area. */
export default function PageShell({ chrome, header, children }) {
  return (
    <>
      <TopBar {...chrome}>{header}</TopBar>
      <main className="flex-1 px-6 pb-8">{children}</main>
    </>
  );
}
