import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { navItems } from './data';
import { Button } from '@/components/ui/button';

export function Header() {
  const { scrollY } = useScroll();

  const springConfig = { mass: 0.1, stiffness: 100, damping: 20 };
  const smoothScrollY = useSpring(scrollY, springConfig);

  const y = useTransform(smoothScrollY, [0, 150], [20, 0]);
  const paddingX = useTransform(smoothScrollY, [0, 150], ['24px', '32px']);

  const backgroundColor = useTransform(
    smoothScrollY,
    [0, 150],
    ['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.95)'],
  );

  const borderColor = useTransform(
    smoothScrollY,
    [0, 150],
    ['rgba(229, 231, 235, 0.3)', 'rgba(229, 231, 235, 0.15)'],
  );

  const boxShadow = useTransform(
    smoothScrollY,
    [0, 150],
    [
      '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
    ],
  );

  return (
    <div className="fixed top-0 z-50 flex w-full justify-center pointer-events-none">
      <div className="w-full max-w-7xl px-6 pt-4 md:px-12">
        <motion.header
          style={{
            y,
            paddingLeft: paddingX,
            paddingRight: paddingX,
            backgroundColor,
            borderColor,
            boxShadow,
          }}
          className="pointer-events-auto flex h-16 w-full items-center justify-between border backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm rounded-full"
        >
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="LexAssess logo" className="h-9 w-11 object-contain" />
            <span className="font-heading text-lg font-bold tracking-tight text-foreground">
              Lex<span className="text-primary">Assess</span>
            </span>
          </div>
          <nav className="hidden md:flex gap-6">
            {navItems.map((item) => (
              item.href.startsWith('/') ? (
                <Link
                  key={item.label}
                  to={item.href}
                  className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <Link
                  key={item.label}
                  to="/"
                  hash={item.href.slice(1)}
                  className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              )
            ))}
          </nav>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest border-border text-foreground hover:bg-muted rounded-full"
          >
            <Link to="/signup">Register</Link>
          </Button>
        </motion.header>
      </div>
    </div>
  );
}
