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
          task_id: string | null
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
          task_id?: string | null
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
          task_id?: string | null
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
          {
            foreignKeyName: "documents_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
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
          updated_at: string | null
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
          updated_at?: string | null
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
          updated_at?: string | null
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
      matter_documents: {
        Row: {
          ai_document_type: string | null
          ai_processed_at: string | null
          ai_suggested_folder: string | null
          ai_summary: string | null
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
          ai_document_type?: string | null
          ai_processed_at?: string | null
          ai_suggested_folder?: string | null
          ai_summary?: string | null
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
          ai_document_type?: string | null
          ai_processed_at?: string | null
          ai_suggested_folder?: string | null
          ai_summary?: string | null
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
      matter_emails: {
        Row: {
          action_needed: boolean | null
          ai_summary: string | null
          created_at: string | null
          direction: string
          from_email: string
          gmail_date: string
          gmail_link: string | null
          gmail_message_id: string
          id: string
          matter_id: string
          snippet: string | null
          subject: string | null
          synced_at: string | null
          thread_id: string | null
          to_email: string
        }
        Insert: {
          action_needed?: boolean | null
          ai_summary?: string | null
          created_at?: string | null
          direction: string
          from_email: string
          gmail_date: string
          gmail_link?: string | null
          gmail_message_id: string
          id?: string
          matter_id: string
          snippet?: string | null
          subject?: string | null
          synced_at?: string | null
          thread_id?: string | null
          to_email: string
        }
        Update: {
          action_needed?: boolean | null
          ai_summary?: string | null
          created_at?: string | null
          direction?: string
          from_email?: string
          gmail_date?: string
          gmail_link?: string | null
          gmail_message_id?: string
          id?: string
          matter_id?: string
          snippet?: string | null
          subject?: string | null
          synced_at?: string | null
          thread_id?: string | null
          to_email?: string
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
          square_access_token: string | null
          square_application_id: string | null
          square_application_secret: string | null
          square_connected_at: string | null
          square_environment: string | null
          square_location_id: string | null
          square_location_name: string | null
          square_merchant_id: string | null
          square_refresh_token: string | null
          square_webhook_signature_key: string | null
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
          square_access_token?: string | null
          square_application_id?: string | null
          square_application_secret?: string | null
          square_connected_at?: string | null
          square_environment?: string | null
          square_location_id?: string | null
          square_location_name?: string | null
          square_merchant_id?: string | null
          square_refresh_token?: string | null
          square_webhook_signature_key?: string | null
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
          square_access_token?: string | null
          square_application_id?: string | null
          square_application_secret?: string | null
          square_connected_at?: string | null
          square_environment?: string | null
          square_location_id?: string | null
          square_location_name?: string | null
          square_merchant_id?: string | null
          square_refresh_token?: string | null
          square_webhook_signature_key?: string | null
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
      task_responses: {
        Row: {
          confirmed_at: string | null
          created_at: string
          id: string
          response_text: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          submitted_at: string
          submitted_by: string
          task_id: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          response_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_at?: string
          submitted_by: string
          task_id: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          response_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_responses_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_responses_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_responses_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          instructions: string | null
          matter_id: string
          responsible_party: string
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          matter_id: string
          responsible_party: string
          status?: string
          task_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          matter_id?: string
          responsible_party?: string
          status?: string
          task_type?: string
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
    Enums: {
      user_role: ["admin", "staff", "client"],
    },
  },
} as const
