# Tournament Platform Modernization Plan 🚀

## Executive Summary
Transform the current Clash Royale-specific tournament system into a **flexible, game-agnostic competition platform** that supports multiple games (Valorant, CS:GO, League of Legends, etc.) with dynamic tournament configurations.

---

## Current Implementation Analysis 📊

### Architecture Overview
- **Stack**: Next.js 16 + React 19 + Supabase + TypeScript
- **Current State**: Hardcoded for 12 players, single league format, fixed top-8 playoffs
- **Structure**: Players → League Matches → Standings → Playoffs (Quarter/Semi/Final)
- **Game-Specific**: Clash Royale terminology (crowns, player tags)

### Key Files & Components
1. **Database Schema** (`supabase-schema.sql`)
   - Tables: tournaments, players, league_matches, league_standings, playoff_matches
   - Fixed structure for individual players only

2. **Tournament Creation** (`app/admin/create/page.tsx`)
   - Hardcoded 12 player limit
   - Single configuration

3. **Tournament Logic** (`lib/tournament-utils.ts`)
   - Fixed round-robin for 12 players (66 matches)
   - Hardcoded top-8 playoff seeding
   - Fixed bracket: 1v8, 4v5, 2v7, 3v6

4. **Bracket Display** (`components/knockout-bracket.tsx`)
   - Fixed 8-team bracket (Quarter → Semi → Final)

---

## Proposed Modernization Strategy 🎯

### Phase 1: Database Schema Redesign (Foundation)

#### 1.1 Enhanced Tournament Configuration
```sql
-- Add to tournaments table
ALTER TABLE tournaments ADD COLUMN game_type TEXT NOT NULL DEFAULT 'clash-royale';
ALTER TABLE tournaments ADD COLUMN team_size INTEGER NOT NULL DEFAULT 1;
ALTER TABLE tournaments ADD COLUMN max_teams INTEGER NOT NULL DEFAULT 12;
ALTER TABLE tournaments ADD COLUMN playoff_format JSONB DEFAULT '{"type": "top8", "rounds": ["quarter", "semi", "final"]}'::jsonb;
ALTER TABLE tournaments ADD COLUMN scoring_system JSONB DEFAULT '{"win_points": 3, "draw_points": 1, "loss_points": 0}'::jsonb;
ALTER TABLE tournaments ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
```

**Reasoning**: 
- `game_type`: Enable game-specific configurations (valorant, csgo, lol, etc.)
- `team_size`: Support solo (1) or team-based (5 for Valorant, etc.)
- `max_teams`: Dynamic team count (8-64+)
- `playoff_format`: Auto-calculated based on team count
- `scoring_system`: Flexible point systems per game
- `metadata`: Store game-specific data (ranks, regions, etc.)

#### 1.2 Teams System (New Paradigm)
```sql
-- New teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    team_tag TEXT,
    seed_position INTEGER,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced players table (now team members)
ALTER TABLE players ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE players ADD COLUMN role TEXT; -- For games like Valorant (Duelist, Controller, etc.)
ALTER TABLE players ADD COLUMN is_substitute BOOLEAN DEFAULT false;
ALTER TABLE players ALTER COLUMN player_tag DROP NOT NULL;
```

**Reasoning**: 
- Supports both solo tournaments (1 player per team) and team tournaments
- Maintains backward compatibility
- Flexible member management per team

#### 1.3 Dynamic Match System
```sql
-- Update matches to reference teams instead of individual players
ALTER TABLE league_matches ADD COLUMN team1_id UUID REFERENCES teams(id);
ALTER TABLE league_matches ADD COLUMN team2_id UUID REFERENCES teams(id);
ALTER TABLE league_matches ADD COLUMN match_data JSONB DEFAULT '{}'::jsonb;

-- Rename for clarity
ALTER TABLE league_matches RENAME TO matches;
ALTER TABLE matches RENAME COLUMN player1_id TO legacy_player1_id;
ALTER TABLE matches RENAME COLUMN player2_id TO legacy_player2_id;

-- Make legacy columns nullable for backward compatibility
ALTER TABLE matches ALTER COLUMN legacy_player1_id DROP NOT NULL;
ALTER TABLE matches ALTER COLUMN legacy_player2_id DROP NOT NULL;
```

**Reasoning**: 
- Unified match system for both solo and team competitions
- `match_data`: Store game-specific info (map picks, agent bans, etc.)
- Legacy support for existing tournaments

