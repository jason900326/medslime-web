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
  public: {
    Tables: {
      ai_explanation_events: {
        Row: {
          created_at: string
          event_type: string
          id: number
          question_key: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: number
          question_key: string
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: number
          question_key?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_explanation_feedback: {
        Row: {
          created_at: string
          feedback: string
          question_key: string
          source: string
          source_label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback: string
          question_key: string
          source: string
          source_label?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback?: string
          question_key?: string
          source?: string
          source_label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_question_explanations: {
        Row: {
          created_at: string
          explanation: Json
          question_key: string
          source: string
          source_label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          explanation: Json
          question_key: string
          source: string
          source_label?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          explanation?: Json
          question_key?: string
          source?: string
          source_label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      beta_feedback: {
        Row: {
          created_at: string
          id: number
          message: string
          pathname: string | null
          type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          message: string
          pathname?: string | null
          type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          message?: string
          pathname?: string | null
          type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      exam_attempts: {
        Row: {
          answered_count: number
          completed_at: string
          correct_count: number
          created_at: string
          duration_seconds: number
          exam_key: string
          id: string
          question_items: Json
          question_outcomes: Json
          review_count: number
          review_items: Json
          score: number
          session: string
          subject: string
          uncertain_count: number
          user_id: string
          year: string
        }
        Insert: {
          answered_count?: number
          completed_at?: string
          correct_count?: number
          created_at?: string
          duration_seconds?: number
          exam_key: string
          id?: string
          question_items?: Json
          question_outcomes?: Json
          review_count?: number
          review_items?: Json
          score?: number
          session: string
          subject: string
          uncertain_count?: number
          user_id: string
          year: string
        }
        Update: {
          answered_count?: number
          completed_at?: string
          correct_count?: number
          created_at?: string
          duration_seconds?: number
          exam_key?: string
          id?: string
          question_items?: Json
          question_outcomes?: Json
          review_count?: number
          review_items?: Json
          score?: number
          session?: string
          subject?: string
          uncertain_count?: number
          user_id?: string
          year?: string
        }
        Relationships: []
      }
      exam_explanation_entitlements: {
        Row: {
          exam_key: string
          order_id: string | null
          purchased_at: string
          session: string
          subject: string
          user_id: string
          year: string
        }
        Insert: {
          exam_key: string
          order_id?: string | null
          purchased_at?: string
          session: string
          subject: string
          user_id: string
          year: string
        }
        Update: {
          exam_key?: string
          order_id?: string | null
          purchased_at?: string
          session?: string
          subject?: string
          user_id?: string
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_explanation_entitlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_reports: {
        Row: {
          category: string
          created_at: string
          description: string
          email: string
          id: string
          page_url: string | null
          status: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          email: string
          id?: string
          page_url?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          email?: string
          id?: string
          page_url?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      learning_profiles: {
        Row: {
          biggest_pain: string
          education_stage: string
          primary_goal: string
          session_length: string
          study_method: string
          updated_at: string
          user_id: string
        }
        Insert: {
          biggest_pain: string
          education_stage: string
          primary_goal: string
          session_length: string
          study_method: string
          updated_at?: string
          user_id: string
        }
        Update: {
          biggest_pain?: string
          education_stage?: string
          primary_goal?: string
          session_length?: string
          study_method?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      material_analysis_cache: {
        Row: {
          analysis: Json
          char_count: number
          content_hash: string
          created_at: string
          extracted_text: string
          file_name: string
          id: string
          questions: Json
          similarity_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis: Json
          char_count: number
          content_hash: string
          created_at?: string
          extracted_text: string
          file_name: string
          id?: string
          questions: Json
          similarity_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis?: Json
          char_count?: number
          content_hash?: string
          created_at?: string
          extracted_text?: string
          file_name?: string
          id?: string
          questions?: Json
          similarity_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      national_exam_questions: {
        Row: {
          answer_pdf_url: string | null
          category: string
          concepts: string[]
          correct_answers: Json
          corrected_answer_pdf_url: string | null
          correction_note: string | null
          created_at: string
          exam_code: string
          exam_round: string
          exam_year: number
          has_image_hint: boolean
          id: number
          image_url: string | null
          is_corrected: boolean
          options: Json
          parse_status: string
          question: string
          question_number: number
          question_pdf_page: number | null
          question_pdf_url: string
          raw_block: string | null
          roc_year: number
          source_page_url: string
          subject: string
          subject_code: string | null
          subtopic: string | null
          taxonomy_confidence: number | null
          taxonomy_model: string | null
          taxonomy_status: string
          taxonomy_updated_at: string | null
          taxonomy_version: string | null
          topic: string | null
        }
        Insert: {
          answer_pdf_url?: string | null
          category?: string
          concepts?: string[]
          correct_answers?: Json
          corrected_answer_pdf_url?: string | null
          correction_note?: string | null
          created_at?: string
          exam_code: string
          exam_round: string
          exam_year: number
          has_image_hint?: boolean
          id?: number
          image_url?: string | null
          is_corrected?: boolean
          options?: Json
          parse_status?: string
          question: string
          question_number: number
          question_pdf_page?: number | null
          question_pdf_url: string
          raw_block?: string | null
          roc_year: number
          source_page_url: string
          subject: string
          subject_code?: string | null
          subtopic?: string | null
          taxonomy_confidence?: number | null
          taxonomy_model?: string | null
          taxonomy_status?: string
          taxonomy_updated_at?: string | null
          taxonomy_version?: string | null
          topic?: string | null
        }
        Update: {
          answer_pdf_url?: string | null
          category?: string
          concepts?: string[]
          correct_answers?: Json
          corrected_answer_pdf_url?: string | null
          correction_note?: string | null
          created_at?: string
          exam_code?: string
          exam_round?: string
          exam_year?: number
          has_image_hint?: boolean
          id?: number
          image_url?: string | null
          is_corrected?: boolean
          options?: Json
          parse_status?: string
          question?: string
          question_number?: number
          question_pdf_page?: number | null
          question_pdf_url?: string
          raw_block?: string | null
          roc_year?: number
          source_page_url?: string
          subject?: string
          subject_code?: string | null
          subtopic?: string | null
          taxonomy_confidence?: number | null
          taxonomy_model?: string | null
          taxonomy_status?: string
          taxonomy_updated_at?: string | null
          taxonomy_version?: string | null
          topic?: string | null
        }
        Relationships: []
      }
      payment_orders: {
        Row: {
          created_at: string
          entitlement_key: string | null
          entitlement_metadata: Json
          entitlement_type: string | null
          grant_amount: number | null
          grant_type: string | null
          id: string
          merchant_trade_no: string
          paid_at: string | null
          product_id: string
          provider: string
          provider_message: string | null
          provider_trade_no: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entitlement_key?: string | null
          entitlement_metadata?: Json
          entitlement_type?: string | null
          grant_amount?: number | null
          grant_type?: string | null
          id?: string
          merchant_trade_no: string
          paid_at?: string | null
          product_id: string
          provider?: string
          provider_message?: string | null
          provider_trade_no?: string | null
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entitlement_key?: string | null
          entitlement_metadata?: Json
          entitlement_type?: string | null
          grant_amount?: number | null
          grant_type?: string | null
          id?: string
          merchant_trade_no?: string
          paid_at?: string | null
          product_id?: string
          provider?: string
          provider_message?: string | null
          provider_trade_no?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      player_account_state: {
        Row: {
          state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          state?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      player_entitlements: {
        Row: {
          ai_detail_credits: number
          ai_detail_free_period: string | null
          ai_detail_free_used: number
          pro_expires_at: string | null
          pro_trial_granted_at: string | null
          updated_at: string
          user_id: string
          welcome_gift_claimed_at: string | null
        }
        Insert: {
          ai_detail_credits?: number
          ai_detail_free_period?: string | null
          ai_detail_free_used?: number
          pro_expires_at?: string | null
          pro_trial_granted_at?: string | null
          updated_at?: string
          user_id: string
          welcome_gift_claimed_at?: string | null
        }
        Update: {
          ai_detail_credits?: number
          ai_detail_free_period?: string | null
          ai_detail_free_used?: number
          pro_expires_at?: string | null
          pro_trial_granted_at?: string | null
          updated_at?: string
          user_id?: string
          welcome_gift_claimed_at?: string | null
        }
        Relationships: []
      }
      player_mistakes: {
        Row: {
          created_at: string
          mistake_id: string
          record: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          mistake_id: string
          record: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          mistake_id?: string
          record?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shared_ai_explanations: {
        Row: {
          created_at: string
          explanation: Json
          question_key: string
          source: string
          source_label: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          explanation: Json
          question_key: string
          source?: string
          source_label?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          explanation?: Json
          question_key?: string
          source?: string
          source_label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_question_learning_state: {
        Row: {
          concept_unfamiliar: boolean
          created_at: string
          last_practiced_at: string | null
          mastered_at: string | null
          mastery_streak: number
          note: string
          question_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          concept_unfamiliar?: boolean
          created_at?: string
          last_practiced_at?: string | null
          mastered_at?: string | null
          mastery_streak?: number
          note?: string
          question_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          concept_unfamiliar?: boolean
          created_at?: string
          last_practiced_at?: string | null
          mastered_at?: string | null
          mastery_streak?: number
          note?: string
          question_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_question_mastery_outcomes: {
        Args: { p_outcomes: Json }
        Returns: Json
      }
      claim_campaign_welcome_gift: {
        Args: { p_user_id: string }
        Returns: Json
      }
      consume_ai_detail_daily_use: {
        Args: { p_user_id: string }
        Returns: Json
      }
      fulfill_payment_order: {
        Args: { p_merchant_trade_no: string; p_provider_trade_no?: string }
        Returns: undefined
      }
      refund_ai_detail_daily_use: { Args: { p_user_id: string }; Returns: Json }
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
  public: {
    Enums: {},
  },
} as const
