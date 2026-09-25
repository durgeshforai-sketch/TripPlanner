export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  tripsync: {
    Tables: {
      decision_votes: {
        Row: {
          created_at: string
          id: string
          member_id: string
          option_id: string
          round: number
          trip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          option_id: string
          round?: number
          trip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          option_id?: string
          round?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_votes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "recommendation_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_votes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          created_at: string
          id: string
          round: number
          runoff_option_ids: Json
          selected_option_id: string | null
          status: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          round?: number
          runoff_option_ids?: Json
          selected_option_id?: string | null
          status?: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          round?: number
          runoff_option_ids?: Json
          selected_option_id?: string | null
          status?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "recommendation_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string
          id: string
          name: string
          role: string
          status: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          role?: string
          status?: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          role?: string
          status?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      option_member_fits: {
        Row: {
          conflicts: Json
          fit_status: string
          id: string
          matched_preferences: Json
          member_id: string
          option_id: string
          score: number
        }
        Insert: {
          conflicts?: Json
          fit_status: string
          id?: string
          matched_preferences?: Json
          member_id: string
          option_id: string
          score: number
        }
        Update: {
          conflicts?: Json
          fit_status?: string
          id?: string
          matched_preferences?: Json
          member_id?: string
          option_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "option_member_fits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "option_member_fits_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "recommendation_options"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          member_id: string
          role: string
          token_hash: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          member_id: string
          role: string
          token_hash: string
          trip_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          member_id?: string
          role?: string
          token_hash?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_sessions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_sessions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      preferences: {
        Row: {
          budget_flexibility: string
          comfortable_budget: number
          created_at: string
          deal_breakers: Json
          desired_destinations: Json
          destination_mode: string
          id: string
          max_days: number
          maximum_budget: number
          member_id: string
          min_days: number
          must_haves: Json
          nearest_airport: string | null
          origin_city: string
          origin_latitude: number | null
          origin_longitude: number | null
          origin_place_id: string | null
          possible_dates: Json
          preferred_dates: Json
          preferred_days: number
          submitted_at: string | null
          transport_modes: Json
          travel_scope: string
          trip_id: string
          trip_styles: Json
          unavailable_dates: Json
          updated_at: string
        }
        Insert: {
          budget_flexibility: string
          comfortable_budget: number
          created_at?: string
          deal_breakers?: Json
          desired_destinations?: Json
          destination_mode: string
          id?: string
          max_days: number
          maximum_budget: number
          member_id: string
          min_days: number
          must_haves?: Json
          nearest_airport?: string | null
          origin_city: string
          origin_latitude?: number | null
          origin_longitude?: number | null
          origin_place_id?: string | null
          possible_dates?: Json
          preferred_dates?: Json
          preferred_days: number
          submitted_at?: string | null
          transport_modes?: Json
          travel_scope: string
          trip_id: string
          trip_styles?: Json
          unavailable_dates?: Json
          updated_at?: string
        }
        Update: {
          budget_flexibility?: string
          comfortable_budget?: number
          created_at?: string
          deal_breakers?: Json
          desired_destinations?: Json
          destination_mode?: string
          id?: string
          max_days?: number
          maximum_budget?: number
          member_id?: string
          min_days?: number
          must_haves?: Json
          nearest_airport?: string | null
          origin_city?: string
          origin_latitude?: number | null
          origin_longitude?: number | null
          origin_place_id?: string | null
          possible_dates?: Json
          preferred_dates?: Json
          preferred_days?: number
          submitted_at?: string | null
          transport_modes?: Json
          travel_scope?: string
          trip_id?: string
          trip_styles?: Json
          unavailable_dates?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "preferences_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preferences_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_options: {
        Row: {
          activities: Json
          compromise: string | null
          conflicts: Json
          created_at: string
          dates: Json
          destination: Json
          destination_id: string
          duration: number
          estimated_budget: Json
          explanation_source: string
          flight_summary: Json | null
          group_score: number
          id: string
          itinerary: Json
          members_satisfied: number
          rank: number
          reasons: Json
          run_id: string
          source_timestamps: Json
          top_styles: Json
          transport_summary: Json | null
          travel_summary: Json | null
        }
        Insert: {
          activities?: Json
          compromise?: string | null
          conflicts?: Json
          created_at?: string
          dates: Json
          destination: Json
          destination_id: string
          duration: number
          estimated_budget: Json
          explanation_source?: string
          flight_summary?: Json | null
          group_score: number
          id?: string
          itinerary?: Json
          members_satisfied?: number
          rank: number
          reasons?: Json
          run_id: string
          source_timestamps?: Json
          top_styles?: Json
          transport_summary?: Json | null
          travel_summary?: Json | null
        }
        Update: {
          activities?: Json
          compromise?: string | null
          conflicts?: Json
          created_at?: string
          dates?: Json
          destination?: Json
          destination_id?: string
          duration?: number
          estimated_budget?: Json
          explanation_source?: string
          flight_summary?: Json | null
          group_score?: number
          id?: string
          itinerary?: Json
          members_satisfied?: number
          rank?: number
          reasons?: Json
          run_id?: string
          source_timestamps?: Json
          top_styles?: Json
          transport_summary?: Json | null
          travel_summary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_options_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "recommendation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          engine_version: string
          error_message: string | null
          id: string
          shortfall_reason: string | null
          snapshot: Json | null
          status: string
          trip_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          engine_version: string
          error_message?: string | null
          id?: string
          shortfall_reason?: string | null
          snapshot?: Json | null
          status?: string
          trip_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          engine_version?: string
          error_message?: string | null
          id?: string
          shortfall_reason?: string | null
          snapshot?: Json | null
          status?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_runs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          created_at: string
          description: string | null
          expected_members: number
          id: string
          invite_code: string
          name: string
          owner_member_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          expected_members?: number
          id?: string
          invite_code: string
          name: string
          owner_member_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          expected_members?: number
          id?: string
          invite_code?: string
          name?: string
          owner_member_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_owner_member_fk"
            columns: ["owner_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  tripsync: {
    Enums: {},
  },
} as const
