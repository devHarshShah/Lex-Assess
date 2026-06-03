export function CTASection() {
  return (
    <section className="bg-white py-[100px] px-12 text-center border-t border-border" id="apply">
      <p className="text-[10px] font-semibold tracking-[3px] uppercase text-gold mb-4">Ready to Begin?</p>
      <h2 className="font-serif text-[clamp(36px,5vw,60px)] font-semibold leading-[1.1] text-ink mb-3">
        Prove What You Know.<br />Earn What You <em className="not-italic italic text-gold">Deserve.</em>
      </h2>
      <p className="text-[14px] font-light text-ink-muted mb-10">
        Join law students across India who chose merit over connections.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <a href="/signup" className="text-[11px] font-semibold tracking-[2px] uppercase bg-gold text-white px-10 py-4 no-underline transition-all hover:bg-ink hover:-translate-y-0.5">
          Register & Apply
        </a>
        <a href="#tracks" className="text-[11px] font-semibold tracking-[2px] uppercase bg-transparent text-gold border border-gold-line px-10 py-[15px] no-underline transition-all hover:bg-gold-pale">
          Browse Practice Areas
        </a>
      </div>
    </section>
  );
}
