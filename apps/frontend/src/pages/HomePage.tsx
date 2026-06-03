import {
  Header,
  HeroSection,
  StatsBar,
  FeaturesSection,
  CredibilityBanner,
  TracksSection,
  ScoringSection,
  InternshipTypesSection,
  TwoColSection,
  ManifestoSection,
  FaqSection,
  CTASection,
  Footer,
} from '../components/landing'

export function HomePage() {
  return (
    <div className="overflow-x-hidden min-h-screen bg-off-white text-ink selection:bg-gold/20 selection:text-gold">
      <Header />
      <HeroSection />
      <StatsBar />
      <FeaturesSection />
      <CredibilityBanner />
      <TracksSection />
      <ScoringSection />
      <InternshipTypesSection />
      <TwoColSection />
      <ManifestoSection />
      <FaqSection />
      <CTASection />
      <Footer />
    </div>
  )
}
