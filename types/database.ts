export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tournaments: {
        Row: {
          id: string
          name: string
          status: 'setup' | 'league' | 'playoffs' | 'completed'
          current_phase: 'league' | 'quarter' | 'semi' | 'final' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          status: 'setup' | 'league' | 'playoffs' | 'completed'
          current_phase?: 'league' | 'quarter' | 'semi' | 'final' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          status?: 'setup' | 'league' | 'playoffs' | 'completed'
          current_phase?: 'league' | 'quarter' | 'semi' | 'final' | null
          created_at?: string
          updated_at?: string
        }
      }
      players: {
        Row: {
          id: string
          tournament_id: string
          player_name: string
          player_tag: string | null
          seed_position: number | null
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          player_name: string
          player_tag?: string | null
          seed_position?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          player_name?: string
          player_tag?: string | null
          seed_position?: number | null
          created_at?: string
        }
      }
      league_matches: {
        Row: {
          id: string
          tournament_id: string
          match_number: number
          player1_id: string
          player2_id: string
          player1_score: number
          player2_score: number
          status: 'pending' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          match_number: number
          player1_id: string
          player2_id: string
          player1_score?: number
          player2_score?: number
          status?: 'pending' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          match_number?: number
          player1_id?: string
          player2_id?: string
          player1_score?: number
          player2_score?: number
          status?: 'pending' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
      league_standings: {
        Row: {
          id: string
          tournament_id: string
          player_id: string
          wins: number
          losses: number
          points: number
          games_played: number
          crowns_for: number
          crowns_against: number
          crown_difference: number
        }
        Insert: {
          id?: string
          tournament_id: string
          player_id: string
          wins?: number
          losses?: number
          points?: number
          games_played?: number
          crowns_for?: number
          crowns_against?: number
          crown_difference?: number
        }
        Update: {
          id?: string
          tournament_id?: string
          player_id?: string
          wins?: number
          losses?: number
          points?: number
          games_played?: number
          crowns_for?: number
          crowns_against?: number
          crown_difference?: number
        }
      }
      playoff_matches: {
        Row: {
          id: string
          tournament_id: string
          round: 'quarter' | 'semi' | 'final'
          match_number: number
          player1_id: string
          player2_id: string
          winner_id: string | null
          player1_score: number
          player2_score: number
          status: 'pending' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          round: 'quarter' | 'semi' | 'final'
          match_number: number
          player1_id: string
          player2_id: string
          winner_id?: string | null
          player1_score?: number
          player2_score?: number
          status?: 'pending' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          round?: 'quarter' | 'semi' | 'final'
          match_number?: number
          player1_id?: string
          player2_id?: string
          winner_id?: string | null
          player1_score?: number
          player2_score?: number
          status?: 'pending' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_player_standing: {
        Args: {
          p_tournament_id: string
          p_player_id: string
          p_win: boolean
          p_crowns_for: number
          p_crowns_against: number
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}