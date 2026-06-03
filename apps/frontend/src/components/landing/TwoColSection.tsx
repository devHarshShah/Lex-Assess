import { assessmentModules } from './data';

export function TwoColSection() {
  return (
    <section className="bg-white py-[100px] px-12" id="assessment">
      <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-start">
        <div className="assess-text">
          <p className="text-[10px] font-semibold tracking-[3px] uppercase text-gold">The Assessment Paper</p>
          <h2 className="font-serif text-[clamp(28px,3.5vw,44px)] font-semibold leading-[1.1] text-ink my-[14px] mb-5">
            Built for How Law is Actually Practised
          </h2>
          <p className="text-[14px] font-light text-ink-mid leading-[1.9] mb-5">
            Our assessments are not examinations of bare-act memory. They are structured simulations of real legal work — research under time pressure, drafting at short notice, and advising a senior on a nuanced question. AI tools are permitted because they are part of modern legal practice.
          </p>
          <p className="text-[14px] font-light text-ink-mid leading-[1.9] mb-5">
            Every paper is authored and reviewed by NLU faculty and senior practicing lawyers. A live research module requires candidates to find real case URLs and paste actual excerpts — making the paper impossible to complete without genuine engagement with legal databases.
          </p>
          <a href="#apply" className="inline-block mt-2 text-[11px] font-semibold tracking-[2px] uppercase bg-gold text-white px-10 py-4 no-underline transition-all hover:bg-ink hover:-translate-y-0.5">
            View Sample Paper
          </a>
        </div>
        
        <div className="assess-modules">
          {assessmentModules.map((module) => (
            <div key={module.id} className="flex gap-5 py-5 border-b border-border first:border-t">
              <span className="font-serif text-[18px] font-semibold text-gold shrink-0 min-w-[24px]">
                {module.id}
              </span>
              <div className="module-info">
                <p className="text-[13px] font-semibold text-ink mb-[3px] tracking-[0.3px]">
                  {module.title}
                </p>
                <p className="text-[12px] font-light text-ink-muted leading-[1.6]">
                  {module.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
