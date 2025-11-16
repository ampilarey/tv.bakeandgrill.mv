export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-tv-bg border-t-2 border-tv-borderSubtle py-4 px-6 mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-tv-textMuted text-sm text-center md:text-left">
            © {currentYear} <span className="text-tv-accent font-semibold">Bake & Grill</span>. All rights reserved.
          </p>
          <p className="text-tv-textMuted text-xs">
            Powered by Bake & Grill TV Platform
          </p>
        </div>
      </div>
    </footer>
  );
}

