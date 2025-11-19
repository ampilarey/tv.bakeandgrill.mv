export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-tv-bg border-t border-tv-borderSubtle py-2 md:py-4 px-4 md:px-6 mt-auto mb-0 relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-1 md:gap-2">
          <p className="text-tv-textMuted text-[10px] md:text-sm text-center md:text-left leading-tight">
            © {currentYear} <span className="text-tv-accent font-semibold">Bake & Grill</span>
          </p>
          <p className="text-tv-textMuted text-[9px] md:text-xs leading-tight hidden md:block">
            Powered by Bake & Grill TV Platform
          </p>
        </div>
      </div>
    </footer>
  );
}

