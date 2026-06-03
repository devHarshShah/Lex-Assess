import { scoringSteps } from './data';

export function ScoringSection() {
  return (
    <section className="bg-off-white py-[100px] px-12" id="scoring">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-16">
          <p className="text-[10px] font-semibold tracking-[3px] uppercase text-gold">How Your Score Is Calculated</p>
          <h2 className="font-serif text-[clamp(32px,4vw,50px)] font-semibold leading-[1.1] text-ink mt-3.5">
            Assessment + Interview = Your Result
          </h2>
          <p className="text-[15px] font-light text-ink-mid max-w-[560px] mx-auto mt-[18px] leading-[1.8]">
            Two independent evaluations. One cumulative score. Fully transparent at every stage.
          </p>
          <div className="w-10 h-[2px] bg-gold mx-auto mt-6" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-border border-[0.5px] border-border">
          {scoringSteps.map((step) => (
            <div key={step.number} className="bg-white p-10 pb-8 relative">
              <div className="absolute top-0 left-0 w-[3px] h-10 bg-gold" />
              <span className="font-serif text-[44px] font-bold text-gold-pale leading-none mb-4.5 block">
                {step.number}
              </span>
              <h3 className="font-serif text-[20px] font-semibold text-ink mb-2.5 leading-[1.2]">
                {step.title}
              </h3>
              <p className="text-[13px] font-light text-ink-muted leading-[1.75]">
                {step.description}
              </p>
              <span className="inline-block mt-3.5 text-[9px] font-bold tracking-[1.5px] uppercase text-gold border-[0.5px] border-gold-line px-3 py-1">
                {step.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
