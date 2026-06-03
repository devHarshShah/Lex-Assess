import { credibilityCards } from './data';

export function CredibilityBanner() {
  return (
    <div className="bg-gold-pale border-y border-gold-line py-[52px] px-12">
      <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-gold-line border border-gold-line overflow-hidden">
        {credibilityCards.map((card) => (
          <div key={card.title} className="bg-gold-pale p-9 text-center">
            <span className="font-serif text-[32px] font-semibold text-gold block mb-3.5">✦</span>
            <p className="text-[12px] font-bold tracking-[1.5px] uppercase text-ink mb-2.5">{card.title}</p>
            <p className="text-[13px] font-light text-ink-mid leading-[1.75]">{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
