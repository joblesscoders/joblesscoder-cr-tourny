import { supabase } from './supabase'
import { Database } from '@/types/database'

type Player = Database['public']['Tables']['players']['Row']
type LeagueMatch = Database['public']['Tables']['league_matches']['Row']
type LeagueStanding = Database['public']['Tables']['league_standings']['Row']

// Generate round-robin fixtures for a group
export function generateRoundRobinFixtures(players: Player[]): Array<[Player, Player]> {
  const fixtures: Array<[Player, Player]> = []
  const n = players.length

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      fixtures.push([players[i], players[j]])
    }
  }

  return fixtures
}

// Generate all league fixtures and save to database
export async function generateLeagueFixtures(tournamentId: string) {
  // Get all players
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('seed_position')

  if (playersError || !players || players.length !== 12) {
    throw new Error('Failed to fetch players or incorrect player count')
  }

  // Generate fixtures for single league (all 12 players)
  const fixtures = generateRoundRobinFixtures(players)

  // Prepare match inserts (66 matches total for 12 players)
  const matches = fixtures.map((fixture, index) => ({
    tournament_id: tournamentId,
    match_number: index + 1,
    player1_id: fixture[0].id,
    player2_id: fixture[1].id,
    status: 'pending' as const,
  }))

  // Insert all matches
  const { error: insertError } = await supabase
    .from('league_matches')
    .insert(matches)

  if (insertError) {
    throw new Error('Failed to create fixtures')
  }

  // Initialize standings for all players
  const standings = players.map(p => ({
    tournament_id: tournamentId,
    player_id: p.id,
    wins: 0,
    losses: 0,
    points: 0,
    games_played: 0,
    crowns_for: 0,
    crowns_against: 0,
    crown_difference: 0,
  }))

  const { error: standingsError } = await supabase
    .from('league_standings')
    .insert(standings)

  if (standingsError) {
    throw new Error('Failed to initialize standings')
  }

  return { matches }
}

// Update standings after a match result
export async function updateStandings(
  tournamentId: string,
  matchId: string,
  player1Score: number,
  player2Score: number
) {
  // Get match details
  const { data: match, error: matchError } = await supabase
    .from('league_matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    throw new Error('Match not found')
  }

  const winner = player1Score > player2Score ? match.player1_id : match.player2_id
  const loser = player1Score > player2Score ? match.player2_id : match.player1_id

  // Update winner's standings
  await supabase.rpc('update_player_standing', {
    p_tournament_id: tournamentId,
    p_player_id: winner,
    p_win: true,
    p_crowns_for: Math.max(player1Score, player2Score),
    p_crowns_against: Math.min(player1Score, player2Score),
  })

  // Update loser's standings
  await supabase.rpc('update_player_standing', {
    p_tournament_id: tournamentId,
    p_player_id: loser,
    p_win: false,
    p_crowns_for: Math.min(player1Score, player2Score),
    p_crowns_against: Math.max(player1Score, player2Score),
  })

  // Update match status
  await supabase
    .from('league_matches')
    .update({
      player1_score: player1Score,
      player2_score: player2Score,
      status: 'completed',
    })
    .eq('id', matchId)
}

// Simple standings update without RPC
export async function updateStandingsSimple(
  tournamentId: string,
  matchId: string,
  player1Id: string,
  player2Id: string,
  player1Score: number,
  player2Score: number
) {
  // Determine winner
  const player1Won = player1Score > player2Score

  // Get current standings for both players
  const { data: standings } = await supabase
    .from('league_standings')
    .select('*')
    .eq('tournament_id', tournamentId)
    .in('player_id', [player1Id, player2Id])

  if (!standings || standings.length !== 2) {
    throw new Error('Standings not found')
  }

  const player1Standing = standings.find(s => s.player_id === player1Id)!
  const player2Standing = standings.find(s => s.player_id === player2Id)!

  // Update player 1
  await supabase
    .from('league_standings')
    .update({
      wins: player1Standing.wins + (player1Won ? 1 : 0),
      losses: player1Standing.losses + (player1Won ? 0 : 1),
      points: player1Standing.points + (player1Won ? 3 : 0),
      games_played: player1Standing.games_played + 1,
      crowns_for: player1Standing.crowns_for + player1Score,
      crowns_against: player1Standing.crowns_against + player2Score,
      crown_difference: (player1Standing.crowns_for + player1Score) - (player1Standing.crowns_against + player2Score),
    })
    .eq('id', player1Standing.id)

  // Update player 2
  await supabase
    .from('league_standings')
    .update({
      wins: player2Standing.wins + (player1Won ? 0 : 1),
      losses: player2Standing.losses + (player1Won ? 1 : 0),
      points: player2Standing.points + (player1Won ? 0 : 3),
      games_played: player2Standing.games_played + 1,
      crowns_for: player2Standing.crowns_for + player2Score,
      crowns_against: player2Standing.crowns_against + player1Score,
      crown_difference: (player2Standing.crowns_for + player2Score) - (player2Standing.crowns_against + player1Score),
    })
    .eq('id', player2Standing.id)

  // Update match
  await supabase
    .from('league_matches')
    .update({
      player1_score: player1Score,
      player2_score: player2Score,
      status: 'completed',
    })
    .eq('id', matchId)
}

// Generate playoff bracket from league standings
export async function generatePlayoffBracket(tournamentId: string) {
  // Get top 8 from the league
  const { data: standings } = await supabase
    .from('league_standings')
    .select('*, players(*)')
    .eq('tournament_id', tournamentId)
    .order('points', { ascending: false })
    .order('crown_difference', { ascending: false })
    .limit(8)

  if (!standings || standings.length !== 8) {
    throw new Error('Not enough qualified players (need 8)')
  }

  // Create quarter-final matchups (1v8, 2v7, 3v6, 4v5)
  const quarterFinals = [
    {
      tournament_id: tournamentId,
      round: 'quarter' as const,
      match_number: 1,
      player1_id: standings[0].player_id,
      player2_id: standings[7].player_id,
      status: 'pending' as const,
    },
    {
      tournament_id: tournamentId,
      round: 'quarter' as const,
      match_number: 2,
      player1_id: standings[1].player_id,
      player2_id: standings[6].player_id,
      status: 'pending' as const,
    },
    {
      tournament_id: tournamentId,
      round: 'quarter' as const,
      match_number: 3,
      player1_id: standings[2].player_id,
      player2_id: standings[5].player_id,
      status: 'pending' as const,
    },
    {
      tournament_id: tournamentId,
      round: 'quarter' as const,
      match_number: 4,
      player1_id: standings[3].player_id,
      player2_id: standings[4].player_id,
      status: 'pending' as const,
    },
  ]

  // Insert quarter-finals
  const { error } = await supabase
    .from('playoff_matches')
    .insert(quarterFinals)

  if (error) {
    throw new Error('Failed to create playoff bracket')
  }

  // Update tournament status
  await supabase
    .from('tournaments')
    .update({ status: 'playoffs', current_phase: 'quarter' })
    .eq('id', tournamentId)

  return quarterFinals
}