import { motion } from 'framer-motion'

import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { studentDirectory } from './data'

export function DirectorySection() {
  return (
    <section className="w-full bg-card py-16 border-y border-border/40">
      <div className="mx-auto w-full max-w-6xl px-6 md:px-12">
        <div className="mb-5 flex items-center gap-4">
          <span className="h-px w-12 bg-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            Student Directory
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="mb-10 max-w-4xl"
        >
          <h2 className="font-heading text-[clamp(2.4rem,4.2vw,4.2rem)] font-extrabold leading-[1.02] tracking-tight text-foreground">
            Ranked Student <span className="text-primary">Directory</span>
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Explore ranked students across legal practice areas in one focused
            directory designed for firms, chambers, and legal teams evaluating
            talent by demonstrated performance.
          </p>
        </motion.div>

        <Card className="hidden overflow-hidden border-border/60 bg-background shadow-sm md:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                  Rank
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                  Student ID
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                  Practice Area
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentDirectory.map((entry) => (
                <TableRow key={entry.studentId}>
                  <TableCell className="font-heading text-lg font-bold text-primary">
                    #{entry.rank}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {entry.studentId}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.practiceArea}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <div className="grid gap-4 md:hidden">
          {studentDirectory.map((entry) => (
            <Card
              key={entry.studentId}
              className="border-border/60 bg-background p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Student ID
                  </div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {entry.studentId}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Rank
                  </div>
                  <div className="mt-1 font-heading text-2xl font-bold text-primary">
                    #{entry.rank}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Practice Area
                  </div>
                  <div className="mt-1 text-foreground">{entry.practiceArea}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