#### 1.4 Dynamic Standings
```sql
-- Update standings to track teams
ALTER TABLE league_standings ADD COLUMN team_id UUID REFERENCES teams(id);
ALTER TABLE league_standings ADD COLUMN draws INTEGER DEFAULT 0;
ALTER TABLE league_standings ADD COLUMN rounds_won INTEGER DEFAULT 0;
ALTER TABLE league_standings ADD COLUMN rounds_lost INTEGER DEFAULT 0;
ALTER TABLE league_standings RENAME COLUMN crowns_for TO score_for;
ALTER TABLE league_standings RENAME COLUMN crowns_against TO score_against;
ALTER TABLE league_standings RENAME COLUMN crown_difference TO score_difference;
```

#### 1.5 Flexible Playoff Matches
```sql
-- Update playoff system
ALTER TABLE playoff_matches ADD COLUMN team1_id UUID REFERENCES teams(id);
ALTER TABLE playoff_matches ADD COLUMN team2_id UUID REFERENCES teams(id);
ALTER TABLE playoff_matches ADD COLUMN winner_team_id UUID REFERENCES teams(id);
ALTER TABLE playoff_matches ADD COLUMN match_data JSONB DEFAULT '{}'::jsonb;

-- Make legacy player references nullable
ALTER TABLE playoff_matches ALTER COLUMN player1_id DROP NOT NULL;
ALTER TABLE playoff_matches ALTER COLUMN player2_id DROP NOT NULL;
```

---

### Phase 2: Dynamic Playoff Format Logic

#### 2.1 Playoff Format Calculator
Create `lib/playoff-formats.ts`:

```typescript
export type PlayoffFormat = {
  totalTeams: number
  qualifyingTeams: number
  rounds: Array<{
    name: string
    code: string
    matchCount: number
  }>
}

export function calculatePlayoffFormat(totalTeams: number): PlayoffFormat {
  // 4-7 teams: Top 4 (Semi → Final)
  if (totalTeams >= 4 && totalTeams <= 7) {
    return {
      totalTeams,
      qualifyingTeams: 4,
      rounds: [
        { name: 'Semi Finals', code: 'semi', matchCount: 2 },
        { name: 'Final', code: 'final', matchCount: 1 }
      ]
    }
  }
  
  // 8-15 teams: Top 8 (Quarter → Semi → Final)
  if (totalTeams >= 8 && totalTeams <= 15) {
    return {
      totalTeams,
      qualifyingTeams: 8,
      rounds: [
        { name: 'Quarter Finals', code: 'quarter', matchCount: 4 },
        { name: 'Semi Finals', code: 'semi', matchCount: 2 },
        { name: 'Final', code: 'final', matchCount: 1 }
      ]
    }
  }
  
  // 16-31 teams: Top 16 (R16 → Quarter → Semi → Final)
  if (totalTeams >= 16 && totalTeams <= 31) {
    return {
      totalTeams,
      qualifyingTeams: 16,
      rounds: [
        { name: 'Round of 16', code: 'r16', matchCount: 8 },
        { name: 'Quarter Finals', code: 'quarter', matchCount: 4 },
        { name: 'Semi Finals', code: 'semi', matchCount: 2 },
        { name: 'Final', code: 'final', matchCount: 1 }
      ]
    }
  }
  
  // 32+ teams: Top 32 (R32 → R16 → Quarter → Semi → Final)
  if (totalTeams >= 32) {
    return {
      totalTeams,
      qualifyingTeams: 32,
      rounds: [
        { name: 'Round of 32', code: 'r32', matchCount: 16 },
        { name: 'Round of 16', code: 'r16', matchCount: 8 },
        { name: 'Quarter Finals', code: 'quarter', matchCount: 4 },
        { name: 'Semi Finals', code: 'semi', matchCount: 2 },
        { name: 'Final', code: 'final', matchCount: 1 }
      ]
    }
  }
  
  // Default fallback
  throw new Error('Tournament must have at least 4 teams')
}

// Generate bracket seeding (1v16, 8v9, 4v13, 5v12, 2v15, 7v10, 3v14, 6v11)
export function generateBracketSeeding(qualifyingTeams: number): Array<[number, number]> {
  const pairs: Array<[number, number]> = []
  const n = qualifyingTeams
  
  for (let i = 0; i < n / 2; i++) {
    pairs.push([i + 1, n - i])
  }
  
  return pairs
}
```

---

### Phase 3: Enhanced Tournament Creation UI

#### 3.1 Multi-Step Tournament Creation Flow
Update `app/admin/create/page.tsx`:

```typescript
// Step 1: Basic Info
- Tournament Name
- Game Type (Dropdown: Clash Royale, Valorant, CS:GO, etc.)
- Description
- Rules

// Step 2: Format Configuration
- Competition Type: Solo/Team
- Team Size (if team): 1-10 players
- Number of Teams: 4-64
- Auto-calculate and display playoff format

// Step 3: Team & Player Management
- Dynamic team/player input based on configuration
- Add/Edit/Remove teams
- For each team: Add/Edit/Remove members
- Role assignment (game-specific)
- Drag & drop for seeding order

// Step 4: Review & Create
- Summary of configuration
- Preview bracket structure
- Confirm and create
```

