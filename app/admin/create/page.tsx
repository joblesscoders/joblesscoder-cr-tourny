'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Trophy, UserPlus, Trash2, ArrowLeft, Crown, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Navbar } from '@/components/navbar'
import { AdminAuthGuard } from '@/components/admin-auth'
import { toast } from 'sonner'
import Link from 'next/link'

function CreateTournamentForm() {
  const router = useRouter()
  const [tournamentName, setTournamentName] = useState('')
  const [description, setDescription] = useState('')
  const [rules, setRules] = useState<string[]>([''])
  const [competitionType, setCompetitionType] = useState<'solo' | 'team'>('solo')
  const [teamSize, setTeamSize] = useState<number>(5)
  const [desiredTeams, setDesiredTeams] = useState<number>(8)
  const [players, setPlayers] = useState<Array<{ name: string; tag: string }>>([
    { name: '', tag: '' },
  ])
  const [teams, setTeams] = useState<Array<{ name: string; tag: string; members: Array<{ name: string; ign: string }> }>>([
    { name: '', tag: '', members: [{ name: '', ign: '' }, { name: '', ign: '' }, { name: '', ign: '' }, { name: '', ign: '' }, { name: '', ign: '' }] }
  ])
  const [desiredPlayers, setDesiredPlayers] = useState<number>(12)
  const [loading, setLoading] = useState(false)

  const addPlayer = () => {
    if (players.length < desiredPlayers) {
      setPlayers([...players, { name: '', tag: '' }])
    }
  }

  const addRule = () => {
    setRules([...rules, ''])
  }

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index))
  }

  const updateRule = (index: number, value: string) => {
    const updated = [...rules]
    updated[index] = value
    setRules(updated)
  }

  const removePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index))
  }

  const updatePlayer = (index: number, field: 'name' | 'tag', value: string) => {
    const updated = [...players]
    updated[index][field] = value
    setPlayers(updated)
  }

  const addTeam = () => {
    if (teams.length < desiredTeams) {
      setTeams(prev => ([...prev, { name: '', tag: '', members: Array.from({ length: teamSize }, () => ({ name: '', ign: '' })) }]))
    }
  }

  const removeTeam = (index: number) => {
    setTeams(teams.filter((_, i) => i !== index))
  }

  const updateTeamField = (index: number, field: 'name' | 'tag', value: string) => {
    const updated = [...teams]
    updated[index][field] = value
    setTeams(updated)
  }

  const updateMember = (teamIdx: number, memberIdx: number, field: 'name' | 'ign', value: string) => {
    setTeams(prev => {
      const copy = [...prev]
      const mCopy = [...copy[teamIdx].members]
      mCopy[memberIdx] = { ...mCopy[memberIdx], [field]: value }
      copy[teamIdx] = { ...copy[teamIdx], members: mCopy }
      return copy
    })
  }

  const createTournament = async () => {
    if (!tournamentName.trim()) {
      toast.error('Please enter a tournament name')
      return
    }

    if (competitionType === 'solo') {
      const validPlayers = players.filter(p => p.name.trim() !== '')
      if (validPlayers.length !== desiredPlayers) {
        toast.error(`Please enter exactly ${desiredPlayers} players (currently ${validPlayers.length})`)
        return
      }
    } else {
      // Validate teams
      if (teams.length !== desiredTeams) {
        toast.error(`Please enter exactly ${desiredTeams} teams`)
        return
      }
      for (let i = 0; i < teams.length; i++) {
        const t = teams[i]
        if (!t.name.trim()) {
          toast.error(`Team #${i + 1} is missing a name`)
          return
        }
        if (t.members.length !== teamSize) {
          toast.error(`Team #${i + 1} must have exactly ${teamSize} players`)
          return
        }
        const filled = t.members.filter(m => m.name.trim())
        if (filled.length !== teamSize) {
          toast.error(`All ${teamSize} members must be named for team #${i + 1}`)
          return
        }
      }
    }

    setLoading(true)

    try {
      // Create tournament
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert({
          name: tournamentName,
          description: description || null,
          rules: rules.filter(r => r.trim() !== ''),
          status: 'setup',
          current_phase: null,
          // New fields for team tournaments (ignored by DB if column not present)
          competition_type: competitionType,
          team_size: competitionType === 'team' ? teamSize : 1,
          max_teams: competitionType === 'team' ? desiredTeams : desiredPlayers,
        })
        .select()
        .single()

      if (tournamentError || !tournament) {
        throw new Error('Failed to create tournament')
      }

      if (competitionType === 'solo') {
        // Solo: insert players directly
        const validPlayers = players.filter(p => p.name.trim() !== '')
        const playerInserts = validPlayers.map((player, index) => ({
          tournament_id: tournament.id,
          player_name: player.name,
          player_tag: player.tag || null,
          seed_position: index + 1,
        }))
        const { error: playersError } = await supabase.from('players').insert(playerInserts)
        if (playersError) throw new Error('Failed to add players')
      } else {
        // Team: insert teams then members as players linked via team_id
        const teamInserts = teams.map((t, idx) => ({
          tournament_id: tournament.id,
          team_name: t.name,
          team_tag: t.tag || null,
          seed_position: idx + 1,
        }))
        const { data: insertedTeams, error: teamErr } = await supabase
          .from('teams')
          .insert(teamInserts)
          .select()
        if (teamErr) throw new Error('Failed to add teams')

        // Map by order
        const playersToInsert: Array<any> = []
        teams.forEach((t, idx) => {
          const teamId = insertedTeams?.[idx]?.id
          t.members.forEach((m) => {
            playersToInsert.push({
              tournament_id: tournament.id,
              team_id: teamId,
              player_name: m.name,
              player_tag: m.ign || null,
              seed_position: null,
            })
          })
        })
        const { error: membersErr } = await supabase.from('players').insert(playersToInsert)
        if (membersErr) throw new Error('Failed to add team members')
      }

      toast.success('Tournament created successfully!')
      router.push(`/admin/${tournament.id}`)
    } catch (error) {
      console.error('Error creating tournament:', error)
      toast.error('Failed to create tournament. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background pt-20">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <Link href="/">
          <Button variant="ghost" className="mb-6 text-muted-foreground hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-4 border-purple-500/50 text-purple-300">
            <Crown className="w-4 h-4 mr-2" />
            Admin Panel
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Create New Tournament
          </h1>
          <p className="text-muted-foreground">
            Set up a new tournament with flexible player counts
          </p>
        </div>

        <Card className="glass-card border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Tournament Details
            </CardTitle>
            <CardDescription>
              Enter tournament details. Choose Solo or Team mode.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Tournament name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">Tournament Name</Label>
              <Input
                id="name"
                type="text"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                className="bg-secondary border-border focus:border-purple-500"
                placeholder="e.g., JoblessCoders Season 1"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">Description (optional)</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[80px] bg-secondary border-border rounded-md p-2 text-sm"
                placeholder="Brief description of the tournament"
              />
            </div>

            {/* Rules */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-white">Rules (optional)</Label>
                <Button onClick={addRule} variant="ghost" size="sm">Add Rule</Button>
              </div>
              <div className="space-y-2">
                {rules.map((rule, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={rule}
                      onChange={(e) => updateRule(idx, e.target.value)}
                      placeholder={`Rule ${idx + 1}`}
                      className="flex-1 bg-background border-border"
                    />
                    <Button onClick={() => removeRule(idx)} variant="ghost" size="icon" className="text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Mode toggle */}
            <div className="space-y-2">
              <Label className="text-white">Tournament Type</Label>
              <div className="flex gap-2">
                <Button type="button" variant={competitionType === 'solo' ? 'default' : 'outline'} onClick={() => setCompetitionType('solo')}>
                  Solo
                </Button>
                <Button type="button" variant={competitionType === 'team' ? 'default' : 'outline'} onClick={() => setCompetitionType('team')}>
                  Team
                </Button>
              </div>
            </div>

            {/* Players/Teams section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {competitionType === 'team' ? 'Teams' : 'Players'}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {competitionType === 'team'
                      ? 'Choose team count and team size, then add teams and members'
                      : 'Choose player count (4-32), then add players'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {competitionType === 'team' ? (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-white text-sm">Teams</Label>
                        <Input
                          type="number"
                          min={4}
                          max={32}
                          value={desiredTeams}
                          onChange={(e) => {
                            const val = Math.max(4, Math.min(32, parseInt(e.target.value || '0')))
                            setDesiredTeams(val)
                            setTeams(prev => {
                              const copy = [...prev]
                              if (copy.length < val) return copy.concat(Array.from({ length: val - copy.length }, () => ({ name: '', tag: '', members: Array.from({ length: teamSize }, () => ({ name: '', ign: '' })) })))
                              if (copy.length > val) return copy.slice(0, val)
                              return copy
                            })
                          }}
                          className="w-20 bg-background border-border focus:border-purple-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-white text-sm">Team Size</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={teamSize}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(10, parseInt(e.target.value || '0')))
                            setTeamSize(val)
                            setTeams(prev => prev.map(t => ({ ...t, members: Array.from({ length: val }, (_, i) => t.members[i] ? t.members[i] : { name: '', ign: '' }) })))
                          }}
                          className="w-24 bg-background border-border focus:border-purple-500"
                        />
                      </div>
                      <Badge variant="secondary">
                        {teams.filter(t => t.name.trim()).length}/{desiredTeams} Teams
                      </Badge>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Label className="text-white text-sm">Count</Label>
                        <Input
                          type="number"
                          min={4}
                          max={32}
                          value={desiredPlayers}
                          onChange={(e) => {
                            const val = Math.max(4, Math.min(32, parseInt(e.target.value || '0')))
                            setDesiredPlayers(val)
                            setPlayers((prev) => {
                              const copy = [...prev]
                              if (copy.length < val) {
                                return copy.concat(Array.from({ length: val - copy.length }, () => ({ name: '', tag: '' })))
                              } else if (copy.length > val) {
                                return copy.slice(0, val)
                              }
                              return copy
                            })
                          }}
                          className="w-20 bg-background border-border focus:border-purple-500"
                        />
                      </div>
                      <Badge 
                        variant={players.filter(p => p.name.trim()).length === desiredPlayers ? "default" : "secondary"}
                        className={players.filter(p => p.name.trim()).length === desiredPlayers ? "bg-green-500/20 text-green-400" : ""}
                      >
                        {players.filter(p => p.name.trim()).length}/{desiredPlayers} Players
                      </Badge>
                    </>
                  )}
                </div>
              </div>

              {competitionType === 'team' ? (
                <>
                  {teams.length < desiredTeams && (
                    <Button
                      onClick={addTeam}
                      variant="outline"
                      className="w-full border-dashed border-purple-500/50 hover:bg-purple-500/10 text-purple-300"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Team
                    </Button>
                  )}
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {teams.map((team, tIdx) => (
                      <div key={tIdx} className="p-4 rounded-lg bg-secondary/50 border border-border">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold text-xs">
                            #{tIdx + 1}
                          </div>
                          <Input
                            type="text"
                            value={team.name}
                            onChange={(e) => updateTeamField(tIdx, 'name', e.target.value)}
                            className="flex-1 bg-background border-border focus:border-purple-500"
                            placeholder="Team name"
                          />
                          <Input
                            type="text"
                            value={team.tag}
                            onChange={(e) => updateTeamField(tIdx, 'tag', e.target.value)}
                            className="w-40 bg-background border-border focus:border-purple-500"
                            placeholder="Team tag (optional)"
                          />
                          {teams.length > 1 && (
                            <Button onClick={() => removeTeam(tIdx)} variant="ghost" size="icon" className="text-red-400">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          {Array.from({ length: teamSize }).map((_, mIdx) => (
                            <div key={mIdx} className="flex gap-2 items-center">
                              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 text-xs flex items-center justify-center">
                                {mIdx + 1}
                              </div>
                              <Input
                                type="text"
                                value={team.members[mIdx]?.name || ''}
                                onChange={(e) => updateMember(tIdx, mIdx, 'name', e.target.value)}
                                className="flex-1 bg-background border-border focus:border-purple-500"
                                placeholder="Player name"
                              />
                              <Input
                                type="text"
                                value={team.members[mIdx]?.ign || ''}
                                onChange={(e) => updateMember(tIdx, mIdx, 'ign', e.target.value)}
                                className="w-36 bg-background border-border focus:border-purple-500"
                                placeholder="IGN (optional)"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {players.length < desiredPlayers && (
                    <Button
                      onClick={addPlayer}
                      variant="outline"
                      className="w-full border-dashed border-purple-500/50 hover:bg-purple-500/10 text-purple-300"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Player
                    </Button>
                  )}
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {players.map((player, index) => (
                      <div 
                        key={index} 
                        className="flex gap-3 items-center p-3 rounded-lg bg-secondary/50 border border-border"
                      >
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold text-sm">
                          #{index + 1}
                        </div>
                        <Input
                          type="text"
                          value={player.name}
                          onChange={(e) => updatePlayer(index, 'name', e.target.value)}
                          className="flex-1 bg-background border-border focus:border-purple-500"
                          placeholder="Player name"
                        />
                        <Input
                          type="text"
                          value={player.tag}
                          onChange={(e) => updatePlayer(index, 'tag', e.target.value)}
                          className="w-32 md:w-40 bg-background border-border focus:border-purple-500"
                          placeholder="Tag (optional)"
                        />
                        {players.length > 1 && (
                          <Button
                            onClick={() => removePlayer(index)}
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button
                onClick={createTournament}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4 mr-2" />
                    Create Tournament
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default function CreateTournament() {
  return (
    <AdminAuthGuard>
      <CreateTournamentForm />
    </AdminAuthGuard>
  )
}