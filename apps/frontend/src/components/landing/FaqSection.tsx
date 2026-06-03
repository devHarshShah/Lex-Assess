import { faqs } from './data';

export function FaqSection() {
  return (
    <section className="bg-off-white py-[100px] px-12" id="eligibility">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-16">
          <p className="text-[10px] font-semibold tracking-[3px] uppercase text-gold">Common Questions</p>
          <h2 className="font-serif text-[clamp(32px,4vw,50px)] font-semibold leading-[1.1] text-ink mt-3.5">
            Everything You Need to Know
          </h2>
          <div className="w-10 h-[2px] bg-gold mx-auto mt-6" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-border border-[0.5px] border-border">
          {faqs.map((faq) => (
            <div key={faq.question} className="bg-white p-9">
              <p className="text-[13px] font-semibold text-ink mb-2.5 tracking-[0.2px]">
                {faq.question}
              </p>
              <p className="text-[13px] font-light text-ink-muted leading-[1.75]">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
