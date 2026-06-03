import { tracks } from './data';

export function TracksSection() {
  return (
    <section className="bg-white py-[100px] px-12" id="tracks">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-16">
          <p className="text-[10px] font-semibold tracking-[3px] uppercase text-gold">Practice Areas</p>
          <h2 className="font-serif text-[clamp(32px,4vw,50px)] font-semibold leading-[1.1] text-ink mt-3.5">
            Eleven Tracks & Growing.
          </h2>
          <p className="text-[15px] font-light text-ink-mid max-w-[560px] mx-auto mt-[18px] leading-[1.8]">
            Choose the practice area that matches your ambition. Each track has its own expert-authored paper and dedicated interview panel.
          </p>
          <div className="w-10 h-[2px] bg-gold mx-auto mt-6" />
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-[1px] bg-border border-[0.5px] border-border mb-5">
          {tracks.map((track) => (
            <div key={track.title} className="bg-white p-7 relative overflow-hidden group transition-colors hover:bg-gold-pale cursor-default">
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gold scale-x-0 transition-transform duration-250 group-hover:scale-x-100" />
              <span className="font-serif text-[13px] font-semibold text-gold mb-2 block tracking-[0.5px]">
                {track.roman}
              </span>
              <p className="text-[13px] font-semibold text-ink mb-1.5 leading-[1.3]">
                {track.title}
              </p>
              <p className="text-[11.5px] font-light text-ink-muted leading-[1.6]">
                {track.description}
              </p>
            </div>
          ))}
        </div>
        <p className="text-center text-[12px] font-light text-ink-muted mt-4 tracking-[0.3px]">
          More practice areas being added. All tracks follow the same rigorous standard.
        </p>
      </div>
    </section>
  );
}
