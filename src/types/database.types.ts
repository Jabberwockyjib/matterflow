export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          actor_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string | null;
          event_type: string;
          id: string;
          metadata: Json | null;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          event_type: string;
          id?: string;
          metadata?: Json | null;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          event_type?: string;
          id?: string;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          }
        ];
      };
      documents: {
        Row: {
          created_at: string;
          drive_file_id: string | null;
          folder_path: string | null;
          id: string;
          matter_id: string;
          metadata: Json | null;
          status: string;
          summary: string | null;
          title: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          drive_file_id?: string | null;
          folder_path?: string | null;
          id?: string;
          matter_id: string;
          metadata?: Json | null;
          status?: string;
          summary?: string | null;
          title: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          drive_file_id?: string | null;
          folder_path?: string | null;
          id?: string;
          matter_id?: string;
          metadata?: Json | null;
          status?: string;
          summary?: string | null;
          title?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "documents_matter_id_fkey";
            columns: ["matter_id"];
            referencedRelation: "matters";
            referencedColumns: ["id"];
          }
        ];
      };
      intake_responses: {
        Row: {
          created_at: string;
          form_type: string;
          id: string;
          matter_id: string;
          responses: Json | null;
          status: string;
          submitted_at: string | null;
        };
        Insert: {
          created_at?: string;
          form_type: string;
          id?: string;
          matter_id: string;
          responses?: Json | null;
          status?: string;
          submitted_at?: string | null;
        };
        Update: {
          created_at?: string;
          form_type?: string;
          id?: string;
          matter_id?: string;
          responses?: Json | null;
          status?: string;
          submitted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "intake_responses_matter_id_fkey";
            columns: ["matter_id"];
            referencedRelation: "matters";
            referencedColumns: ["id"];
          }
        ];
      };
      invoices: {
        Row: {
          created_at: string;
          due_date: string | null;
          id: string;
          line_items: Json;
          matter_id: string;
          square_invoice_id: string | null;
          status: string;
          total_cents: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          due_date?: string | null;
          id?: string;
          line_items?: Json;
          matter_id: string;
          square_invoice_id?: string | null;
          status?: string;
          total_cents?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          due_date?: string | null;
          id?: string;
          line_items?: Json;
          matter_id?: string;
          square_invoice_id?: string | null;
          status?: string;
          total_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_matter_id_fkey";
            columns: ["matter_id"];
            referencedRelation: "matters";
            referencedColumns: ["id"];
          }
        ];
      };
      matters: {
        Row: {
          billing_model: string;
          client_id: string | null;
          created_at: string;
          id: string;
          matter_type: string;
          next_action: string | null;
          owner_id: string;
          responsible_party: string;
          stage: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          billing_model: string;
          client_id?: string | null;
          created_at?: string;
          id?: string;
          matter_type: string;
          next_action?: string | null;
          owner_id: string;
          responsible_party: string;
          stage?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          billing_model?: string;
          client_id?: string | null;
          created_at?: string;
          id?: string;
          matter_type?: string;
          next_action?: string | null;
          owner_id?: string;
          responsible_party?: string;
          stage?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matters_client_id_fkey";
            columns: ["client_id"];
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "matters_owner_id_fkey";
            columns: ["owner_id"];
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          }
        ];
      };
      packages: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          id: string;
          included_hours: number | null;
          name: string;
          price_cents: number;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          included_hours?: number | null;
          name: string;
          price_cents?: number;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          included_hours?: number | null;
          name?: string;
          price_cents?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          role: Database["public"]["Enums"]["user_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
            referencedSchema: "auth";
          }
        ];
      };
      tasks: {
        Row: {
          created_at: string;
          created_by: string | null;
          due_date: string | null;
          id: string;
          matter_id: string;
          responsible_party: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          due_date?: string | null;
          id?: string;
          matter_id: string;
          responsible_party: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          due_date?: string | null;
          id?: string;
          matter_id?: string;
          responsible_party?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "tasks_matter_id_fkey";
            columns: ["matter_id"];
            referencedRelation: "matters";
            referencedColumns: ["id"];
          }
        ];
      };
      time_entries: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          duration_minutes: number | null;
          ended_at: string | null;
          id: string;
          matter_id: string;
          rate_cents: number | null;
          started_at: string;
          status: string;
          task_id: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          duration_minutes?: number | null;
          ended_at?: string | null;
          id?: string;
          matter_id: string;
          rate_cents?: number | null;
          started_at?: string;
          status?: string;
          task_id?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          duration_minutes?: number | null;
          ended_at?: string | null;
          id?: string;
          matter_id?: string;
          rate_cents?: number | null;
          started_at?: string;
          status?: string;
          task_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "time_entries_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "time_entries_matter_id_fkey";
            columns: ["matter_id"];
            referencedRelation: "matters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_entries_task_id_fkey";
            columns: ["task_id"];
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
    };
    Enums: {
      user_role: "admin" | "staff" | "client";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
