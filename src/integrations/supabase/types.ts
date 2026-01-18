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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_emails: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      challenge_records: {
        Row: {
          correct_count: number
          created_at: string
          id: string
          items_answered: number
          score: number
          time_seconds: number
          user_id: string
        }
        Insert: {
          correct_count?: number
          created_at?: string
          id?: string
          items_answered?: number
          score?: number
          time_seconds?: number
          user_id: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          id?: string
          items_answered?: number
          score?: number
          time_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_goals: {
        Row: {
          completed_at: string | null
          created_at: string
          current_value: number
          date: string
          goal_type: string
          id: string
          target_value: number
          user_id: string
          xp_reward: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_value?: number
          date?: string
          goal_type?: string
          id?: string
          target_value?: number
          user_id: string
          xp_reward?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_value?: number
          date?: string
          goal_type?: string
          id?: string
          target_value?: number
          user_id?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_media: {
        Row: {
          created_at: string
          exercise_id: string | null
          filename: string | null
          id: string
          lesson_id: string | null
          metadata: Json | null
          module_id: string | null
          type: string
          url: string
        }
        Insert: {
          created_at?: string
          exercise_id?: string | null
          filename?: string | null
          id?: string
          lesson_id?: string | null
          metadata?: Json | null
          module_id?: string | null
          type: string
          url: string
        }
        Update: {
          created_at?: string
          exercise_id?: string | null
          filename?: string | null
          id?: string
          lesson_id?: string | null
          metadata?: Json | null
          module_id?: string | null
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_media_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_media_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_media_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_time_estimates: {
        Row: {
          base_minutes: number
          created_at: string | null
          description: string | null
          exercise_type: string
          id: string
          repetitions_to_master: number
          review_minutes: number
          updated_at: string | null
        }
        Insert: {
          base_minutes: number
          created_at?: string | null
          description?: string | null
          exercise_type: string
          id?: string
          repetitions_to_master: number
          review_minutes: number
          updated_at?: string | null
        }
        Update: {
          base_minutes?: number
          created_at?: string | null
          description?: string | null
          exercise_type?: string
          id?: string
          repetitions_to_master?: number
          review_minutes?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          content: Json
          created_at: string
          display_order: number
          id: string
          is_published: boolean
          lesson_id: string
          phase: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          display_order?: number
          id?: string
          is_published?: boolean
          lesson_id: string
          phase?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          display_order?: number
          id?: string
          is_published?: boolean
          lesson_id?: string
          phase?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_audio_cache: {
        Row: {
          audio_url: string
          created_at: string
          file_size_bytes: number | null
          id: string
          text_hash: string
          text_preview: string
          voice_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          text_hash: string
          text_preview: string
          voice_id?: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          text_hash?: string
          text_preview?: string
          voice_id?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          duration_minutes: number | null
          id: string
          is_published: boolean
          module_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          duration_minutes?: number | null
          id?: string
          is_published?: boolean
          module_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          duration_minutes?: number | null
          id?: string
          is_published?: boolean
          module_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_completions: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          is_certified: boolean
          module_id: string
          quiz_score: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          is_certified?: boolean
          module_id: string
          quiz_score: number
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          is_certified?: boolean
          module_id?: string
          quiz_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_completions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_phase_progress: {
        Row: {
          created_at: string | null
          id: string
          module_id: string
          phase1_completed_at: string | null
          phase2_completed_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          module_id: string
          phase1_completed_at?: string | null
          phase2_completed_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          module_id?: string
          phase1_completed_at?: string | null
          phase2_completed_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_phase_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_phase_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_retention_schedule: {
        Row: {
          created_at: string | null
          id: string
          items_correct: number | null
          items_reviewed: number | null
          last_review_at: string | null
          module_id: string
          next_review_at: string
          retention_score: number | null
          review_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          items_correct?: number | null
          items_reviewed?: number | null
          last_review_at?: string | null
          module_id: string
          next_review_at?: string
          retention_score?: number | null
          review_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          items_correct?: number | null
          items_reviewed?: number | null
          last_review_at?: string | null
          module_id?: string
          next_review_at?: string
          retention_score?: number | null
          review_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_retention_schedule_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_retention_schedule_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_published: boolean
          level: string | null
          theme: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_published?: boolean
          level?: string | null
          theme?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_published?: boolean
          level?: string | null
          theme?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          mfa_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          mfa_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          mfa_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      review_error_stats: {
        Row: {
          accent_errors: number
          created_at: string
          exercise_id: string | null
          id: string
          insertion_errors: number
          last_review_at: string | null
          last_typed_text: string | null
          module_id: string | null
          omission_errors: number
          original_text: string | null
          other_errors: number
          review_count: number
          spaced_item_id: string | null
          updated_at: string
          user_id: string
          word_swap_errors: number
        }
        Insert: {
          accent_errors?: number
          created_at?: string
          exercise_id?: string | null
          id?: string
          insertion_errors?: number
          last_review_at?: string | null
          last_typed_text?: string | null
          module_id?: string | null
          omission_errors?: number
          original_text?: string | null
          other_errors?: number
          review_count?: number
          spaced_item_id?: string | null
          updated_at?: string
          user_id: string
          word_swap_errors?: number
        }
        Update: {
          accent_errors?: number
          created_at?: string
          exercise_id?: string | null
          id?: string
          insertion_errors?: number
          last_review_at?: string | null
          last_typed_text?: string | null
          module_id?: string | null
          omission_errors?: number
          original_text?: string | null
          other_errors?: number
          review_count?: number
          spaced_item_id?: string | null
          updated_at?: string
          user_id?: string
          word_swap_errors?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_error_stats_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_error_stats_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_error_stats_spaced_item_id_fkey"
            columns: ["spaced_item_id"]
            isOneToOne: false
            referencedRelation: "spaced_repetition_items"
            referencedColumns: ["id"]
          },
        ]
      }
      spaced_repetition_items: {
        Row: {
          correct_reviews: number
          created_at: string
          ease_factor: number
          exercise_id: string | null
          id: string
          interval_days: number
          item_index: number
          item_text: string
          lesson_id: string | null
          module_id: string | null
          next_review_at: string
          repetitions: number
          total_reviews: number
          updated_at: string
          user_id: string
        }
        Insert: {
          correct_reviews?: number
          created_at?: string
          ease_factor?: number
          exercise_id?: string | null
          id?: string
          interval_days?: number
          item_index: number
          item_text: string
          lesson_id?: string | null
          module_id?: string | null
          next_review_at?: string
          repetitions?: number
          total_reviews?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          correct_reviews?: number
          created_at?: string
          ease_factor?: number
          exercise_id?: string | null
          id?: string
          interval_days?: number
          item_index?: number
          item_text?: string
          lesson_id?: string | null
          module_id?: string | null
          next_review_at?: string
          repetitions?: number
          total_reviews?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaced_repetition_items_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaced_repetition_items_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaced_repetition_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaced_repetition_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_key: string
          created_at: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          created_at?: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          created_at?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_experience: {
        Row: {
          created_at: string
          current_level: number
          id: string
          level_name: string
          total_xp: number
          updated_at: string
          user_id: string
          xp_multiplier: number
        }
        Insert: {
          created_at?: string
          current_level?: number
          id?: string
          level_name?: string
          total_xp?: number
          updated_at?: string
          user_id: string
          xp_multiplier?: number
        }
        Update: {
          created_at?: string
          current_level?: number
          id?: string
          level_name?: string
          total_xp?: number
          updated_at?: string
          user_id?: string
          xp_multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_experience_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string | null
          id: string
          invited_by_id: string
          invited_by_name: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by_id: string
          invited_by_name?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by_id?: string
          invited_by_name?: string | null
          status?: string
        }
        Relationships: []
      }
      user_module_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          module_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          module_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          module_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          attempts: number
          completed_at: string
          created_at: string
          exercise_id: string | null
          id: string
          lesson_id: string | null
          module_id: string | null
          score: number | null
          user_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string
          created_at?: string
          exercise_id?: string | null
          id?: string
          lesson_id?: string | null
          module_id?: string | null
          score?: number | null
          user_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string
          created_at?: string
          exercise_id?: string | null
          id?: string
          lesson_id?: string | null
          module_id?: string | null
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_recordings: {
        Row: {
          audio_url: string
          created_at: string
          duration_seconds: number | null
          exercise_id: string | null
          id: string
          lesson_id: string | null
          module_id: string | null
          phase: string | null
          text_content: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration_seconds?: number | null
          exercise_id?: string | null
          id?: string
          lesson_id?: string | null
          module_id?: string | null
          phase?: string | null
          text_content: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration_seconds?: number | null
          exercise_id?: string | null
          id?: string
          lesson_id?: string | null
          module_id?: string | null
          phase?: string | null
          text_content?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_recordings_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_recordings_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_recordings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_review_date: string | null
          longest_streak: number
          total_review_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_review_date?: string | null
          longest_streak?: number
          total_review_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_review_date?: string | null
          longest_streak?: number
          total_review_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_study_plans: {
        Row: {
          availability: Json
          created_at: string
          estimated_completion_date: string | null
          id: string
          last_calculated_at: string | null
          preferred_time: string
          session_duration_minutes: number
          total_study_hours: number | null
          updated_at: string
          user_id: string
          weekly_hours: number | null
        }
        Insert: {
          availability?: Json
          created_at?: string
          estimated_completion_date?: string | null
          id?: string
          last_calculated_at?: string | null
          preferred_time?: string
          session_duration_minutes?: number
          total_study_hours?: number | null
          updated_at?: string
          user_id: string
          weekly_hours?: number | null
        }
        Update: {
          availability?: Json
          created_at?: string
          estimated_completion_date?: string | null
          id?: string
          last_calculated_at?: string | null
          preferred_time?: string
          session_duration_minutes?: number
          total_study_hours?: number | null
          updated_at?: string
          user_id?: string
          weekly_hours?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_module_phase1_complete: {
        Args: { p_module_id: string; p_user_id: string }
        Returns: boolean
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
