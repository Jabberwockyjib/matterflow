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
      document_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          original_file_url: string | null
          status: string
          updated_at: string | null
          version: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          original_file_url?: string | null
          status?: string
          updated_at?: string | null
          version?: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          original_file_url?: string | null
          status?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_document_type: string | null
          ai_processed_at: string | null
          ai_suggested_folder: string | null
          ai_summary: string | null
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
          ai_document_type?: string | null
          ai_processed_at?: string | null
          ai_suggested_folder?: string | null
          ai_summary?: string | null
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
          ai_document_type?: string | null
          ai_processed_at?: string | null
          ai_suggested_folder?: string | null
          ai_summary?: string | null
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
      firm_settings: {
        Row: {
          id: string
          key: string
          value: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          key: string
          value?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          key?: string
          value?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firm_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      info_requests: {
        Row: {
          created_at: string
          documents: Json | null
          id: string
          intake_response_id: string
          message: string | null
          questions: Json
          requested_at: string
          requested_by: string
          responded_at: string | null
          response_deadline: string | null
          responses: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          documents?: Json | null
          id?: string
          intake_response_id: string
          message?: string | null
          questions: Json
          requested_at?: string
          requested_by: string
          responded_at?: string | null
          response_deadline?: string | null
          responses?: Json | null
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          documents?: Json | null
          id?: string
          intake_response_id?: string
          message?: string | null
          questions?: Json
          requested_at?: string
          requested_by?: string
          responded_at?: string | null
          response_deadline?: string | null
          responses?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "info_requests_intake_response_id_fkey"
            columns: ["intake_response_id"]
            isOneToOne: false
            referencedRelation: "intake_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "info_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
          review_status: string
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
          review_status?: string
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
          review_status?: string
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
      matter_document_history: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          details: Json | null
          id: string
          matter_document_id: string
          previous_pdf_url: string | null
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          details?: Json | null
          id?: string
          matter_document_id: string
          previous_pdf_url?: string | null
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          details?: Json | null
          id?: string
          matter_document_id?: string
          previous_pdf_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matter_document_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "matter_document_history_matter_document_id_fkey"
            columns: ["matter_document_id"]
            isOneToOne: false
            referencedRelation: "matter_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      matter_document_packages: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          id: string
          matter_id: string
          package_type: string | null
          selected_template_ids: string[] | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          matter_id: string
          package_type?: string | null
          selected_template_ids?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          matter_id?: string
          package_type?: string | null
          selected_template_ids?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matter_document_packages_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: true
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      matter_emails: {
        Row: {
          id: string
          matter_id: string
          gmail_message_id: string
          thread_id: string | null
          direction: string
          from_email: string
          to_email: string
          subject: string | null
          snippet: string | null
          ai_summary: string | null
          action_needed: boolean | null
          gmail_date: string
          gmail_link: string | null
          synced_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          matter_id: string
          gmail_message_id: string
          thread_id?: string | null
          direction: string
          from_email: string
          to_email: string
          subject?: string | null
          snippet?: string | null
          ai_summary?: string | null
          action_needed?: boolean | null
          gmail_date: string
          gmail_link?: string | null
          synced_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          matter_id?: string
          gmail_message_id?: string
          thread_id?: string | null
          direction?: string
          from_email?: string
          to_email?: string
          subject?: string | null
          snippet?: string | null
          ai_summary?: string | null
          action_needed?: boolean | null
          gmail_date?: string
          gmail_link?: string | null
          synced_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matter_emails_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      matter_documents: {
        Row: {
          created_at: string | null
          customizations: Json | null
          delivered_at: string | null
          document_type: string
          field_values: Json | null
          generated_at: string | null
          id: string
          matter_id: string
          name: string
          notes: string | null
          pdf_url: string | null
          source: string | null
          status: string | null
          template_id: string | null
          template_version: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customizations?: Json | null
          delivered_at?: string | null
          document_type: string
          field_values?: Json | null
          generated_at?: string | null
          id?: string
          matter_id: string
          name: string
          notes?: string | null
          pdf_url?: string | null
          source?: string | null
          status?: string | null
          template_id?: string | null
          template_version?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customizations?: Json | null
          delivered_at?: string | null
          document_type?: string
          field_values?: Json | null
          generated_at?: string | null
          id?: string
          matter_id?: string
          name?: string
          notes?: string | null
          pdf_url?: string | null
          source?: string | null
          status?: string | null
          template_id?: string | null
          template_version?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matter_documents_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matter_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
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
          address_city: string | null
          address_country: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          client_notes: string | null
          client_status: string | null
          company_name: string | null
          created_at: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string | null
          gmail_history_id: string | null
          gmail_last_sync: string | null
          gmail_sync_enabled: boolean | null
          google_connected_at: string | null
          google_refresh_token: string | null
          internal_notes: string | null
          invited_at: string | null
          invited_by: string | null
          last_login: string | null
          password_must_change: boolean | null
          phone: string | null
          phone_secondary: string | null
          phone_secondary_type: string | null
          phone_type: string | null
          preferred_contact_method: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          user_id: string
        }
        Insert: {
          address?: string | null
          address_city?: string | null
          address_country?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          client_notes?: string | null
          client_status?: string | null
          company_name?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          gmail_history_id?: string | null
          gmail_last_sync?: string | null
          gmail_sync_enabled?: boolean | null
          google_connected_at?: string | null
          google_refresh_token?: string | null
          internal_notes?: string | null
          invited_at?: string | null
          invited_by?: string | null
          last_login?: string | null
          password_must_change?: boolean | null
          phone?: string | null
          phone_secondary?: string | null
          phone_secondary_type?: string | null
          phone_type?: string | null
          preferred_contact_method?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          user_id: string
        }
        Update: {
          address?: string | null
          address_city?: string | null
          address_country?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          client_notes?: string | null
          client_status?: string | null
          company_name?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          gmail_history_id?: string | null
          gmail_last_sync?: string | null
          gmail_sync_enabled?: boolean | null
          google_connected_at?: string | null
          google_refresh_token?: string | null
          internal_notes?: string | null
          invited_at?: string | null
          invited_by?: string | null
          last_login?: string | null
          password_must_change?: boolean | null
          phone?: string | null
          phone_secondary?: string | null
          phone_secondary_type?: string | null
          phone_type?: string | null
          preferred_contact_method?: string | null
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
          description: string | null
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
          description?: string | null
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
          description?: string | null
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
      template_field_mappings: {
        Row: {
          field_id: string
          id: string
          template_id: string
        }
        Insert: {
          field_id: string
          id?: string
          template_id: string
        }
        Update: {
          field_id?: string
          id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_field_mappings_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "template_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_field_mappings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_fields: {
        Row: {
          created_at: string | null
          default_value: string | null
          field_type: string
          id: string
          intake_question_id: string | null
          is_required: boolean | null
          label: string
          name: string
          options: Json | null
          output_type: string | null
          source_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_value?: string | null
          field_type: string
          id?: string
          intake_question_id?: string | null
          is_required?: boolean | null
          label: string
          name: string
          options?: Json | null
          output_type?: string | null
          source_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_value?: string | null
          field_type?: string
          id?: string
          intake_question_id?: string | null
          is_required?: boolean | null
          label?: string
          name?: string
          options?: Json | null
          output_type?: string | null
          source_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      template_sections: {
        Row: {
          condition_rules: Json | null
          content: string
          created_at: string | null
          id: string
          is_conditional: boolean | null
          name: string
          sort_order: number
          template_id: string
          updated_at: string | null
        }
        Insert: {
          condition_rules?: Json | null
          content: string
          created_at?: string | null
          id?: string
          is_conditional?: boolean | null
          name: string
          sort_order?: number
          template_id: string
          updated_at?: string | null
        }
        Update: {
          condition_rules?: Json | null
          content?: string
          created_at?: string | null
          id?: string
          is_conditional?: boolean | null
          name?: string
          sort_order?: number
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
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
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            isOneToOne: false
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_level: { Args: { name: string }; Returns: number }
      get_prefix: { Args: { name: string }; Returns: string }
      get_prefixes: { Args: { name: string }; Returns: string[] }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const

