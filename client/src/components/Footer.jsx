export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-background-light border-t border-slate-700 py-4 px-6 mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-text-muted text-sm text-center md:text-left">
            © {currentYear} <span className="text-primary font-semibold">Bake & Grill</span>. All rights reserved.
          </p>
          <p className="text-text-muted text-xs">
            Powered by Bake & Grill TV Platform
          </p>
        </div>
      </div>
    </footer>
  );
}

