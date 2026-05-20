import {
  ConvictionSection,
  FeaturesSection,
  Footer,
  Header,
  HeroSection,
  ManifestoSection,
  TracksSection,
  TwoColSection,
  FaqSection,
} from '../components/landing'

function Divider() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 md:px-12">
      <hr className="border-0 border-t border-border/60" />
    </div>
  )
}

export function HomePage() {
  return (
    <div className="overflow-x-hidden min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <Header />
      <HeroSection />
      <Divider />
      <FeaturesSection />
      <ManifestoSection />
      <ConvictionSection />
      <Divider />
      <TwoColSection />
      <TracksSection />
      <FaqSection />
      <Footer />
    </div>
  )
}
