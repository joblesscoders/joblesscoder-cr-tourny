import { supabase } from '@/lib/supabase'
import RulesEditorClient from './RulesEditorClient'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ tournamentId: string }> | { tournamentId: string } }) {
  // `params` can be a Promise in some Next.js setups; await to ensure it's unwrapped
  const resolved = (await params) as { tournamentId: string }
  const { tournamentId } = resolved

  const { data, error } = await supabase
    .from('tournaments')
    .select('id,name,description,rules')
    .eq('id', tournamentId)
    .single()

  if (!data || error) {
    console.error('Failed to load tournament', error)
    return notFound()
  }

  return <RulesEditorClient initialData={data} />
}

