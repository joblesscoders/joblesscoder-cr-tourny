'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Trophy, Medal, Crown, ArrowLeft, Users, Swords, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Navbar } from '@/components/navbar'
import Link from 'next/link'
import KnockoutBracket from '@/components/knockout-bracket'

type TournamentData = {
  tournament: any
  players: any[]
  matches: any[]
  standings: any[]
  playoffMatches: any[]
}

export default function TournamentViewer({ 
  initialData, 
  tournamentId 
}: { 
  initialData: TournamentData
  tournamentId: string 
}) {
  const router = useRouter()

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('tournament-viewer')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'league_matches', filter: `tournament_id=eq.${tournamentId}` }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'league_standings', filter: `tournament_id=eq.${tournamentId}` }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playoff_matches', filter: `tournament_id=eq.${tournamentId}` }, () => router.refresh())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tournamentId, router])

  const { tournament, players, matches, standings, playoffMatches } = initialData

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
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-yellow-500/20 animate-pulse-glow">
              <Trophy className="w-12 h-12 text-yellow-400" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{tournament.name}</h1>
          <Badge 
            className={`px-4 py-2 text-lg ${
              tournament.status === 'completed' ? 'bg-yellow-500/20 text-yellow-400' :
              tournament.status === 'playoffs' ? 'bg-purple-500/20 text-purple-400' :
              tournament.status === 'league' ? 'bg-blue-500/20 text-blue-400' :
              'bg-gray-500/20 text-gray-400'
            }`}
          >
            {tournament.status === 'setup' && 'Tournament Setup'}
            {tournament.status === 'league' && 'League Phase'}
            {tournament.status === 'playoffs' && `${tournament.current_phase?.toUpperCase()} Finals`}
            {tournament.status === 'completed' && '🏆 Tournament Complete'}
          </Badge>
          {/* Description & Rules */}
          {tournament.description && (
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-4">{tournament.description}</p>
          )}
          {tournament.rules && Array.isArray(tournament.rules) && tournament.rules.length > 0 && (
            <div className="max-w-3xl mx-auto mt-4 text-left">
              <h4 className="text-sm font-semibold text-purple-300 mb-2">Rules</h4>
              <ul className="list-disc list-inside text-muted-foreground">
                {tournament.rules.map((r: any, idx: number) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Setup Phase */}
        {tournament.status === 'setup' && (
          <Card className="glass-card border-purple-500/20 text-center">
            <CardContent className="p-12">
              <Crown className="w-20 h-20 text-yellow-400 mx-auto mb-4 animate-float" />
              <h2 className="text-3xl font-bold text-white mb-2">Tournament Starting Soon</h2>
              <p className="text-xl text-muted-foreground">League fixtures will be generated shortly</p>
            </CardContent>
          </Card>
        )}

        {/* League Phase */}
        {(tournament.status === 'league' || tournament.status === 'playoffs' || tournament.status === 'completed') && (
          <Tabs defaultValue="standings" className="space-y-6">
            <TabsList className="bg-secondary/50 border border-border w-full md:w-auto">
              <TabsTrigger value="standings" className="flex-1 md:flex-none">
                <Trophy className="w-4 h-4 mr-2" />
                Standings
              </TabsTrigger>
              <TabsTrigger value="matches" className="flex-1 md:flex-none">
                <Swords className="w-4 h-4 mr-2" />
                Matches
              </TabsTrigger>
              {(tournament.status === 'playoffs' || tournament.status === 'completed') && playoffMatches.length > 0 && (
                <TabsTrigger value="playoffs" className="flex-1 md:flex-none">
                  <Crown className="w-4 h-4 mr-2" />
                  Playoffs
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="standings">
              <Card className="glass-card border-yellow-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-400" />
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
              {/* Knockout bracket shown under standings during league; shows predicted top-8 */}
              <KnockoutBracket standings={standings} playoffMatches={playoffMatches} status={tournament.status} />
            </TabsContent>

            <TabsContent value="matches">
              <Card className="glass-card border-blue-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Swords className="w-6 h-6 text-blue-400" />
                    League Fixtures & Results
                  </CardTitle>
                  <CardDescription>
                    {matches.filter(m => m.status === 'completed').length}/{matches.length} matches completed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] pr-4">
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
                          <div className="flex items-center justify-between text-white">
                            <span className="font-semibold text-sm truncate flex-1">{match.player1.player_name}</span>
                            <span className={`text-xl font-bold mx-2 ${match.status === 'completed' ? 'text-green-400' : 'text-muted-foreground'}`}>
                              {match.status === 'completed' 
                                ? `${match.player1_score}-${match.player2_score}` 
                                : 'vs'
                              }
                            </span>
                            <span className="font-semibold text-sm truncate flex-1 text-right">{match.player2.player_name}</span>
                          </div>
                          {match.status === 'pending' && (
                            <p className="text-center text-muted-foreground text-xs mt-2">Pending</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {(tournament.status === 'playoffs' || tournament.status === 'completed') && playoffMatches.length > 0 && (
              <TabsContent value="playoffs">
                <Card className="glass-card border-purple-500/20">
                  <CardHeader className="text-center">
                    <CardTitle className="text-white flex items-center justify-center gap-2 text-3xl">
                      <Trophy className="w-8 h-8 text-yellow-400" />
                      Playoff Bracket
                      <Trophy className="w-8 h-8 text-yellow-400" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-10">
                    {/* Quarter Finals */}
                    {playoffMatches.some(m => m.round === 'quarter') && (
                      <div>
                        <h3 className="text-2xl font-bold text-purple-400 mb-4 text-center">Quarter Finals</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          {playoffMatches.filter(m => m.round === 'quarter').map(match => (
                            <div
                              key={match.id}
                              className={`p-5 rounded-xl border-2 ${
                                match.status === 'completed' 
                                  ? 'bg-purple-500/10 border-purple-500/50' 
                                  : 'bg-secondary/30 border-border'
                              }`}
                            >
                              <div className="text-center text-muted-foreground text-sm mb-2">Match {match.match_number}</div>
                              <div className="flex items-center justify-between text-white mb-3">
                                <span className="font-bold text-lg">{match.player1.player_name}</span>
                                <span className="text-3xl font-bold mx-4 text-purple-400">
                                  {match.status === 'completed' 
                                    ? `${match.player1_score} - ${match.player2_score}` 
                                    : 'vs'
                                  }
                                </span>
                                <span className="font-bold text-lg">{match.player2.player_name}</span>
                              </div>
                              {match.status === 'completed' && match.winner && (
                                <div className="text-center text-yellow-400 font-bold text-lg flex items-center justify-center gap-2">
                                  <Medal className="w-5 h-5" />
                                  Winner: {match.winner.player_name}
                                </div>
                              )}
                              {match.status === 'pending' && (
                                <p className="text-center text-muted-foreground">Pending</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Semi Finals */}
                    {playoffMatches.some(m => m.round === 'semi') && (
                      <div>
                        <h3 className="text-2xl font-bold text-purple-400 mb-4 text-center">Semi Finals</h3>
                        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                          {playoffMatches.filter(m => m.round === 'semi').map(match => (
                            <div
                              key={match.id}
                              className={`p-5 rounded-xl border-2 ${
                                match.status === 'completed' 
                                  ? 'bg-purple-500/10 border-purple-500/50' 
                                  : 'bg-secondary/30 border-border'
                              }`}
                            >
                              <div className="text-center text-muted-foreground text-sm mb-2">Semi Final {match.match_number}</div>
                              <div className="flex items-center justify-between text-white mb-3">
                                <span className="font-bold text-lg">{match.player1.player_name}</span>
                                <span className="text-3xl font-bold mx-4 text-purple-400">
                                  {match.status === 'completed' 
                                    ? `${match.player1_score} - ${match.player2_score}` 
                                    : 'vs'
                                  }
                                </span>
                                <span className="font-bold text-lg">{match.player2.player_name}</span>
                              </div>
                              {match.status === 'completed' && match.winner && (
                                <div className="text-center text-yellow-400 font-bold text-lg flex items-center justify-center gap-2">
                                  <Medal className="w-5 h-5" />
                                  Winner: {match.winner.player_name}
                                </div>
                              )}
                              {match.status === 'pending' && (
                                <p className="text-center text-muted-foreground">Pending</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Final */}
                    {playoffMatches.some(m => m.round === 'final') && (
                      <div>
                        <h3 className="text-3xl font-bold text-yellow-400 mb-6 text-center">🏆 GRAND FINAL 🏆</h3>
                        {playoffMatches.filter(m => m.round === 'final').map(match => (
                          <div
                            key={match.id}
                            className={`p-8 rounded-2xl max-w-3xl mx-auto border-4 ${
                              match.status === 'completed' 
                                ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500' 
                                : 'bg-secondary/30 border-border'
                            }`}
                          >
                            <div className="flex items-center justify-between text-white mb-4 text-2xl">
                              <span className="font-bold">{match.player1.player_name}</span>
                              <span className="text-4xl font-bold mx-4 text-yellow-400">
                                {match.status === 'completed' 
                                  ? `${match.player1_score} - ${match.player2_score}` 
                                  : 'vs'
                                }
                              </span>
                              <span className="font-bold">{match.player2.player_name}</span>
                            </div>
                            {match.status === 'completed' && match.winner && (
                              <div className="text-center text-yellow-400 font-bold text-3xl flex items-center justify-center gap-4 animate-pulse">
                                <Trophy className="w-12 h-12" />
                                CHAMPION: {match.winner.player_name}
                                <Trophy className="w-12 h-12" />
                              </div>
                            )}
                            {match.status === 'pending' && (
                              <p className="text-center text-muted-foreground text-xl">Match in Progress</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </main>
  )
}