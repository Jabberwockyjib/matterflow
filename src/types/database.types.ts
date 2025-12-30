export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      client_invitations: {
        Row: {
          client_email: string
          client_name: string
          completed_at: string | null
          created_at: string | null
          documents: Json | null
          expires_at: string | null
          id: string
          invite_code: string
          invited_at: string | null
          invited_by: string | null
          matter_type: string | null
          notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          client_email: string
          client_name: string
          completed_at?: string | null
          created_at?: string | null
          documents?: Json | null
          expires_at?: string | null
          id?: string
          invite_code: string
          invited_at?: string | null
          invited_by?: string | null
          matter_type?: string | null
          notes?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          client_email?: string
          client_name?: string
          completed_at?: string | null
          created_at?: string | null
          documents?: Json | null
          expires_at?: string | null
          id?: string
          invite_code?: string
          invited_at?: string | null
          invited_by?: string | null
          matter_type?: string | null
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          drive_file_id: string | null
          file_size: number | null
          folder_path: string | null
          id: string
          matter_id: string
          metadata: Json | null
          mime_type: string | null
          status: string
          summary: string | null
          title: string
          version: number
          web_view_link: string | null
        }
        Insert: {
          created_at?: string
          drive_file_id?: string | null
          file_size?: number | null
          folder_path?: string | null
          id?: string
          matter_id: string
          metadata?: Json | null
          mime_type?: string | null
          status?: string
          summary?: string | null
          title: string
          version?: number
          web_view_link?: string | null
        }
        Update: {
          created_at?: string
          drive_file_id?: string | null
          file_size?: number | null
          folder_path?: string | null
          id?: string
          matter_id?: string
          metadata?: Json | null
          mime_type?: string | null
          status?: string
          summary?: string | null
          title?: string
          version?: number
          web_view_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_responses: {
        Row: {
          created_at: string
          decline_reason: string | null
          form_type: string
          id: string
          internal_notes: string | null
          matter_id: string
          responses: Json | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
        }
        Insert: {
          created_at?: string
          decline_reason?: string | null
          form_type: string
          id?: string
          internal_notes?: string | null
          matter_id: string
          responses?: Json | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
        }
        Update: {
          created_at?: string
          decline_reason?: string | null
          form_type?: string
          id?: string
          internal_notes?: string | null
          matter_id?: string
          responses?: Json | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_responses_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_responses_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          line_items: Json
          matter_id: string
          square_invoice_id: string | null
          status: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          line_items?: Json
          matter_id: string
          square_invoice_id?: string | null
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          line_items?: Json
          matter_id?: string
          square_invoice_id?: string | null
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      matter_folders: {
        Row: {
          client_folder_id: string
          created_at: string
          folder_structure: Json
          id: string
          matter_folder_id: string
          matter_id: string
          updated_at: string
        }
        Insert: {
          client_folder_id: string
          created_at?: string
          folder_structure?: Json
          id?: string
          matter_folder_id: string
          matter_id: string
          updated_at?: string
        }
        Update: {
          client_folder_id?: string
          created_at?: string
          folder_structure?: Json
          id?: string
          matter_folder_id?: string
          matter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matter_folders_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: true
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      matters: {
        Row: {
          billing_model: string
          client_id: string | null
          created_at: string
          id: string
          intake_received_at: string | null
          matter_type: string
          next_action: string
          next_action_due_date: string
          owner_id: string
          responsible_party: string
          stage: string
          title: string
          updated_at: string
        }
        Insert: {
          billing_model: string
          client_id?: string | null
          created_at?: string
          id?: string
          intake_received_at?: string | null
          matter_type: string
          next_action: string
          next_action_due_date?: string
          owner_id: string
          responsible_party: string
          stage?: string
          title: string
          updated_at?: string
        }
        Update: {
          billing_model?: string
          client_id?: string | null
          created_at?: string
          id?: string
          intake_received_at?: string | null
          matter_type?: string
          next_action?: string
          next_action_due_date?: string
          owner_id?: string
          responsible_party?: string
          stage?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matters_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "matters_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      packages: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          included_hours: number | null
          name: string
          price_cents: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          included_hours?: number | null
          name: string
          price_cents?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          included_hours?: number | null
          name?: string
          price_cents?: number
        }
        Relationships: []
      }
      practice_settings: {
        Row: {
          address: string | null
          auto_reminders_enabled: boolean | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          default_hourly_rate: number | null
          firm_name: string
          google_connected_at: string | null
          google_refresh_token: string | null
          id: string
          late_fee_percentage: number | null
          matter_types: Json | null
          payment_terms_days: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          auto_reminders_enabled?: boolean | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          default_hourly_rate?: number | null
          firm_name?: string
          google_connected_at?: string | null
          google_refresh_token?: string | null
          id?: string
          late_fee_percentage?: number | null
          matter_types?: Json | null
          payment_terms_days?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          auto_reminders_enabled?: boolean | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          default_hourly_rate?: number | null
          firm_name?: string
          google_connected_at?: string | null
          google_refresh_token?: string | null
          id?: string
          late_fee_percentage?: number | null
          matter_types?: Json | null
          payment_terms_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          client_notes: string | null
          client_status: string | null
          created_at: string
          full_name: string | null
          google_connected_at: string | null
          google_refresh_token: string | null
          invited_at: string | null
          invited_by: string | null
          last_login: string | null
          password_must_change: boolean | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          user_id: string
        }
        Insert: {
          address?: string | null
          client_notes?: string | null
          client_status?: string | null
          created_at?: string
          full_name?: string | null
          google_connected_at?: string | null
          google_refresh_token?: string | null
          invited_at?: string | null
          invited_by?: string | null
          last_login?: string | null
          password_must_change?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          user_id: string
        }
        Update: {
          address?: string | null
          client_notes?: string | null
          client_status?: string | null
          created_at?: string
          full_name?: string | null
          google_connected_at?: string | null
          google_refresh_token?: string | null
          invited_at?: string | null
          invited_by?: string | null
          last_login?: string | null
          password_must_change?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          matter_id: string
          responsible_party: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          matter_id: string
          responsible_party: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          matter_id?: string
          responsible_party?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          matter_id: string
          rate_cents: number | null
          started_at: string
          status: string
          task_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          matter_id: string
          rate_cents?: number | null
          started_at?: string
          status?: string
          task_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          matter_id?: string
          rate_cents?: number | null
          started_at?: string
          status?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "time_entries_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      user_role: "admin" | "staff" | "client"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      user_role: ["admin", "staff", "client"],
    },
  },
} as const

