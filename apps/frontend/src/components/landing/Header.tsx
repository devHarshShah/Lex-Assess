import { navItems } from './data';
import { Link } from 'react-router-dom';

export function Header() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/96 backdrop-blur-md border-b border-border/50 flex items-center justify-between px-6 md:px-12 h-16">
      <Link to="/" className="font-serif text-[22px] font-bold text-ink tracking-tight no-underline">
        <span className="text-gold">Lex</span>Assess
      </Link>
      
      <div className="hidden md:flex gap-8">
        {navItems.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className="text-[11px] font-medium tracking-[1.5px] uppercase text-ink-muted no-underline transition-colors hover:text-gold"
          >
            {item.name}
          </a>
        ))}
      </div>

      <Link
        to="/signup"
        className="text-[11px] font-semibold tracking-[1.5px] uppercase text-white bg-gold px-6 py-2.5 no-underline transition-colors hover:bg-ink"
      >
        Apply Now
      </Link>
    </nav>
  );
}
