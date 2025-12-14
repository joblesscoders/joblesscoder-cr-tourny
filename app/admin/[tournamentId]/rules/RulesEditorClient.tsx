'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Navbar } from '@/components/navbar'
import { AdminAuthGuard } from '@/components/admin-auth'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import Link from 'next/link'

export default function RulesEditorClient({ initialData }: { initialData: any }) {
  const router = useRouter()
  const tournamentId = initialData.id
  const [loading, setLoading] = useState(false)
  const [name] = useState(initialData.name || '')
  const [description, setDescription] = useState(initialData.description || '')
  const [rules, setRules] = useState<string[]>((initialData.rules as string[] | null) || [''])

  const addRule = () => setRules([...rules, ''])
  const updateRule = (idx: number, value: string) => {
    const copy = [...rules]
    copy[idx] = value
    setRules(copy)
  }
  const removeRule = (idx: number) => setRules(rules.filter((_, i) => i !== idx))

  const save = async () => {
    setLoading(true)
    try {
      const cleaned = rules.filter(r => r.trim() !== '')
      const { error } = await supabase.from('tournaments').update({ description: description || null, rules: cleaned }).eq('id', tournamentId)
      if (error) throw error
      toast.success('Rules updated')
      router.push(`/admin/${tournamentId}`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to save rules')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminAuthGuard>
      <main className="min-h-screen bg-background pt-20">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Edit Rules</h1>
              <p className="text-sm text-muted-foreground">Manage tournament rules and description</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/${tournamentId}`}>
                <Button variant="outline">Back</Button>
              </Link>
            </div>
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">{name || 'Tournament'}</CardTitle>
              <CardDescription>Advanced rules editor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-white">Description (optional)</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-[100px] bg-secondary border-border rounded-md p-2 text-sm"
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-white">Rules</Label>
                  <Button onClick={addRule} variant="ghost">Add Rule</Button>
                </div>

                <div className="space-y-3">
                  {rules.length === 0 && <p className="text-muted-foreground">No rules yet. Add one.</p>}
                  {rules.map((r, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="w-8 text-muted-foreground mt-2">{idx + 1}.</div>
                      <textarea
                        value={r}
                        onChange={(e) => updateRule(idx, e.target.value)}
                        className="flex-1 min-h-[56px] bg-background border-border rounded-md p-2 text-sm"
                      />
                      <div className="flex flex-col gap-2">
                        <Button onClick={() => removeRule(idx)} variant="ghost" className="text-red-400">Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => router.push(`/admin/${tournamentId}`)}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                  {loading ? 'Saving...' : 'Save Rules'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </AdminAuthGuard>
  )
}
