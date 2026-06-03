import { internshipTypes } from './data';

export function InternshipTypesSection() {
  return (
    <section className="bg-white py-[100px] px-12" id="internships">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-16">
          <p className="text-[10px] font-semibold tracking-[3px] uppercase text-gold">Internship Formats</p>
          <h2 className="font-serif text-[clamp(32px,4vw,50px)] font-semibold leading-[1.1] text-ink mt-3.5">
            Two Ways to Intern.<br />One Standard of Merit.
          </h2>
          <div className="w-10 h-[2px] bg-gold mx-auto mt-6" />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[1px] bg-border border-[0.5px] border-border">
          {internshipTypes.map((type) => (
            <div key={type.title} className="bg-white p-12">
              <span className="text-[9px] font-bold tracking-[2px] uppercase bg-gold text-white px-3.5 py-1.5 inline-block mb-[22px]">
                {type.badge}
              </span>
              <h3 className="font-serif text-[26px] font-semibold text-ink mb-3.5 leading-[1.2]">
                {type.title}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
