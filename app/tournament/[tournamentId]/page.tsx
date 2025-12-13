import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import TournamentViewer from './TournamentViewer'

export const dynamic = 'force-dynamic'

async function getTournamentData(tournamentId: string) {
  const [tournamentRes, playersRes, matchesRes, standingsRes, playoffRes] = await Promise.all([
    supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
    supabase.from('players').select('*').eq('tournament_id', tournamentId).order('seed_position'),
    supabase.from('league_matches').select('*, player1:players!league_matches_player1_id_fkey(*), player2:players!league_matches_player2_id_fkey(*)').eq('tournament_id', tournamentId).order('match_number'),
    supabase.from('league_standings').select('*, players(*)').eq('tournament_id', tournamentId).order('points', { ascending: false }).order('crown_difference', { ascending: false }),
    supabase.from('playoff_matches').select('*, player1:players!playoff_matches_player1_id_fkey(*), player2:players!playoff_matches_player2_id_fkey(*), winner:players!playoff_matches_winner_id_fkey(*)').eq('tournament_id', tournamentId).order('round').order('match_number')
  ])

  if (tournamentRes.error || !tournamentRes.data) {
    notFound()
  }

  return {
    tournament: tournamentRes.data,
    players: playersRes.data || [],
    matches: matchesRes.data || [],
    standings: standingsRes.data || [],
    playoffMatches: playoffRes.data || [],
  }
}

export default async function TournamentPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params
  const data = await getTournamentData(tournamentId)

  return <TournamentViewer initialData={data} tournamentId={tournamentId} />
}