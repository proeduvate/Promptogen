export default function Footer() {
  return (
    <footer className="relative mt-2 flex flex-col items-center justify-center gap-2 border-t border-line-soft px-6 py-5 text-center text-[13px] text-muted sm:flex-row">
      <span>© 2025 ProEduvate. All rights reserved.</span>
      <nav className="flex gap-6 sm:absolute sm:right-6">
        <a href="#privacy" className="transition-colors hover:text-text">Privacy Policy</a>
        <a href="#terms" className="transition-colors hover:text-text">Terms of Service</a>
      </nav>
    </footer>
  );
}
