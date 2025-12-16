import React from 'react'
import { Trophy } from 'lucide-react'

type PlayerSlot = { id?: string; name?: string; rank?: number }

type Match = {
  player1?: PlayerSlot
  player2?: PlayerSlot
  score1?: number | null
  score2?: number | null
  winner?: PlayerSlot
}

function PlayerCard({ 
  p, 
  score, 
  isWinner 
}: { 
  p?: PlayerSlot
  score?: number | null
  isWinner?: boolean 
}) {
  return (
    <div className={`relative flex items-center justify-between gap-2 px-4 py-3 rounded-lg transition-all ${
      isWinner 
        ? 'bg-gradient-to-r from-green-500/20 to-green-600/10 border-2 border-green-500/60 shadow-lg shadow-green-500/20' 
        : 'bg-secondary/60 border border-border/40 hover:border-border/60'
    }`}>
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="relative">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
            isWinner 
              ? 'bg-green-500/40 text-green-100 ring-2 ring-green-400/50' 
              : 'bg-gradient-to-br from-purple-500/40 to-purple-600/30 text-purple-100'
          }`}>
            {p?.name ? p.name.charAt(0).toUpperCase() : '-'}
          </div>
          {p?.rank && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center border border-black/20 shadow-sm">
              {p.rank}
            </div>
          )}
        </div>
        <div className={`text-sm font-semibold truncate ${isWinner ? 'text-white' : 'text-gray-200'}`}>
          {p?.name || 'TBD'}
        </div>
      </div>
      {score !== null && score !== undefined && (
        <div className={`text-lg font-bold shrink-0 min-w-[28px] text-right ${
          isWinner ? 'text-green-300' : 'text-gray-400'
        }`}>
          {score}
        </div>
      )}
      {isWinner && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-green-500 rounded-full"></div>
      )}
    </div>
  )
}

function MatchBox({ match, roundLabel, style, className }: { match: Match; roundLabel?: string; style?: React.CSSProperties; className?: string }) {
  const hasScores = match.score1 !== null && match.score2 !== null
  const p1IsWinner = hasScores && match.score1! > match.score2!
  const p2IsWinner = hasScores && match.score2! > match.score1!

  return (
    <div className={`relative ${className || ''}`} style={style}>
      {roundLabel && (
        <div className="text-xs font-semibold text-purple-400 mb-2 text-center">{roundLabel}</div>
      )}
      <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl p-2 space-y-2 shadow-xl h-[146px] flex flex-col justify-center">
        <PlayerCard p={match.player1} score={match.score1} isWinner={p1IsWinner} />
        <PlayerCard p={match.player2} score={match.score2} isWinner={p2IsWinner} />
      </div>
    </div>
  )
}

export default function KnockoutBracket({
  standings,
  playoffMatches,
  status,
}: {
  standings: any[]
  playoffMatches: any[]
  status: 'setup' | 'league' | 'playoffs' | 'completed'
}) {
  // Create rank map from standings
  const rankMap = new Map(standings.map((s, i) => [s.player_id, i + 1]))

  // compute probable top8 from standings
  const probable = (standings || []).slice(0, 8).map((s, i) => ({ 
    id: s.player_id, 
    name: s.players?.player_name || s.player_name,
    rank: i + 1
  }))

  // if playoffs exist, map matches
  const quarters = playoffMatches?.filter((m: any) => m.round === 'quarter').sort((a: any, b: any) => a.match_number - b.match_number) || []
  const semis = playoffMatches?.filter((m: any) => m.round === 'semi').sort((a: any, b: any) => a.match_number - b.match_number) || []
  const finals = playoffMatches?.filter((m: any) => m.round === 'final').sort((a: any, b: any) => a.match_number - b.match_number) || []

  const sortQuarterRowsForBracket = (rows: any[]) => {
    // Desired visual bracket order (keeps 1/2 on opposite halves): 1v8, 4v5, 2v7, 3v6
    const desiredSeedOrder = [1, 4, 2, 3]

    const seedIndex = (row: any) => {
      const r1 = rankMap.get(row.player1_id)
      const r2 = rankMap.get(row.player2_id)
      const minRank = typeof r1 === 'number' && typeof r2 === 'number' ? Math.min(r1, r2) : undefined
      const idx = typeof minRank === 'number' ? desiredSeedOrder.indexOf(minRank) : -1
      return idx === -1 ? Number.MAX_SAFE_INTEGER : idx
    }

    return [...rows].sort((a, b) => {
      const ai = seedIndex(a)
      const bi = seedIndex(b)
      if (ai !== bi) return ai - bi
      return (a.match_number ?? 0) - (b.match_number ?? 0)
    })
  }

  // before playoffs generate predicted quarter matches from probable
  const predictedQuarters: Match[] = []
  if (status === 'league') {
    // Order: 1v8, 4v5, 2v7, 3v6
    const slots = [0, 7, 3, 4, 1, 6, 2, 5]
    for (let i = 0; i < 8; i += 2) {
      const p1 = probable[slots[i]]
      const p2 = probable[slots[i+1]]
      if (p1 && p2) {
        predictedQuarters.push({ player1: p1, player2: p2 })
      }
    }
  }

  const quarterMatches: Match[] = status === 'league'
    ? predictedQuarters
    : sortQuarterRowsForBracket(quarters).map((q: any) => ({
        player1: { id: q.player1_id, name: q.player1?.player_name, rank: rankMap.get(q.player1_id) },
        player2: { id: q.player2_id, name: q.player2?.player_name, rank: rankMap.get(q.player2_id) },
        score1: q.player1_score,
        score2: q.player2_score,
        winner: q.winner ? { id: q.winner_id, name: q.winner?.player_name, rank: rankMap.get(q.winner_id) } : undefined,
      }))
  
  const semiMatches: Match[] = semis.map((s: any) => ({ 
    player1: s.player1 ? { id: s.player1_id, name: s.player1?.player_name, rank: rankMap.get(s.player1_id) } : undefined, 
    player2: s.player2 ? { id: s.player2_id, name: s.player2?.player_name, rank: rankMap.get(s.player2_id) } : undefined, 
    score1: s.player1_score, 
    score2: s.player2_score,
    winner: s.winner ? { id: s.winner_id, name: s.winner?.player_name, rank: rankMap.get(s.winner_id) } : undefined
  }))
  
  const finalMatch: Match | null = finals[0] 
    ? { 
        player1: finals[0].player1 ? { id: finals[0].player1_id, name: finals[0].player1?.player_name, rank: rankMap.get(finals[0].player1_id) } : undefined, 
        player2: finals[0].player2 ? { id: finals[0].player2_id, name: finals[0].player2?.player_name, rank: rankMap.get(finals[0].player2_id) } : undefined, 
        score1: finals[0].player1_score, 
        score2: finals[0].player2_score,
        winner: finals[0].winner ? { id: finals[0].winner_id, name: finals[0].winner?.player_name, rank: rankMap.get(finals[0].winner_id) } : undefined
      } 
    : null

  // Layout Constants
  const MATCH_HEIGHT = 146
  const GAP = 40
  const TITLE_OFFSET = 80 // Space for phase title inside the box
  
  // Calculate Tops
  const qTops = [
    TITLE_OFFSET, 
    TITLE_OFFSET + MATCH_HEIGHT + GAP, 
    TITLE_OFFSET + (MATCH_HEIGHT + GAP) * 2, 
    TITLE_OFFSET + (MATCH_HEIGHT + GAP) * 3
  ]
  
  const sTops = [
    (qTops[0] + qTops[1]) / 2,
    (qTops[2] + qTops[3]) / 2
  ]
  
  const fTop = (sTops[0] + sTops[1]) / 2

  const totalHeight = qTops[3] + MATCH_HEIGHT + 40

  // Helper for connectors
  const getCenter = (top: number) => top + MATCH_HEIGHT / 2

  return (
    <div className="my-10 px-4 overflow-x-auto">
       {/* Header */}
       <div className="flex items-center justify-center gap-3 mb-16">
        <Trophy className="w-8 h-8 text-yellow-400 animate-pulse" />
        <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-yellow-400 bg-clip-text text-transparent">
          Tournament Bracket
        </h3>
        <Trophy className="w-8 h-8 text-yellow-400 animate-pulse" />
      </div>

      <div className="relative min-w-[1100px] mx-auto px-6" style={{ height: totalHeight }}>
        {/* Columns Container */}
        <div className="grid grid-cols-[280px_100px_280px_100px_300px] absolute inset-0 gap-0 justify-center">
          
          {/* QUARTER FINALS */}
          <div className="relative bg-purple-500/5 rounded-3xl border border-purple-500/10 shadow-xl backdrop-blur-sm">
             <div className="text-center font-bold text-purple-300 uppercase tracking-widest text-xs absolute w-full top-6">
                Quarter Finals
              </div>
              {quarterMatches.map((match, idx) => (
                <MatchBox 
                  key={idx} 
                  match={match} 
                  style={{ position: 'absolute', top: qTops[idx], width: '100%', paddingLeft: '16px', paddingRight: '16px' }} 
                />
              ))}
          </div>

          {/* Q -> S CONNECTORS */}
          <div className="relative">
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(168, 85, 247, 0.4)" />
                  <stop offset="100%" stopColor="rgba(59, 130, 246, 0.4)" />
                </linearGradient>
              </defs>
              {[0, 1].map(pairIdx => {
                 const m1Idx = pairIdx * 2
                 const m2Idx = pairIdx * 2 + 1
                 const sIdx = pairIdx
                 
                 const y1 = getCenter(qTops[m1Idx])
                 const y2 = getCenter(qTops[m2Idx])
                 const yTarget = getCenter(sTops[sIdx])
                 
                 return (
                   <g key={pairIdx}>
                     {/* Top branch */}
                     <path d={`M -16 ${y1} L 50 ${y1} L 50 ${yTarget} L 116 ${yTarget}`} fill="none" stroke="url(#grad1)" strokeWidth="2" />
                     {/* Bottom branch */}
                     <path d={`M -16 ${y2} L 50 ${y2} L 50 ${yTarget} L 116 ${yTarget}`} fill="none" stroke="url(#grad1)" strokeWidth="2" />
                   </g>
                 )
              })}
            </svg>
          </div>

          {/* SEMI FINALS */}
          <div className="relative bg-blue-500/5 rounded-3xl border border-blue-500/10 shadow-xl backdrop-blur-sm">
             <div className="text-center font-bold text-blue-300 uppercase tracking-widest text-xs absolute w-full top-6">
                Semi Finals
              </div>
              {Array.from({ length: 2 }).map((_, idx) => (
                 <div key={idx} style={{ position: 'absolute', top: sTops[idx], width: '100%', paddingLeft: '16px', paddingRight: '16px' }}>
                    {semiMatches[idx] ? (
                      <MatchBox match={semiMatches[idx]} />
                    ) : (
                      <div className="bg-card/20 backdrop-blur-sm border border-dashed border-border/40 rounded-xl p-8 text-center h-[146px] flex items-center justify-center">
                        <div className="text-muted-foreground font-medium text-sm">TBD</div>
                      </div>
                    )}
                 </div>
              ))}
          </div>

          {/* S -> F CONNECTORS */}
          <div className="relative">
             <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
               <defs>
                <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
                  <stop offset="100%" stopColor="rgba(234, 179, 8, 0.4)" />
                </linearGradient>
               </defs>
               {/* Only 1 pair */}
               <g>
                 {(() => {
                   const y1 = getCenter(sTops[0])
                   const y2 = getCenter(sTops[1])
                   const yTarget = getCenter(fTop)
                   return (
                     <>
                       <path d={`M -16 ${y1} L 50 ${y1} L 50 ${yTarget} L 116 ${yTarget}`} fill="none" stroke="url(#grad2)" strokeWidth="2" />
                       <path d={`M -16 ${y2} L 50 ${y2} L 50 ${yTarget} L 116 ${yTarget}`} fill="none" stroke="url(#grad2)" strokeWidth="2" />
                     </>
                   )
                 })()}
               </g>
             </svg>
          </div>

          {/* FINAL */}
          <div className="relative bg-yellow-500/5 rounded-3xl border border-yellow-500/10 shadow-xl backdrop-blur-sm">
             <div className="text-center font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 absolute w-full top-6">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
                  Grand Final
                </span>
                <Trophy className="w-4 h-4 text-yellow-400" />
              </div>
              <div style={{ position: 'absolute', top: fTop, width: '100%', paddingLeft: '16px', paddingRight: '16px' }}>
                {finalMatch ? (
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl blur-xl"></div>
                    <div className="relative">
                      <MatchBox match={finalMatch} />
                    </div>
                    {finalMatch.winner && (
                      <div className="mt-5 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                         <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-200 font-bold shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                            <Trophy className="w-4 h-4" />
                            Champion: {finalMatch.winner.name}
                         </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-card/20 backdrop-blur-sm border border-dashed border-border/40 rounded-2xl p-12 text-center h-[146px] flex flex-col items-center justify-center">
                    <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <div className="text-muted-foreground font-medium text-sm">Final TBD</div>
                  </div>
                )}
              </div>
          </div>

        </div>
      </div>
    </div>
  )
}
