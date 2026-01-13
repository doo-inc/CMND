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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      board_columns: {
        Row: {
          created_at: string | null
          id: string
          is_completed: boolean | null
          name: string
          position: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          is_completed?: boolean | null
          name: string
          position: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          name?: string
          position?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          annual_rate: number | null
          contract_number: string | null
          created_at: string
          customer_id: string
          end_date: string | null
          id: string
          name: string
          owner_id: string | null
          partnership_id: string | null
          payment_frequency: string | null
          renewal_date: string | null
          setup_fee: number | null
          start_date: string | null
          status: string | null
          terms: string | null
          updated_at: string
          value: number
        }
        Insert: {
          annual_rate?: number | null
          contract_number?: string | null
          created_at?: string
          customer_id: string
          end_date?: string | null
          id?: string
          name: string
          owner_id?: string | null
          partnership_id?: string | null
          payment_frequency?: string | null
          renewal_date?: string | null
          setup_fee?: number | null
          start_date?: string | null
          status?: string | null
          terms?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          annual_rate?: number | null
          contract_number?: string | null
          created_at?: string
          customer_id?: string
          end_date?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          partnership_id?: string | null
          payment_frequency?: string | null
          renewal_date?: string | null
          setup_fee?: number | null
          start_date?: string | null
          status?: string | null
          terms?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          region: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          region?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_feedback: {
        Row: {
          content: string
          created_at: string
          created_by: string
          created_by_avatar: string | null
          created_by_name: string | null
          customer_id: string
          id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          created_by_avatar?: string | null
          created_by_name?: string | null
          customer_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          created_by_avatar?: string | null
          created_by_name?: string | null
          customer_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_team_members: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          staff_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          staff_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_team_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_team_members_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_timeline: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_avatar: string | null
          created_by_name: string | null
          customer_id: string
          event_description: string
          event_type: string
          id: string
          related_id: string | null
          related_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_avatar?: string | null
          created_by_name?: string | null
          customer_id: string
          event_description: string
          event_type: string
          id?: string
          related_id?: string | null
          related_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_avatar?: string | null
          created_by_name?: string | null
          customer_id?: string
          event_description?: string
          event_type?: string
          id?: string
          related_id?: string | null
          related_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_timeline_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          annual_rate: number | null
          checklist_agent_creation: boolean | null
          checklist_ai_integration: boolean | null
          checklist_platform_integration: boolean | null
          churn_date: string | null
          churn_method: string | null
          company_registration_number: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contract_size: number | null
          country: string | null
          created_at: string
          currency: string | null
          deal_owner: string | null
          description: string | null
          estimated_deal_value: number | null
          go_live_date: string | null
          id: string
          implementation_notes: string | null
          industry: string | null
          legal_address: string | null
          logo: string | null
          manual_stage: string | null
          manual_stage_note: string | null
          manual_stage_set_at: string | null
          manual_stage_set_by: string | null
          name: string
          owner_id: string | null
          payment_terms_days: number | null
          project_manager: string | null
          project_owner: string | null
          representative_name: string | null
          representative_title: string | null
          segment: string | null
          service_type: string | null
          setup_fee: number | null
          stage: string | null
          status: string | null
          subscription_end_date: string | null
          text_ai_responses: number | null
          text_plan: string | null
          updated_at: string
          voice_hours: number | null
          voice_price_per_hour: number | null
          voice_tier: string | null
        }
        Insert: {
          annual_rate?: number | null
          checklist_agent_creation?: boolean | null
          checklist_ai_integration?: boolean | null
          checklist_platform_integration?: boolean | null
          churn_date?: string | null
          churn_method?: string | null
          company_registration_number?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_size?: number | null
          country?: string | null
          created_at?: string
          currency?: string | null
          deal_owner?: string | null
          description?: string | null
          estimated_deal_value?: number | null
          go_live_date?: string | null
          id?: string
          implementation_notes?: string | null
          industry?: string | null
          legal_address?: string | null
          logo?: string | null
          manual_stage?: string | null
          manual_stage_note?: string | null
          manual_stage_set_at?: string | null
          manual_stage_set_by?: string | null
          name: string
          owner_id?: string | null
          payment_terms_days?: number | null
          project_manager?: string | null
          project_owner?: string | null
          representative_name?: string | null
          representative_title?: string | null
          segment?: string | null
          service_type?: string | null
          setup_fee?: number | null
          stage?: string | null
          status?: string | null
          subscription_end_date?: string | null
          text_ai_responses?: number | null
          text_plan?: string | null
          updated_at?: string
          voice_hours?: number | null
          voice_price_per_hour?: number | null
          voice_tier?: string | null
        }
        Update: {
          annual_rate?: number | null
          checklist_agent_creation?: boolean | null
          checklist_ai_integration?: boolean | null
          checklist_platform_integration?: boolean | null
          churn_date?: string | null
          churn_method?: string | null
          company_registration_number?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_size?: number | null
          country?: string | null
          created_at?: string
          currency?: string | null
          deal_owner?: string | null
          description?: string | null
          estimated_deal_value?: number | null
          go_live_date?: string | null
          id?: string
          implementation_notes?: string | null
          industry?: string | null
          legal_address?: string | null
          logo?: string | null
          manual_stage?: string | null
          manual_stage_note?: string | null
          manual_stage_set_at?: string | null
          manual_stage_set_by?: string | null
          name?: string
          owner_id?: string | null
          payment_terms_days?: number | null
          project_manager?: string | null
          project_owner?: string | null
          representative_name?: string | null
          representative_title?: string | null
          segment?: string | null
          service_type?: string | null
          setup_fee?: number | null
          stage?: string | null
          status?: string | null
          subscription_end_date?: string | null
          text_ai_responses?: number | null
          text_plan?: string | null
          updated_at?: string
          voice_hours?: number | null
          voice_price_per_hour?: number | null
          voice_tier?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          contract_id: string | null
          created_at: string
          customer_id: string
          document_type: string
          file_path: string
          file_size: number | null
          id: string
          name: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          customer_id: string
          document_type: string
          file_path: string
          file_size?: number | null
          id?: string
          name: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          customer_id?: string
          document_type?: string
          file_path?: string
          file_size?: number | null
          id?: string
          name?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_deals: {
        Row: {
          amount: number | null
          client_name: string | null
          cmnd_deal_id: string | null
          confidence: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          currency: string | null
          expected_close_date: string | null
          id: string
          missing_fields: string[] | null
          owner_id: string | null
          owner_name: string | null
          raw_text: string | null
          source_channel: string | null
          source_id: string
          source_type: string
          stage: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          client_name?: string | null
          cmnd_deal_id?: string | null
          confidence?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          missing_fields?: string[] | null
          owner_id?: string | null
          owner_name?: string | null
          raw_text?: string | null
          source_channel?: string | null
          source_id: string
          source_type: string
          stage?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          client_name?: string | null
          cmnd_deal_id?: string | null
          confidence?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          missing_fields?: string[] | null
          owner_id?: string | null
          owner_name?: string | null
          raw_text?: string | null
          source_channel?: string | null
          source_id?: string
          source_type?: string
          stage?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "draft_deals_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_deals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          created_at: string | null
          customer_id: string
          document_type: string
          file_path: string
          format: string
          generated_at: string | null
          generated_by: string | null
          id: string
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          document_type: string
          file_path: string
          format: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          document_type?: string
          file_path?: string
          format?: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      lifecycle_stages: {
        Row: {
          category: string | null
          created_at: string
          customer_id: string
          id: string
          name: string
          notes: string | null
          owner_id: string | null
          status: string | null
          status_changed_at: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          customer_id: string
          id?: string
          name: string
          notes?: string | null
          owner_id?: string | null
          status?: string | null
          status_changed_at?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string | null
          status?: string | null
          status_changed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lifecycle_stages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lifecycle_stages_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          related_id?: string | null
          related_type?: string | null
          title: string
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      partnership_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          partnership_id: string
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          partnership_id: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          partnership_id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_contacts_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_documents: {
        Row: {
          created_at: string
          document_type: string
          file_path: string
          file_size: number | null
          id: string
          name: string
          partnership_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          file_path: string
          file_size?: number | null
          id?: string
          name: string
          partnership_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_path?: string
          file_size?: number | null
          id?: string
          name?: string
          partnership_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partnership_documents_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_timeline: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_avatar: string | null
          created_by_name: string | null
          event_description: string
          event_type: string
          id: string
          partnership_id: string
          related_id: string | null
          related_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_avatar?: string | null
          created_by_name?: string | null
          event_description: string
          event_type: string
          id?: string
          partnership_id: string
          related_id?: string | null
          related_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_avatar?: string | null
          created_by_name?: string | null
          event_description?: string
          event_type?: string
          id?: string
          partnership_id?: string
          related_id?: string | null
          related_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_timeline_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      partnerships: {
        Row: {
          country: string | null
          created_at: string
          description: string | null
          expected_value: number | null
          expiry_date: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string | null
          partnership_type: Database["public"]["Enums"]["partnership_type"]
          region: string | null
          renewal_date: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["partnership_status"]
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          description?: string | null
          expected_value?: number | null
          expiry_date?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id?: string | null
          partnership_type: Database["public"]["Enums"]["partnership_type"]
          region?: string | null
          renewal_date?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["partnership_status"]
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          description?: string | null
          expected_value?: number | null
          expiry_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string | null
          partnership_type?: Database["public"]["Enums"]["partnership_type"]
          region?: string | null
          renewal_date?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["partnership_status"]
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          contract_id: string
          created_at: string
          customer_id: string
          due_date: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_type: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          contract_id: string
          created_at?: string
          customer_id: string
          due_date: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string
          customer_id?: string
          due_date?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      project_manager: {
        Row: {
          checklist_items: Json | null
          created_at: string | null
          customer_id: string
          customer_logo: string | null
          customer_name: string
          deadline: string | null
          demo_date: string | null
          demo_delivered: boolean | null
          id: string
          notes: string | null
          priority: string | null
          project_manager: string | null
          secondary_project_manager: string | null
          service_description: string | null
          service_type: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          checklist_items?: Json | null
          created_at?: string | null
          customer_id: string
          customer_logo?: string | null
          customer_name: string
          deadline?: string | null
          demo_date?: string | null
          demo_delivered?: boolean | null
          id?: string
          notes?: string | null
          priority?: string | null
          project_manager?: string | null
          secondary_project_manager?: string | null
          service_description?: string | null
          service_type?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          checklist_items?: Json | null
          created_at?: string | null
          customer_id?: string
          customer_logo?: string | null
          customer_name?: string
          deadline?: string | null
          demo_date?: string | null
          demo_delivered?: boolean | null
          id?: string
          notes?: string | null
          priority?: string | null
          project_manager?: string | null
          secondary_project_manager?: string | null
          service_description?: string | null
          service_type?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_manager_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      project_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          project_id: string
          user_avatar: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          project_id: string
          user_avatar?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          project_id?: string
          user_avatar?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_manager"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          company: string
          created_at: string
          customer_id: string
          email: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company: string
          created_at?: string
          customer_id: string
          email: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company?: string
          created_at?: string
          customer_id?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_activities: {
        Row: {
          activity_type: string
          assigned_to: string | null
          completed_date: string | null
          contract_id: string
          created_at: string
          description: string
          due_date: string | null
          id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          activity_type: string
          assigned_to?: string | null
          completed_date?: string | null
          contract_id: string
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          activity_type?: string
          assigned_to?: string | null
          completed_date?: string | null
          contract_id?: string
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_activities_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_activities_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          avatar: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          role: string
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_settings: {
        Row: {
          created_at: string
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_type?: Database["public"]["Enums"]["notification_type"]
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
      cleanup_expired_invitations: { Args: never; Returns: undefined }
      delete_user_account: { Args: { user_id: string }; Returns: undefined }
      generate_invitation_token: { Args: never; Returns: string }
      get_current_user_profile: {
        Args: never
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_user_notification_settings: {
        Args: { user_id_param: string }
        Returns: {
          email_enabled: boolean
          in_app_enabled: boolean
          notification_type: Database["public"]["Enums"]["notification_type"]
        }[]
      }
      get_valid_invitation: {
        Args: { token_param: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_customer_churn_status: { Args: never; Returns: undefined }
      update_payment_status: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "manager" | "user"
      notification_type:
        | "lifecycle"
        | "customer"
        | "deadline"
        | "contract"
        | "team"
      partnership_status:
        | "in_discussion"
        | "signed"
        | "active"
        | "inactive"
        | "expired"
      partnership_type:
        | "reseller"
        | "consultant"
        | "platform_partner"
        | "education_partner"
        | "mou_partner"
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
      app_role: ["admin", "manager", "user"],
      notification_type: [
        "lifecycle",
        "customer",
        "deadline",
        "contract",
        "team",
      ],
      partnership_status: [
        "in_discussion",
        "signed",
        "active",
        "inactive",
        "expired",
      ],
      partnership_type: [
        "reseller",
        "consultant",
        "platform_partner",
        "education_partner",
        "mou_partner",
      ],
    },
  },
} as const