#### 3.2 Enhanced Team Management Component
Create `components/team-manager.tsx`:

```typescript
interface TeamManagerProps {
  teamSize: number
  maxTeams: number
  gameType: string
  onChange: (teams: Team[]) => void
}

// Features:
- Expandable team cards
- Member list editing per team
- Bulk import from CSV/JSON
- Drag & drop reordering
- Real-time validation
```

---

### Phase 4: Match History Editing System

#### 4.1 Match Editor Component
Create `components/match-editor.tsx`:

```typescript
interface MatchEditorProps {
  match: Match
  onUpdate: (match: Match) => void
  canEdit: boolean
}

// Features:
- Edit scores for any match (league or playoff)
- Cascading updates to standings
- Audit log of changes
- Confirmation dialog for significant changes
```

#### 4.2 Cascading Update Logic
Update `lib/tournament-utils.ts`:

```typescript
export async function recalculateStandings(tournamentId: string) {
  // 1. Reset all standings to zero
  // 2. Replay all completed matches in order
  // 3. Recalculate all points, wins, losses, score differentials
  // 4. Update rankings
  // 5. If playoffs started, validate playoff participant eligibility
  // 6. Show warnings if playoff matches need adjustment
}

export async function updateMatchResult(
  tournamentId: string,
  matchId: string,
  newScore1: number,
  newScore2: number,
  isPlayoff: boolean
) {
  // 1. Update match scores
  // 2. If league match: recalculate standings
  // 3. If playoff match: update winner_id, check if next round affected
  // 4. Create audit log entry
  // 5. Emit real-time update
}
```

#### 4.3 Admin Dashboard Enhancements
Update `app/admin/[tournamentId]/AdminDashboard.tsx`:

```typescript
// Add features:
- "Edit Match" button on each match row
- Match history tab with edit capability
- Standings recalculation button (with warning)
- Change log viewer
- Bulk match import/export
```

---

### Phase 5: Dynamic Bracket Visualization

#### 5.1 Flexible Bracket Component
Rewrite `components/knockout-bracket.tsx`:

```typescript
export function DynamicBracket({
  format: PlayoffFormat
  matches: PlayoffMatch[]
  standings: Standing[]
}) {
  // Auto-layout based on number of rounds
  // Responsive design for 2-5 rounds
  // Predicted matchups in gray before generation
  // Highlight winner path
  // Click to zoom/expand
}
```

#### 5.2 Bracket Layouts
- **4 teams**: Simple 2-match bracket (Semi → Final)
- **8 teams**: Current layout (Quarter → Semi → Final)
- **16 teams**: 4-round bracket
- **32 teams**: 5-round bracket with horizontal scroll

---

### Phase 6: Game-Specific Configurations

#### 6.1 Game Profiles
Create `lib/game-configs.ts`:

```typescript
export const GAME_CONFIGS = {
  'clash-royale': {
    name: 'Clash Royale',
    teamSize: 1,
    scoringMetric: 'Crowns',
    defaultScoring: { win: 3, draw: 1, loss: 0 },
    playerFields: ['player_tag', 'trophies'],
    roleOptions: null
  },
  'valorant': {
    name: 'Valorant',
    teamSize: 5,
    scoringMetric: 'Rounds',
    defaultScoring: { win: 3, loss: 0 },
    playerFields: ['riot_id', 'rank'],
    roleOptions: ['Duelist', 'Initiator', 'Controller', 'Sentinel']
  },
  'csgo': {
    name: 'Counter-Strike: Global Offensive',
    teamSize: 5,
    scoringMetric: 'Rounds',
    defaultScoring: { win: 3, loss: 0 },
    playerFields: ['steam_id', 'rank'],
    roleOptions: ['Entry Fragger', 'AWPer', 'Support', 'IGL', 'Lurker']
  },
  'lol': {
    name: 'League of Legends',
    teamSize: 5,
    scoringMetric: 'Games',
    defaultScoring: { win: 3, loss: 0 },
    playerFields: ['summoner_name', 'rank'],
    roleOptions: ['Top', 'Jungle', 'Mid', 'ADC', 'Support']
  }
}
```

---

## Implementation Roadmap 📅

### Week 1: Database Migration
- [ ] Create migration scripts for new schema
- [ ] Implement backward compatibility layer
- [ ] Add teams table and relationships
- [ ] Test with existing data

### Week 2: Core Logic Refactoring
- [ ] Implement playoff format calculator
- [ ] Refactor tournament-utils for dynamic teams
- [ ] Add match history editing with cascading updates
- [ ] Create recalculation functions

