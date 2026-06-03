export function ManifestoSection() {
  return (
    <div className="bg-ink py-[100px] px-12 text-center relative overflow-hidden">
      {/* Decorative Quotes */}
      <div className="absolute font-serif text-[300px] font-bold text-gold/7 top-[-40px] left-5 leading-none select-none pointer-events-none">
        &ldquo;
      </div>
      <div className="absolute font-serif text-[300px] font-bold text-gold/7 bottom-[-100px] right-5 leading-none select-none pointer-events-none">
        &rdquo;
      </div>
      
      <div className="relative z-10 max-w-[760px] mx-auto">
        <p className="font-serif text-[clamp(22px,3.5vw,38px)] font-normal italic text-white leading-[1.45] mb-7">
          &ldquo;The best junior lawyer in the room should not be the one with the most connections. They should be the one with the sharpest mind. LexAssess exists to make that true.&rdquo;
        </p>
        <p className="text-[11px] font-medium tracking-[2.5px] uppercase text-gold-light">
          &mdash; The LexAssess Founding Principle
        </p>
      </div>
    </div>
  );
}
