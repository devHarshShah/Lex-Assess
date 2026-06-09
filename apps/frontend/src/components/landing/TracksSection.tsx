import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { tracks } from './data'
import { cn } from '@/lib/utils'

export function TracksSection() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(0)

  // Split tracks into three rows for more balanced proportions
  const row1 = tracks.slice(0, 4)
  const row2 = tracks.slice(4, 8)
  const row3 = tracks.slice(8)

  const renderTrack = (track: typeof tracks[0], globalIdx: number) => {
    const Icon = track.icon
    const isHovered = hoveredIndex === globalIdx
    const colorClass = track.color || 'text-primary' // e.g., text-blue-500
    const bgColorClass = colorClass.replace('text-', 'bg-') // e.g., bg-blue-500
    
    return (
      <motion.div
        key={track.title}
        layout
        initial={false}
        onHoverStart={() => setHoveredIndex(globalIdx)}
        onHoverEnd={() => setHoveredIndex(globalIdx)}
        onClick={() => setHoveredIndex(globalIdx)}
        className={cn(
          "relative flex cursor-pointer overflow-hidden rounded-2xl border transition-all duration-500",
          "bg-white", // Retain white background
          isHovered 
            ? "border-primary/40 shadow-xl shadow-primary/5 z-10" 
            : "border-border/60 hover:border-primary/20"
        )}
        animate={{
          flex: isHovered ? 2 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 25,
          layout: { duration: 0.4 }
        }}
      >
        <div className="relative flex h-full w-full flex-col p-6">
          {/* Background Number (Watermark) */}
          <div className={cn(
            "absolute -right-2 -top-6 pointer-events-none font-serif text-[80px] font-bold leading-none tracking-tighter transition-all duration-700",
            isHovered ? "text-primary/5 opacity-100 scale-110" : "text-muted-foreground/5 opacity-40 scale-100"
          )}>
            {track.roman}
          </div>

          <div className="flex h-full flex-col justify-between relative z-10">
            <div>
              <div className="mb-6">
                <div className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-500",
                  isHovered ? cn(bgColorClass, "bg-opacity-10 shadow-inner") : "bg-muted/50"
                )}>
                  {Icon && <Icon className={cn("h-6 w-6 transition-all duration-500", isHovered ? colorClass : "text-muted-foreground/60")} />}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className={cn(
                  "font-bold tracking-tight transition-all duration-500",
                  isHovered ? "text-lg text-primary" : "text-sm text-foreground/70"
                )}>
                  {track.title}
                </h3>
                
                <p className={cn(
                  "text-xs leading-relaxed text-muted-foreground transition-all duration-500",
                  isHovered ? "line-clamp-none" : "line-clamp-2"
                )}>
                  {track.description}
                </p>
              </div>
            </div>

            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -5 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  className="mt-6 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-primary"
                >
                  Explore Track <span className="text-base">→</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <section
      id="practice-areas"
      className="w-full scroll-mt-24 bg-muted/20 py-24 border-y border-border/40 overflow-hidden"
    >
      <div className="mx-auto w-full max-w-7xl px-6 md:px-12">
        <div className="mb-12 flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-primary/40" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
              Practice Areas
            </span>
            <span className="h-px w-8 bg-primary/40" />
          </div>
          <motion.h2 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center font-heading text-[clamp(2.5rem,4vw,3.5rem)] font-extrabold leading-tight tracking-tight text-foreground"
          >
            {tracks.length} Tracks & <span className="text-primary">Growing.</span>
          </motion.h2>
        </div>

        <div className="space-y-4">
          {/* Row 1: 4 tracks */}
          <div className="flex flex-col md:flex-row gap-4 h-auto md:h-[280px]">
            {row1.map((track, idx) => renderTrack(track, idx))}
          </div>

          {/* Row 2: 4 tracks */}
          <div className="flex flex-col md:flex-row gap-4 h-auto md:h-[280px]">
            {row2.map((track, idx) => renderTrack(track, idx + 4))}
          </div>

          {/* Row 3: 3 tracks centered */}
          <div className="flex flex-col md:flex-row justify-center gap-4 h-auto md:h-[280px]">
            <div className="w-full md:w-[75%] flex flex-col md:flex-row gap-4">
               {row3.map((track, idx) => renderTrack(track, idx + 8))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
