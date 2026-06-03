import { stats } from './data';

export function StatsBar() {
  return (
    <div className="bg-ink py-7 px-12 flex justify-center gap-0 flex-wrap">
      {stats.map((stat, idx) => (
        <div 
          key={stat.label} 
          className={`text-center px-11 border-r-[0.5px] border-white/12 last:border-r-0 ${idx === stats.length - 1 ? 'border-none' : ''}`}
        >
          <span className="font-serif text-[34px] font-semibold text-gold-light block leading-none mb-1">
            {stat.num}
          </span>
          <span className="text-[10px] font-medium tracking-[2px] uppercase text-white/45">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
