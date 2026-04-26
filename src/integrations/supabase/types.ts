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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          module: string
          record_id: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          module: string
          record_id?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          module?: string
          record_id?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      buyer_payments: {
        Row: {
          amount: number
          buyer_name: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          sale_id: string | null
        }
        Insert: {
          amount: number
          buyer_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          sale_id?: string | null
        }
        Update: {
          amount?: number
          buyer_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      buyers: {
        Row: {
          address: string | null
          country: string
          created_at: string
          created_by: string | null
          id: string
          imo: string | null
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          wechat: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          id?: string
          imo?: string | null
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          wechat?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          id?: string
          imo?: string | null
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          wechat?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      cash_entries: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          entry_date: string
          entry_type: string
          factory_id: string | null
          id: string
          payment_method: string
          person_name: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_type: string
          factory_id?: string | null
          id?: string
          payment_method?: string
          person_name?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_type?: string
          factory_id?: string | null
          id?: string
          payment_method?: string
          person_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_entries_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      challans: {
        Row: {
          advance_amount: number | null
          buyer_country: string
          buyer_name: string
          challan_date: string
          challan_no: string
          created_at: string
          created_by: string | null
          due_amount: number | null
          grade_details: Json
          id: string
          product_type: string
          total_amount: number
        }
        Insert: {
          advance_amount?: number | null
          buyer_country?: string
          buyer_name: string
          challan_date?: string
          challan_no: string
          created_at?: string
          created_by?: string | null
          due_amount?: number | null
          grade_details?: Json
          id?: string
          product_type?: string
          total_amount?: number
        }
        Update: {
          advance_amount?: number | null
          buyer_country?: string
          buyer_name?: string
          challan_date?: string
          challan_no?: string
          created_at?: string
          created_by?: string | null
          due_amount?: number | null
          grade_details?: Json
          id?: string
          product_type?: string
          total_amount?: number
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          company_address: string | null
          company_email: string | null
          company_name: string
          company_phone: string | null
          id: string
          tagline: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string
          company_phone?: string | null
          id?: string
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string
          company_phone?: string | null
          id?: string
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      counters: {
        Row: {
          id: string
          last_number: number
          prefix: string
        }
        Insert: {
          id: string
          last_number?: number
          prefix?: string
        }
        Update: {
          id?: string
          last_number?: number
          prefix?: string
        }
        Relationships: []
      }
      factories: {
        Row: {
          created_at: string
          created_by: string | null
          factory_type: string
          id: string
          is_active: boolean
          location: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          factory_type?: string
          id?: string
          is_active?: boolean
          location: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          factory_type?: string
          id?: string
          is_active?: boolean
          location?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      guti_stock: {
        Row: {
          created_at: string
          created_by: string | null
          entry_date: string
          factory_id: string | null
          grade_details: Json
          id: string
          notes: string | null
          rate_per_kg: number
          supplier_name: string
          total_amount: number
          weight_kg: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entry_date?: string
          factory_id?: string | null
          grade_details?: Json
          id?: string
          notes?: string | null
          rate_per_kg?: number
          supplier_name: string
          total_amount?: number
          weight_kg?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entry_date?: string
          factory_id?: string | null
          grade_details?: Json
          id?: string
          notes?: string | null
          rate_per_kg?: number
          supplier_name?: string
          total_amount?: number
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "guti_stock_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          factory_id: string | null
          grade: string
          id: string
          product_type: string
          rate_per_kg: number
          stock_kg: number
          updated_at: string
        }
        Insert: {
          factory_id?: string | null
          grade: string
          id?: string
          product_type?: string
          rate_per_kg?: number
          stock_kg?: number
          updated_at?: string
        }
        Update: {
          factory_id?: string | null
          grade?: string
          id?: string
          product_type?: string
          rate_per_kg?: number
          stock_kg?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link_module: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_module?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_module?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      party_consignments: {
        Row: {
          created_at: string
          created_by: string | null
          factory_processed_at: string | null
          factory_sent_from: string | null
          id: string
          notes: string | null
          party_name: string
          sent_date: string
          sent_kg: number
          status: string
          total_returned_kg: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          factory_processed_at?: string | null
          factory_sent_from?: string | null
          id?: string
          notes?: string | null
          party_name: string
          sent_date?: string
          sent_kg?: number
          status?: string
          total_returned_kg?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          factory_processed_at?: string | null
          factory_sent_from?: string | null
          id?: string
          notes?: string | null
          party_name?: string
          sent_date?: string
          sent_kg?: number
          status?: string
          total_returned_kg?: number
        }
        Relationships: []
      }
      party_returns: {
        Row: {
          consignment_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          return_date: string
          return_kg: number
        }
        Insert: {
          consignment_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          return_date?: string
          return_kg?: number
        }
        Update: {
          consignment_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          return_date?: string
          return_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "party_returns_consignment_id_fkey"
            columns: ["consignment_id"]
            isOneToOne: false
            referencedRelation: "party_consignments"
            referencedColumns: ["id"]
          },
        ]
      }
      party_settlements: {
        Row: {
          buyer_rate: number
          chhat_kg: number | null
          comments: string | null
          commission: number
          consignment_id: string | null
          created_at: string
          created_by: string | null
          due: number | null
          grade_details: Json
          id: string
          margin: number
          paid: number | null
          party_name: string
          party_rate: number
          payable: number | null
          processing_cost: number | null
          remand_kg: number | null
          status: string
          total_sales: number
        }
        Insert: {
          buyer_rate: number
          chhat_kg?: number | null
          comments?: string | null
          commission?: number
          consignment_id?: string | null
          created_at?: string
          created_by?: string | null
          due?: number | null
          grade_details?: Json
          id?: string
          margin?: number
          paid?: number | null
          party_name: string
          party_rate: number
          payable?: number | null
          processing_cost?: number | null
          remand_kg?: number | null
          status?: string
          total_sales?: number
        }
        Update: {
          buyer_rate?: number
          chhat_kg?: number | null
          comments?: string | null
          commission?: number
          consignment_id?: string | null
          created_at?: string
          created_by?: string | null
          due?: number | null
          grade_details?: Json
          id?: string
          margin?: number
          paid?: number | null
          party_name?: string
          party_rate?: number
          payable?: number | null
          processing_cost?: number | null
          remand_kg?: number | null
          status?: string
          total_sales?: number
        }
        Relationships: [
          {
            foreignKeyName: "party_settlements_consignment_id_fkey"
            columns: ["consignment_id"]
            isOneToOne: false
            referencedRelation: "party_consignments"
            referencedColumns: ["id"]
          },
        ]
      }
      production_batches: {
        Row: {
          batch_code: string
          created_at: string
          created_by: string | null
          efficiency_pct: number | null
          factory_id: string | null
          id: string
          input_weight_kg: number
          loss_kg: number | null
          output_weight_kg: number | null
          stage: string
          status: string
          updated_at: string
        }
        Insert: {
          batch_code: string
          created_at?: string
          created_by?: string | null
          efficiency_pct?: number | null
          factory_id?: string | null
          id?: string
          input_weight_kg: number
          loss_kg?: number | null
          output_weight_kg?: number | null
          stage?: string
          status?: string
          updated_at?: string
        }
        Update: {
          batch_code?: string
          created_at?: string
          created_by?: string | null
          efficiency_pct?: number | null
          factory_id?: string | null
          id?: string
          input_weight_kg?: number
          loss_kg?: number | null
          output_weight_kg?: number | null
          stage?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_batches_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          bata_rate: number | null
          bdt_paid: number | null
          country: string
          created_at: string
          created_by: string | null
          currency: string
          exchange_rate: number | null
          factory_id: string | null
          grade_details: Json
          guti_grade: string | null
          id: string
          middleman_name: string | null
          payment_status: string
          price_per_kg: number
          product_type: string
          purchase_date: string
          supplier_name: string
          total_price: number
          weight_kg: number
        }
        Insert: {
          bata_rate?: number | null
          bdt_paid?: number | null
          country?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          exchange_rate?: number | null
          factory_id?: string | null
          grade_details?: Json
          guti_grade?: string | null
          id?: string
          middleman_name?: string | null
          payment_status?: string
          price_per_kg: number
          product_type?: string
          purchase_date?: string
          supplier_name: string
          total_price: number
          weight_kg: number
        }
        Update: {
          bata_rate?: number | null
          bdt_paid?: number | null
          country?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          exchange_rate?: number | null
          factory_id?: string | null
          grade_details?: Json
          guti_grade?: string | null
          id?: string
          middleman_name?: string | null
          payment_status?: string
          price_per_kg?: number
          product_type?: string
          purchase_date?: string
          supplier_name?: string
          total_price?: number
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchases_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_delete: boolean
          can_download: boolean
          can_edit: boolean
          can_print: boolean
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          can_delete?: boolean
          can_download?: boolean
          can_edit?: boolean
          can_print?: boolean
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          can_delete?: boolean
          can_download?: boolean
          can_edit?: boolean
          can_print?: boolean
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      sales: {
        Row: {
          advance_amount: number | null
          buyer_name: string
          buyer_type: string
          created_at: string
          created_by: string | null
          due_amount: number | null
          grade: string
          grade_details: Json
          id: string
          product_type: string
          rate_per_kg: number
          sale_date: string
          total_amount: number
          weight_kg: number
        }
        Insert: {
          advance_amount?: number | null
          buyer_name: string
          buyer_type?: string
          created_at?: string
          created_by?: string | null
          due_amount?: number | null
          grade: string
          grade_details?: Json
          id?: string
          product_type?: string
          rate_per_kg: number
          sale_date?: string
          total_amount: number
          weight_kg: number
        }
        Update: {
          advance_amount?: number | null
          buyer_name?: string
          buyer_type?: string
          created_at?: string
          created_by?: string | null
          due_amount?: number | null
          grade?: string
          grade_details?: Json
          id?: string
          product_type?: string
          rate_per_kg?: number
          sale_date?: string
          total_amount?: number
          weight_kg?: number
        }
        Relationships: []
      }
      supplier_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          supplier_id: string
          supplier_name: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          supplier_id: string
          supplier_name: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          supplier_id?: string
          supplier_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          country: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          address?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          address?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      transfers: {
        Row: {
          courier_name: string | null
          created_at: string
          created_by: string | null
          from_factory_id: string | null
          id: string
          received_weight_kg: number | null
          recipient_address: string | null
          recipient_name: string | null
          recipient_phone: string | null
          status: string
          to_factory_id: string | null
          transfer_date: string
          weight_diff_kg: number | null
          weight_kg: number
        }
        Insert: {
          courier_name?: string | null
          created_at?: string
          created_by?: string | null
          from_factory_id?: string | null
          id?: string
          received_weight_kg?: number | null
          recipient_address?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: string
          to_factory_id?: string | null
          transfer_date?: string
          weight_diff_kg?: number | null
          weight_kg: number
        }
        Update: {
          courier_name?: string | null
          created_at?: string
          created_by?: string | null
          from_factory_id?: string | null
          id?: string
          received_weight_kg?: number | null
          recipient_address?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: string
          to_factory_id?: string | null
          transfer_date?: string
          weight_diff_kg?: number | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_factory_id_fkey"
            columns: ["from_factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_factory_id_fkey"
            columns: ["to_factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      twobytwo_entries: {
        Row: {
          carton_no: string | null
          chhat_kg: number
          created_at: string
          created_by: string | null
          entry_date: string
          factory_name: string | null
          grade_details: Json
          guti_cost_per_kg: number | null
          guti_type: string | null
          id: string
          owner_name: string
          product_type: string
          remand_kg: number
          total_input_kg: number
          total_output_kg: number
        }
        Insert: {
          carton_no?: string | null
          chhat_kg?: number
          created_at?: string
          created_by?: string | null
          entry_date?: string
          factory_name?: string | null
          grade_details?: Json
          guti_cost_per_kg?: number | null
          guti_type?: string | null
          id?: string
          owner_name: string
          product_type?: string
          remand_kg?: number
          total_input_kg?: number
          total_output_kg?: number
        }
        Update: {
          carton_no?: string | null
          chhat_kg?: number
          created_at?: string
          created_by?: string | null
          entry_date?: string
          factory_name?: string | null
          grade_details?: Json
          guti_cost_per_kg?: number | null
          guti_type?: string | null
          id?: string
          owner_name?: string
          product_type?: string
          remand_kg?: number
          total_input_kg?: number
          total_output_kg?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_next_number: { Args: { counter_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      notify_admins: {
        Args: {
          p_link_module?: string
          p_message: string
          p_title: string
          p_type?: string
        }
        Returns: undefined
      }
      notify_user: {
        Args: {
          p_link_module?: string
          p_message: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "factory_manager" | "accountant"
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
      app_role: ["admin", "factory_manager", "accountant"],
    },
  },
} as const
