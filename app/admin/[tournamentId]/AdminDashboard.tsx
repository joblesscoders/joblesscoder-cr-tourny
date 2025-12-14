'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { generateLeagueFixtures, updateStandingsSimple, generatePlayoffBracket } from '@/lib/tournament-utils'
import { Trophy, Play, ArrowRight, Medal, ArrowLeft, Eye, Users, Swords, Crown, Edit, Trash2, Settings, MoreVertical, UserMinus, AlertTriangle, ChevronDown, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Navbar } from '@/components/navbar'
import { AdminAuthGuard } from '@/components/admin-auth'
import { toast } from 'sonner'
import Link from 'next/link'

type TournamentData = {
  tournament: any
  players: any[]
  matches: any[]
  standings: any[]
  playoffMatches: any[]
}

function AdminDashboardContent({ 
  initialData, 
  tournamentId 
}: { 
  initialData: TournamentData
  tournamentId: string 
}) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  
  // Score dialog state
  const [scoreDialog, setScoreDialog] = useState<{
    open: boolean
    matchId: string
    player1Id: string
    player2Id: string
    player1Name: string
    player2Name: string
    isPlayoff: boolean
    round?: string
  }>({ open: false, matchId: '', player1Id: '', player2Id: '', player1Name: '', player2Name: '', isPlayoff: false })
  const [scores, setScores] = useState({ player1: '', player2: '' })

  // Edit tournament dialog state
  const [editTournamentDialog, setEditTournamentDialog] = useState(false)
  const [tournamentName, setTournamentName] = useState(initialData.tournament.name)
  const [description, setDescription] = useState(initialData.tournament.description || '')
  const [rules, setRules] = useState<string[]>((initialData.tournament.rules as string[] | null) || [''])

  // Edit player dialog state
  const [editPlayerDialog, setEditPlayerDialog] = useState<{
    open: boolean
    playerId: string
    playerName: string
    playerTag: string
  }>({ open: false, playerId: '', playerName: '', playerTag: '' })

  // Delete player confirmation dialog
  const [deletePlayerDialog, setDeletePlayerDialog] = useState<{
    open: boolean
    playerId: string
    playerName: string
  }>({ open: false, playerId: '', playerName: '' })

  // Delete tournament confirmation dialog
  const [deleteTournamentDialog, setDeleteTournamentDialog] = useState(false)

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('tournament-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'league_matches', filter: `tournament_id=eq.${tournamentId}` }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'league_standings', filter: `tournament_id=eq.${tournamentId}` }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playoff_matches', filter: `tournament_id=eq.${tournamentId}` }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `tournament_id=eq.${tournamentId}` }, () => refreshData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tournamentId])

  // Refresh data function
  const refreshData = async () => {
    const [tournamentRes, playersRes, matchesRes, standingsRes, playoffRes] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
      supabase.from('players').select('*').eq('tournament_id', tournamentId).order('seed_position'),
      supabase.from('league_matches').select('*, player1:players!league_matches_player1_id_fkey(*), player2:players!league_matches_player2_id_fkey(*)').eq('tournament_id', tournamentId).order('match_number'),
      supabase.from('league_standings').select('*, players(*)').eq('tournament_id', tournamentId).order('points', { ascending: false }).order('crown_difference', { ascending: false }),
      supabase.from('playoff_matches').select('*, player1:players!playoff_matches_player1_id_fkey(*), player2:players!playoff_matches_player2_id_fkey(*), winner:players!playoff_matches_winner_id_fkey(*)').eq('tournament_id', tournamentId).order('round').order('match_number')
    ])

    if (tournamentRes.data) {
      setData({
        tournament: tournamentRes.data,
        players: playersRes.data || [],
        matches: matchesRes.data || [],
        standings: standingsRes.data || [],
        playoffMatches: playoffRes.data || [],
      })
      setTournamentName(tournamentRes.data.name)
      setDescription(tournamentRes.data.description || '')
      setRules((tournamentRes.data.rules as string[] | null) || [''])
    }
  }

  const handleGenerateFixtures = async () => {
    setLoading(true)
    try {
      await generateLeagueFixtures(tournamentId)
      await supabase.from('tournaments').update({ status: 'league', current_phase: 'league' }).eq('id', tournamentId)
      await refreshData()
      toast.success('League fixtures generated successfully!')
    } catch (error) {
      console.error('Error generating fixtures:', error)
      toast.error('Failed to generate fixtures')
    } finally {
      setLoading(false)
    }
  }

  const openScoreDialog = (matchId: string, player1Id: string, player2Id: string, player1Name: string, player2Name: string, isPlayoff = false, round?: string) => {
    setScores({ player1: '', player2: '' })
    setScoreDialog({ open: true, matchId, player1Id, player2Id, player1Name, player2Name, isPlayoff, round })
  }

  const handleSubmitScore = async () => {
    const player1Score = parseInt(scores.player1)
    const player2Score = parseInt(scores.player2)

    if (isNaN(player1Score) || isNaN(player2Score) || player1Score < 0 || player2Score < 0) {
      toast.error('Please enter valid scores')
      return
    }

    if (scoreDialog.isPlayoff && player1Score === player2Score) {
      toast.error('Playoff matches cannot be a draw')
      return
    }

    setLoading(true)
    try {
      if (scoreDialog.isPlayoff) {
        const winnerId = player1Score > player2Score ? scoreDialog.player1Id : scoreDialog.player2Id
        await supabase.from('playoff_matches').update({
          player1_score: player1Score,
          player2_score: player2Score,
          winner_id: winnerId,
          status: 'completed',
        }).eq('id', scoreDialog.matchId)

        // Handle round progression
        if (scoreDialog.round === 'quarter') {
          const { data: quarters } = await supabase.from('playoff_matches').select('*').eq('tournament_id', tournamentId).eq('round', 'quarter')
          if (quarters && quarters.every(m => m.status === 'completed')) {
            const semis = [
              { tournament_id: tournamentId, round: 'semi', match_number: 1, player1_id: quarters[0].winner_id, player2_id: quarters[1].winner_id, status: 'pending' },
              { tournament_id: tournamentId, round: 'semi', match_number: 2, player1_id: quarters[2].winner_id, player2_id: quarters[3].winner_id, status: 'pending' },
            ]
            await supabase.from('playoff_matches').insert(semis)
            await supabase.from('tournaments').update({ current_phase: 'semi' }).eq('id', tournamentId)
          }
        } else if (scoreDialog.round === 'semi') {
          const { data: semis } = await supabase.from('playoff_matches').select('*').eq('tournament_id', tournamentId).eq('round', 'semi')
          if (semis && semis.every(m => m.status === 'completed')) {
            await supabase.from('playoff_matches').insert({ tournament_id: tournamentId, round: 'final', match_number: 1, player1_id: semis[0].winner_id, player2_id: semis[1].winner_id, status: 'pending' })
            await supabase.from('tournaments').update({ current_phase: 'final' }).eq('id', tournamentId)
          }
        } else if (scoreDialog.round === 'final') {
          await supabase.from('tournaments').update({ status: 'completed' }).eq('id', tournamentId)
        }
      } else {
        await updateStandingsSimple(tournamentId, scoreDialog.matchId, scoreDialog.player1Id, scoreDialog.player2Id, player1Score, player2Score)
      }

      await refreshData()
      toast.success('Result updated successfully!')
      setScoreDialog({ ...scoreDialog, open: false })
    } catch (error) {
      console.error('Error updating result:', error)
      toast.error('Failed to update result')
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePlayoffs = async () => {
    setLoading(true)
    try {
      await generatePlayoffBracket(tournamentId)
      await refreshData()
      toast.success('Playoff bracket generated!')
    } catch (error) {
      console.error('Error generating playoffs:', error)
      toast.error('Failed to generate playoffs. Make sure league phase is complete.')
    } finally {
      setLoading(false)
    }
  }

  // Edit tournament name
  const handleUpdateTournament = async () => {
    if (!tournamentName.trim()) {
      toast.error('Tournament name cannot be empty')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ name: tournamentName.trim(), description: description || null, rules: rules.filter(r => r.trim() !== '') })
        .eq('id', tournamentId)

      if (error) throw error

      await refreshData()
      setEditTournamentDialog(false)
      toast.success('Tournament updated successfully!')
    } catch (error) {
      console.error('Error updating tournament:', error)
      toast.error('Failed to update tournament')
    } finally {
      setLoading(false)
    }
  }

  // Delete tournament
  const handleDeleteTournament = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId)

      if (error) throw error

      toast.success('Tournament deleted successfully!')
      router.push('/')
    } catch (error) {
      console.error('Error deleting tournament:', error)
      toast.error('Failed to delete tournament')
    } finally {
      setLoading(false)
    }
  }

  // Open edit player dialog
  const openEditPlayerDialog = (player: any) => {
    setEditPlayerDialog({
      open: true,
      playerId: player.id,
      playerName: player.player_name,
      playerTag: player.player_tag || ''
    })
  }

  // Update player
  const handleUpdatePlayer = async () => {
    if (!editPlayerDialog.playerName.trim()) {
      toast.error('Player name cannot be empty')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('players')
        .update({
          player_name: editPlayerDialog.playerName.trim(),
          player_tag: editPlayerDialog.playerTag.trim() || null
        })
        .eq('id', editPlayerDialog.playerId)

      if (error) throw error

      await refreshData()
      setEditPlayerDialog({ open: false, playerId: '', playerName: '', playerTag: '' })
      toast.success('Player updated successfully!')
    } catch (error) {
      console.error('Error updating player:', error)
      toast.error('Failed to update player')
    } finally {
      setLoading(false)
    }
  }

  // Open delete player dialog
  const openDeletePlayerDialog = (player: any) => {
    setDeletePlayerDialog({
      open: true,
      playerId: player.id,
      playerName: player.player_name
    })
  }

  // Delete player
  const handleDeletePlayer = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', deletePlayerDialog.playerId)

      if (error) throw error

      await refreshData()
      setDeletePlayerDialog({ open: false, playerId: '', playerName: '' })
      toast.success('Player deleted successfully!')
    } catch (error) {
      console.error('Error deleting player:', error)
      toast.error('Failed to delete player')
    } finally {
      setLoading(false)
    }
  }

  const { tournament, players, matches, standings, playoffMatches } = data

  return (
    <main className="min-h-screen bg-background pt-20">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back button */}
        <Link href="/">
          <Button variant="ghost" className="mb-6 text-muted-foreground hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-yellow-500/20">
                <Trophy className="w-8 h-8 text-yellow-400" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">{tournament.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="border-purple-500/50 text-purple-300">
                    Admin Panel
                  </Badge>
                  <Badge className={
                    tournament.status === 'completed' ? 'bg-yellow-500/20 text-yellow-400' :
                    tournament.status === 'playoffs' ? 'bg-purple-500/20 text-purple-400' :
                    tournament.status === 'league' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }>
                    {tournament.status === 'setup' ? 'Setup' : 
                     tournament.status === 'league' ? 'League Phase' :
                     tournament.status === 'playoffs' ? tournament.current_phase?.toUpperCase() + ' Finals' :
                     'Completed'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/tournament/${tournamentId}`}>
              <Button variant="outline" className="border-blue-500/50 hover:bg-blue-500/20 text-blue-400">
                <Eye className="w-4 h-4 mr-2" />
                View Public Page
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-purple-500/50 hover:bg-purple-500/20">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setEditTournamentDialog(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Tournament
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/admin/${tournamentId}/rules`)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Rules
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setDeleteTournamentDialog(true)}
                  className="text-red-400 focus:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Tournament
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Setup Phase */}
        {tournament.status === 'setup' && (
          <Card className="glass-card border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Tournament Setup
              </CardTitle>
              <CardDescription>Review players and generate fixtures</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {players.length < 12 && (
                <Alert className="border-yellow-500/50 bg-yellow-500/10">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-200">
                    You need exactly 12 players to start the tournament. Currently have {players.length} players.
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {players.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold text-sm shrink-0">
                        {p.seed_position}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{p.player_name}</p>
                        {p.player_tag && <p className="text-xs text-muted-foreground truncate">{p.player_tag}</p>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditPlayerDialog(p)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Player
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => openDeletePlayerDialog(p)}
                          className="text-red-400 focus:text-red-400"
                        >
                          <UserMinus className="w-4 h-4 mr-2" />
                          Remove Player
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleGenerateFixtures}
                disabled={loading || players.length !== 12}
                size="lg"
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                ) : (
                  <Play className="w-5 h-5 mr-2" />
                )}
                Generate League Fixtures (66 Matches)
              </Button>
            </CardContent>
          </Card>
        )}

        {/* League Phase */}
        {tournament.status === 'league' && (
          <Tabs defaultValue="standings" className="space-y-6">
            <TabsList className="bg-secondary/50 border border-border">
              <TabsTrigger value="standings">Standings</TabsTrigger>
              <TabsTrigger value="matches">Matches ({matches.filter(m => m.status === 'completed').length}/{matches.length})</TabsTrigger>
              <TabsTrigger value="players">Players</TabsTrigger>
            </TabsList>

            <TabsContent value="standings">
              <Card className="glass-card border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    League Standings
                  </CardTitle>
                  <CardDescription>Top 8 advance to playoffs • Click on a player to view match history</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Accordion type="single" collapsible className="w-full min-w-[500px]">
                    {/* Table Header */}
                    <div className="flex items-center px-3 py-3 text-sm text-muted-foreground border-b border-border font-medium">
                      <div className="w-9 text-center shrink-0">#</div>
                      <div className="flex-1 min-w-[80px]">Player</div>
                      <div className="w-8 text-center shrink-0" title="Played">P</div>
                      <div className="w-8 text-center shrink-0" title="Wins">W</div>
                      <div className="w-8 text-center shrink-0" title="Losses">L</div>
                      <div className="w-9 text-center shrink-0" title="Points">Pts</div>
                      <div className="w-10 text-center shrink-0" title="Crowns For">CF</div>
                      <div className="w-10 text-center shrink-0" title="Crowns Against">CA</div>
                      <div className="w-9 text-center shrink-0" title="Crown Difference">+/-</div>
                      <div className="w-6 shrink-0"></div>
                    </div>
                    {standings.map((s, idx) => {
                      const playerMatches = matches.filter(
                        (m: any) => m.player1_id === s.player_id || m.player2_id === s.player_id
                      )
                      const completedMatches = playerMatches.filter((m: any) => m.status === 'completed')
                      const pendingMatches = playerMatches.filter((m: any) => m.status === 'pending')
                      
                      return (
                        <AccordionItem key={s.id} value={s.id} className={`border-b border-border ${idx < 8 ? 'bg-green-500/10' : ''}`}>
                          <AccordionTrigger className="hover:no-underline hover:bg-white/5 px-3 py-3">
                            <div className="flex items-center w-full text-sm">
                              <div className="w-9 shrink-0 font-medium flex items-center justify-center gap-0.5">
                                {idx < 8 && <Medal className="w-3 h-3 text-yellow-400" />}
                                <span>{idx + 1}</span>
                              </div>
                              <div className="flex-1 min-w-[80px] font-semibold text-white text-left truncate pr-1">{s.players?.player_name}</div>
                              <div className="w-8 text-center shrink-0 text-muted-foreground">{s.games_played}</div>
                              <div className="w-8 text-center shrink-0 text-green-400 font-medium">{s.wins}</div>
                              <div className="w-8 text-center shrink-0 text-red-400">{s.losses}</div>
                              <div className="w-9 text-center shrink-0 font-bold text-yellow-400">{s.points}</div>
                              <div className="w-10 text-center shrink-0 text-blue-400">{s.crowns_for}</div>
                              <div className="w-10 text-center shrink-0 text-orange-400">{s.crowns_against}</div>
                              <div className={`w-9 text-center shrink-0 font-medium ${s.crown_difference > 0 ? 'text-green-400' : s.crown_difference < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                                {s.crown_difference > 0 ? '+' : ''}{s.crown_difference}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="bg-secondary/30 rounded-lg p-4 mt-2">
                              <h4 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                                <Swords className="w-4 h-4" />
                                Match History ({completedMatches.length} played, {pendingMatches.length} remaining)
                              </h4>
                              <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2">
                                {playerMatches.length === 0 ? (
                                  <p className="text-muted-foreground text-sm">No matches yet</p>
                                ) : (
                                  playerMatches.map((match: any) => {
                                    const isPlayer1 = match.player1_id === s.player_id
                                    const playerScore = isPlayer1 ? match.player1_score : match.player2_score
                                    const opponentScore = isPlayer1 ? match.player2_score : match.player1_score
                                    const opponentName = isPlayer1 ? match.player2?.player_name : match.player1?.player_name
                                    const isWin = match.status === 'completed' && playerScore > opponentScore
                                    const isLoss = match.status === 'completed' && playerScore < opponentScore
                                    const isDraw = match.status === 'completed' && playerScore === opponentScore
                                    
                                    return (
                                      <div
                                        key={match.id}
                                        className={`flex items-center justify-between p-3 rounded-lg border ${
                                          match.status === 'pending'
                                            ? 'bg-secondary/50 border-border'
                                            : isWin
                                            ? 'bg-green-500/10 border-green-500/30'
                                            : isLoss
                                            ? 'bg-red-500/10 border-red-500/30'
                                            : 'bg-yellow-500/10 border-yellow-500/30'
                                        }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs text-muted-foreground">#{match.match_number}</span>
                                          <span className="text-white font-medium">vs {opponentName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {match.status === 'completed' ? (
                                            <>
                                              <span className={`font-bold ${
                                                isWin ? 'text-green-400' : isLoss ? 'text-red-400' : 'text-yellow-400'
                                              }`}>
                                                {playerScore} - {opponentScore}
                                              </span>
                                              {isWin && <Check className="w-4 h-4 text-green-400" />}
                                              {isLoss && <X className="w-4 h-4 text-red-400" />}
                                            </>
                                          ) : (
                                            <Badge variant="outline" className="text-xs">Pending</Badge>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })
                                )}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )
                    })}
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="matches">
              <Card className="glass-card border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Swords className="w-5 h-5 text-blue-400" />
                    League Matches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {matches.map(match => (
                        <div
                          key={match.id}
                          className={`p-4 rounded-lg border ${
                            match.status === 'completed' 
                              ? 'bg-green-500/10 border-green-500/30' 
                              : 'bg-secondary/30 border-border'
                          }`}
                        >
                          <div className="text-center text-muted-foreground text-xs mb-2">Match #{match.match_number}</div>
                          <div className="flex items-center justify-between text-white mb-2">
                            <span className="font-medium text-sm truncate flex-1">{match.player1?.player_name}</span>
                            <span className="text-lg font-bold mx-2 text-purple-400">
                              {match.status === 'completed' ? `${match.player1_score}-${match.player2_score}` : 'vs'}
                            </span>
                            <span className="font-medium text-sm truncate flex-1 text-right">{match.player2?.player_name}</span>
                          </div>
                          {match.status === 'pending' && (
                            <Button
                              onClick={() => openScoreDialog(match.id, match.player1_id, match.player2_id, match.player1?.player_name, match.player2?.player_name)}
                              size="sm"
                              className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                              Enter Result
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {matches.length > 0 && matches.every(m => m.status === 'completed') && (
                <Button
                  onClick={handleGeneratePlayoffs}
                  disabled={loading}
                  size="lg"
                  className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="w-5 h-5 mr-2" />
                  )}
                  Generate Playoff Bracket
                </Button>
              )}
            </TabsContent>

            <TabsContent value="players">
              <Card className="glass-card border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    Manage Players
                  </CardTitle>
                  <CardDescription>Edit player names and tags</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {players.map(p => (
                      <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold text-sm shrink-0">
                            {p.seed_position}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate">{p.player_name}</p>
                            {p.player_tag && <p className="text-xs text-muted-foreground truncate">{p.player_tag}</p>}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => openEditPlayerDialog(p)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Playoffs Phase */}
        {tournament.status === 'playoffs' && (
          <Card className="glass-card border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                Playoff Bracket
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {['quarter', 'semi', 'final'].map(round => {
                const roundMatches = playoffMatches.filter(m => m.round === round)
                if (roundMatches.length === 0) return null
                
                return (
                  <div key={round}>
                    <h3 className="text-xl font-bold text-purple-400 mb-4">
                      {round === 'quarter' ? 'Quarter Finals' : round === 'semi' ? 'Semi Finals' : 'Grand Final'}
                    </h3>
                    <div className={`grid gap-4 ${round === 'final' ? 'max-w-xl mx-auto' : 'md:grid-cols-2'}`}>
                      {roundMatches.map(match => (
                        <div
                          key={match.id}
                          className={`p-5 rounded-xl border ${
                            match.status === 'completed'
                              ? round === 'final' ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30' : 'bg-green-500/10 border-green-500/30'
                              : 'bg-secondary/30 border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between text-white mb-3">
                            <span className="font-semibold">{match.player1?.player_name}</span>
                            <span className={`text-2xl font-bold mx-4 ${round === 'final' ? 'text-yellow-400' : 'text-purple-400'}`}>
                              {match.status === 'completed' ? `${match.player1_score} - ${match.player2_score}` : 'vs'}
                            </span>
                            <span className="font-semibold">{match.player2?.player_name}</span>
                          </div>
                          {match.status === 'completed' && match.winner && (
                            <div className={`text-center font-semibold flex items-center justify-center gap-2 ${round === 'final' ? 'text-yellow-400 text-lg' : 'text-green-400'}`}>
                              {round === 'final' ? <Trophy className="w-5 h-5" /> : <Medal className="w-4 h-4" />}
                              {round === 'final' ? 'Champion' : 'Winner'}: {match.winner.player_name}
                              {round === 'final' && <Trophy className="w-5 h-5" />}
                            </div>
                          )}
                          {match.status === 'pending' && (
                            <Button
                              onClick={() => openScoreDialog(match.id, match.player1_id, match.player2_id, match.player1?.player_name, match.player2?.player_name, true, match.round)}
                              className={`w-full ${round === 'final' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' : 'bg-purple-600 hover:bg-purple-700'}`}
                            >
                              Enter Result
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Completed */}
        {tournament.status === 'completed' && (
          <Card className="glass-card border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
            <CardContent className="p-12 text-center">
              <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-4xl font-bold text-white mb-2">Tournament Complete!</h2>
              <p className="text-xl text-muted-foreground mb-6">Check the public page to see the final results</p>
              <Link href={`/tournament/${tournamentId}`}>
                <Button size="lg" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                  <Eye className="w-5 h-5 mr-2" />
                  View Results
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Score Dialog */}
        <Dialog open={scoreDialog.open} onOpenChange={(open) => setScoreDialog({ ...scoreDialog, open })}>
          <DialogContent className="glass-card border-purple-500/30">
            <DialogHeader>
              <DialogTitle className="text-white">Enter Match Result</DialogTitle>
              <DialogDescription>Enter the crown scores for each player</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-white">{scoreDialog.player1Name}</Label>
                <Input
                  type="number"
                  min="0"
                  value={scores.player1}
                  onChange={(e) => setScores({ ...scores, player1: e.target.value })}
                  placeholder="Crowns"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-white">{scoreDialog.player2Name}</Label>
                <Input
                  type="number"
                  min="0"
                  value={scores.player2}
                  onChange={(e) => setScores({ ...scores, player2: e.target.value })}
                  placeholder="Crowns"
                  className="bg-secondary border-border"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScoreDialog({ ...scoreDialog, open: false })}>
                Cancel
              </Button>
              <Button onClick={handleSubmitScore} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                {loading ? 'Saving...' : 'Save Result'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Tournament Dialog */}
        <Dialog open={editTournamentDialog} onOpenChange={setEditTournamentDialog}>
          <DialogContent className="glass-card border-purple-500/30">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Tournament</DialogTitle>
              <DialogDescription>Update tournament details</DialogDescription>
            </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label className="text-white">Tournament Name</Label>
                  <Input
                    value={tournamentName}
                    onChange={(e) => setTournamentName(e.target.value)}
                    placeholder="Enter tournament name"
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-white">Description (optional)</Label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full min-h-[80px] bg-secondary border-border rounded-md p-2 text-sm"
                    placeholder="Tournament description"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-white">Rules (optional)</Label>
                    <Button onClick={() => setRules([...rules, ''])} variant="ghost" size="sm">Add Rule</Button>
                  </div>
                  <div className="space-y-2">
                    {rules.map((rule, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={rule}
                          onChange={(e) => {
                            const updated = [...rules]
                            updated[idx] = e.target.value
                            setRules(updated)
                          }}
                          placeholder={`Rule ${idx + 1}`}
                          className="flex-1 bg-background border-border"
                        />
                        <Button onClick={() => setRules(rules.filter((_, i) => i !== idx))} variant="ghost" size="icon" className="text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => router.push(`/admin/${tournamentId}/rules`)}>
                    Open Rules Editor
                  </Button>
                </div>
              </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditTournamentDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTournament} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Player Dialog */}
        <Dialog open={editPlayerDialog.open} onOpenChange={(open) => setEditPlayerDialog({ ...editPlayerDialog, open })}>
          <DialogContent className="glass-card border-purple-500/30">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Player</DialogTitle>
              <DialogDescription>Update player information</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-white">Player Name</Label>
                <Input
                  value={editPlayerDialog.playerName}
                  onChange={(e) => setEditPlayerDialog({ ...editPlayerDialog, playerName: e.target.value })}
                  placeholder="Enter player name"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-white">Player Tag (Optional)</Label>
                <Input
                  value={editPlayerDialog.playerTag}
                  onChange={(e) => setEditPlayerDialog({ ...editPlayerDialog, playerTag: e.target.value })}
                  placeholder="e.g. #ABC123"
                  className="bg-secondary border-border"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditPlayerDialog({ open: false, playerId: '', playerName: '', playerTag: '' })}>
                Cancel
              </Button>
              <Button onClick={handleUpdatePlayer} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Player Confirmation Dialog */}
        <Dialog open={deletePlayerDialog.open} onOpenChange={(open) => setDeletePlayerDialog({ ...deletePlayerDialog, open })}>
          <DialogContent className="glass-card border-red-500/30">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Delete Player
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to remove <span className="text-white font-semibold">{deletePlayerDialog.playerName}</span> from the tournament?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletePlayerDialog({ open: false, playerId: '', playerName: '' })}>
                Cancel
              </Button>
              <Button onClick={handleDeletePlayer} disabled={loading} variant="destructive">
                {loading ? 'Deleting...' : 'Delete Player'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Tournament Confirmation Dialog */}
        <Dialog open={deleteTournamentDialog} onOpenChange={setDeleteTournamentDialog}>
          <DialogContent className="glass-card border-red-500/30">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Delete Tournament
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <span className="text-white font-semibold">{tournament.name}</span>?
                This will permanently delete all players, matches, and standings. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTournamentDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleDeleteTournament} disabled={loading} variant="destructive">
                {loading ? 'Deleting...' : 'Delete Tournament'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}

export default function AdminDashboard({ initialData, tournamentId }: { initialData: TournamentData; tournamentId: string }) {
  return (
    <AdminAuthGuard>
      <AdminDashboardContent initialData={initialData} tournamentId={tournamentId} />
    </AdminAuthGuard>
  )
}
