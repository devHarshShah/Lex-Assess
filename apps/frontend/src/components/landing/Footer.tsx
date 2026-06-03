export function Footer() {
  return (
    <footer className="bg-ink p-12 flex flex-col md:flex-row items-center justify-between flex-wrap gap-5">
      <div className="font-serif text-2xl font-bold text-white">
        <span className="text-gold-light">Lex</span>Assess
      </div>
      
      <div className="flex gap-7">
        <a href="#" className="text-[10px] font-medium tracking-[1.5px] uppercase text-white/45 no-underline transition-colors hover:text-gold-light">
          About
        </a>
        <a href="#" className="text-[10px] font-medium tracking-[1.5px] uppercase text-white/45 no-underline transition-colors hover:text-gold-light">
          For Firms
        </a>
        <a href="#" className="text-[10px] font-medium tracking-[1.5px] uppercase text-white/45 no-underline transition-colors hover:text-gold-light">
          Sample Papers
        </a>
        <a href="#" className="text-[10px] font-medium tracking-[1.5px] uppercase text-white/45 no-underline transition-colors hover:text-gold-light">
          Contact
        </a>
      </div>
      
      <p className="text-[11px] font-light tracking-[0.5px] text-white/35">
        &copy; 2025 LexAssess. Merit-based legal internship platform.
      </p>
    </footer>
  );
}
