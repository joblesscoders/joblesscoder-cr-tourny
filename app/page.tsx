import { supabase } from '@/lib/supabase'
import { Navbar } from '@/components/navbar'
import { HeroSection } from '@/components/hero-section'
import { TournamentOverview } from '@/components/tournament-overview'
import { Footer } from '@/components/footer'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <TournamentOverview tournaments={tournaments || []} />
      <Footer />
    </main>
  )
}