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
  const [players, setPlayers] = useState<Array<{ name: string; tag: string }>>([
    { name: '', tag: '' },
  ])
  const [loading, setLoading] = useState(false)

  const addPlayer = () => {
    if (players.length < 12) {
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

  const createTournament = async () => {
    if (!tournamentName.trim()) {
      toast.error('Please enter a tournament name')
      return
    }

    const validPlayers = players.filter(p => p.name.trim() !== '')
    if (validPlayers.length !== 12) {
      toast.error(`Please enter exactly 12 players (currently ${validPlayers.length})`)
      return
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
        })
        .select()
        .single()

      if (tournamentError || !tournament) {
        throw new Error('Failed to create tournament')
      }

      // Create players - all in single league
      const playerInserts = validPlayers.map((player, index) => ({
        tournament_id: tournament.id,
        player_name: player.name,
        player_tag: player.tag || null,
        seed_position: index + 1,
      }))

      const { error: playersError } = await supabase
        .from('players')
        .insert(playerInserts)

      if (playersError) {
        throw new Error('Failed to add players')
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
            Set up a new 12-player tournament for your clan
          </p>
        </div>

        <Card className="glass-card border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Tournament Details
            </CardTitle>
            <CardDescription>
              Enter the tournament name and all 12 players
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

            {/* Players section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Players
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add exactly 12 players for the tournament
                  </p>
                </div>
                <Badge 
                  variant={players.filter(p => p.name.trim()).length === 12 ? "default" : "secondary"}
                  className={players.filter(p => p.name.trim()).length === 12 ? "bg-green-500/20 text-green-400" : ""}
                >
                  {players.filter(p => p.name.trim()).length}/12 Players
                </Badge>
              </div>

              {players.length < 12 && (
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