'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trophy, Crown, Users, Calendar, Eye, Settings, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type Tournament = {
  id: string
  name: string
  description?: string | null
  rules?: any
  status: 'setup' | 'league' | 'playoffs' | 'completed'
  current_phase: 'league' | 'quarter' | 'semi' | 'final' | null
  created_at: string
}

interface TournamentOverviewProps {
  tournaments: Tournament[]
}

function getStatusConfig(status: string, phase: string | null) {
  switch (status) {
    case 'setup':
      return { 
        label: 'Setup', 
        variant: 'secondary' as const, 
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        icon: Settings
      }
    case 'league':
      return { 
        label: 'League Phase', 
        variant: 'default' as const, 
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        icon: Users
      }
    case 'playoffs':
      const phaseLabel = phase === 'quarter' ? 'Quarter Finals' : 
                         phase === 'semi' ? 'Semi Finals' : 
                         phase === 'final' ? 'Finals' : 'Playoffs'
      return { 
        label: phaseLabel, 
        variant: 'default' as const, 
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/20',
        icon: Trophy
      }
    case 'completed':
      return { 
        label: 'Completed', 
        variant: 'default' as const, 
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        icon: Crown
      }
    default:
      return { 
        label: 'Unknown', 
        variant: 'secondary' as const, 
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        icon: Settings
      }
  }
}

export function TournamentOverview({ tournaments }: TournamentOverviewProps) {
  const activeTournaments = tournaments.filter(t => t.status !== 'completed')
  const completedTournaments = tournaments.filter(t => t.status === 'completed')

  return (
    <div id="tournaments" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 border-purple-500/50 text-purple-300">
            <Trophy className="w-4 h-4 mr-2" />
            Tournament Hub
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Active Tournaments
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join the battle or spectate the action. Every match counts towards glory!
          </p>
        </div>

        {/* Active tournaments */}
        {activeTournaments.length > 0 ? (
          <div className="grid gap-6 mb-12">
            {activeTournaments.map((tournament) => {
              const statusConfig = getStatusConfig(tournament.status, tournament.current_phase)
              const StatusIcon = statusConfig.icon

              return (
                <Card key={tournament.id} className="glass-card overflow-hidden group hover:border-purple-500/50 transition-all duration-300">
                  <div className="flex flex-col md:flex-row">
                    {/* Left colored bar */}
                    <div className={`w-full md:w-2 h-2 md:h-auto ${statusConfig.bgColor.replace('/20', '')}`} />
                    
                    <div className="flex-1 p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${statusConfig.bgColor}`}>
                            <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
                          </div>
                          <div>
                            <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-purple-300 transition-colors">
                              {tournament.name}
                            </h3>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                                {statusConfig.label}
                              </Badge>
                              {tournament.description && (
                                <p className="text-sm text-muted-foreground max-w-xl truncate">{tournament.description}</p>
                              )}
                              <span className="text-sm text-muted-foreground flex items-center gap-1" suppressHydrationWarning>
                                <Calendar className="w-4 h-4" />
                                {new Date(tournament.created_at).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Link href={`/tournament/${tournament.id}`}>
                            <Button variant="outline" className="border-blue-500/50 hover:bg-blue-500/20 text-blue-400">
                              <Eye className="w-4 h-4 mr-2" />
                              Watch
                            </Button>
                          </Link>
                          <Link href={`/admin/${tournament.id}`}>
                            <Button className="bg-purple-600 hover:bg-purple-700">
                              <Settings className="w-4 h-4 mr-2" />
                              Manage
                              <ChevronRight className="w-4 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="glass-card p-12 text-center mb-12">
            <div className="flex flex-col items-center gap-4">
              <div className="p-6 rounded-full bg-purple-500/20">
                <Trophy className="w-16 h-16 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">No Active Tournaments</h3>
              <p className="text-muted-foreground max-w-md">
                There are no tournaments running at the moment. Create a new tournament to start the competition!
              </p>
              <Link href="/admin/create">
                <Button size="lg" className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  <Crown className="w-5 h-5 mr-2" />
                  Create Tournament
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Completed tournaments */}
        {completedTournaments.length > 0 && (
          <>
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Crown className="w-6 h-6 text-yellow-400" />
              Past Champions
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedTournaments.map((tournament) => (
                <Card key={tournament.id} className="glass-card hover:border-yellow-500/30 transition-all duration-300">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-0">
                        <Trophy className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                    </div>
                    <CardTitle className="text-lg text-white">{tournament.name}</CardTitle>
                    <CardDescription>
                      {new Date(tournament.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/tournament/${tournament.id}`}>
                      <Button variant="ghost" size="sm" className="w-full hover:bg-yellow-500/10 text-yellow-400">
                        <Eye className="w-4 h-4 mr-2" />
                        View Results
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
