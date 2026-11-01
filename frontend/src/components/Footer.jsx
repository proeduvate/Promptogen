export default function Footer() {
  return (
    <footer className="relative mt-2 flex items-center justify-center border-t border-line-soft px-6 py-5 text-[13px] text-muted">
      <span>© 2025 ProEduvate. All rights reserved.</span>
      <nav className="absolute right-6 flex gap-6">
        <a href="#privacy" className="transition-colors hover:text-text">Privacy Policy</a>
        <a href="#terms" className="transition-colors hover:text-text">Terms of Service</a>
      </nav>
    </footer>
  );
}