### Week 3: Admin UI Enhancements
- [ ] Build multi-step tournament creation wizard
- [ ] Create team manager component
- [ ] Add match editor to admin dashboard
- [ ] Implement validation and error handling

### Week 4: Bracket System
- [ ] Rewrite bracket component for flexibility
- [ ] Add support for 4/8/16/32 team formats
- [ ] Implement responsive layouts
- [ ] Add predicted matchups display

### Week 5: Game-Specific Features
- [ ] Implement game configuration system
- [ ] Add game-specific form fields
- [ ] Create role management for team games
- [ ] Build game selector in creation flow

### Week 6: Testing & Polish
- [ ] End-to-end testing with various formats
- [ ] Performance optimization
- [ ] UI/UX refinements
- [ ] Documentation updates

---

## Migration Path for Existing Data 🔄

```sql
-- Migration script for existing tournaments
DO $$
DECLARE
  tournament_record RECORD;
  new_team_id UUID;
BEGIN
  FOR tournament_record IN SELECT * FROM tournaments WHERE game_type IS NULL
  LOOP
    -- Set defaults for existing tournaments
    UPDATE tournaments
    SET 
      game_type = 'clash-royale',
      team_size = 1,
      max_teams = 12,
      playoff_format = '{"type": "top8", "rounds": ["quarter", "semi", "final"]}'::jsonb
    WHERE id = tournament_record.id;
    
    -- Create teams for existing players (1 player per team)
    FOR player_record IN SELECT * FROM players WHERE tournament_id = tournament_record.id
    LOOP
      INSERT INTO teams (tournament_id, team_name, team_tag, seed_position)
      VALUES (
        tournament_record.id,
        player_record.player_name,
        player_record.player_tag,
        player_record.seed_position
      )
      RETURNING id INTO new_team_id;
      
      -- Link player to team
      UPDATE players
      SET team_id = new_team_id
      WHERE id = player_record.id;
    END LOOP;
  END LOOP;
END $$;
```

---

## Key Benefits 🌟

1. **Scalability**: Support 4-64+ teams/players
2. **Flexibility**: Works for solo and team-based games
3. **Maintainability**: Clean separation of concerns
4. **User Experience**: Intuitive admin controls
5. **Accuracy**: Match editing with full recalculation
6. **Multi-Game**: Easy to add new games
7. **Future-Proof**: Extensible architecture

---

## Technical Considerations ⚙️

### Performance
- Recalculation for large tournaments (100+ matches) needs optimization
- Consider caching standings with invalidation on edit
- Background job for complex recalculations

### Real-time Updates
- Current Supabase realtime works well
- May need throttling for rapid match updates

### Data Integrity
- Add database constraints to prevent invalid states
- Transaction support for cascading updates
- Audit logging for all administrative changes

### UI/UX
- Loading states during recalculation
- Confirmation dialogs for destructive actions
- Undo/redo for match edits
- Mobile-responsive bracket viewer

---

## Next Steps 🚀

1. **Review & Approve**: Stakeholder review of this plan
2. **Prioritize Features**: Decide on MVP vs. nice-to-have
3. **Create Tickets**: Break down into actionable tasks
4. **Setup Environments**: Dev/Staging for testing
5. **Begin Implementation**: Start with Phase 1 (Database)

---

## Example User Flows

### Creating a Valorant Tournament (16 Teams)

1. Admin clicks "Create Tournament"
2. Selects "Valorant" from game dropdown
3. System auto-sets: team_size=5, shows role options
4. Admin enters: "VCT Regional Finals", 16 teams
5. System calculates: "Top 16 → Round of 16 → Quarter → Semi → Final"
6. Admin adds 16 teams with 5 players each (80 total players)
7. Assigns roles (Duelist, Controller, etc.) to each player
8. Reviews bracket preview
9. Creates tournament → League phase begins

### Editing a Match Result

1. Admin notices wrong score entry
2. Goes to "Match History" tab
3. Finds the match, clicks "Edit"
4. Changes score from 2-1 to 1-2
5. System shows warning: "This will recalculate standings and may affect playoff seeding"
6. Confirms → Full standings recalculation
7. System shows diff: "Team A moved from 3rd to 5th"
8. Audit log records the change

---

## Conclusion

This modernization plan transforms the tournament platform from a single-game, fixed-format system into a **flexible, multi-game competition platform**. The phased approach ensures minimal disruption while delivering maximum value.

**Estimated Timeline**: 6 weeks for full implementation
**Risk Level**: Medium (database migrations need careful testing)
**Business Value**: High (enables platform expansion to multiple games)

Ready to begin implementation! 🎮
