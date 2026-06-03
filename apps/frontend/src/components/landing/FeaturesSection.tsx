import { pipelineSteps } from './data';

export function FeaturesSection() {
  return (
    <section className="bg-off-white py-[100px] px-12" id="how">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-16">
          <p className="text-[10px] font-semibold tracking-[3px] uppercase text-gold">The Process</p>
          <h2 className="font-serif text-[clamp(32px,4vw,50px)] font-semibold leading-[1.1] text-ink mt-3.5">
            Simple. Transparent. Fair.
          </h2>
          <p className="text-[15px] font-light text-ink-mid max-w-[560px] mx-auto mt-[18px] leading-[1.8]">
            No referrals. No name-dropping. A clear four-step process that rewards legal ability — nothing else.
          </p>
          <div className="w-10 h-[2px] bg-gold mx-auto mt-6" />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border-[0.5px] border-border bg-border">
          {pipelineSteps.map((step) => (
            <div key={step.number} className="bg-white p-11 pb-8 relative group">
              <div className="absolute top-0 left-0 w-[3px] h-10 bg-gold" />
              <span className="font-serif text-[64px] font-semibold text-gold-pale leading-none mb-5 block">
                {step.number}
              </span>
              <h3 className="font-serif text-[19px] font-semibold text-ink mb-2.5 leading-[1.2]">
                {step.title}
              </h3>
              <p className="text-[13px] font-light text-ink-muted leading-[1.75]">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
