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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      boxes: {
        Row: {
          created_at: string
          decide_by: string | null
          deleted_at: string | null
          group_id: string | null
          household_id: string
          id: string
          kid_season: string | null
          kid_size: string | null
          location: string | null
          note: string | null
          number: number
          photo_path: string | null
        }
        Insert: {
          created_at?: string
          decide_by?: string | null
          deleted_at?: string | null
          group_id?: string | null
          household_id: string
          id?: string
          kid_season?: string | null
          kid_size?: string | null
          location?: string | null
          note?: string | null
          number: number
          photo_path?: string | null
        }
        Update: {
          created_at?: string
          decide_by?: string | null
          deleted_at?: string | null
          group_id?: string | null
          household_id?: string
          id?: string
          kid_season?: string | null
          kid_size?: string | null
          location?: string | null
          note?: string | null
          number?: number
          photo_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boxes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boxes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          color: string
          created_at: string
          household_id: string
          icon: string
          id: string
          name: string
          position: number
        }
        Insert: {
          color?: string
          created_at?: string
          household_id: string
          icon?: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          color?: string
          created_at?: string
          household_id?: string
          icon?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "groups_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          name: string
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          token?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          token?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          author: string | null
          box_id: string
          created_at: string
          household_id: string
          id: string
          kind: string
          name: string
          needs_review: boolean
        }
        Insert: {
          author?: string | null
          box_id: string
          created_at?: string
          household_id: string
          id?: string
          kind?: string
          name: string
          needs_review?: boolean
        }
        Update: {
          author?: string | null
          box_id?: string
          created_at?: string
          household_id?: string
          id?: string
          kind?: string
          name?: string
          needs_review?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "items_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          body: string
          created_at: string
          household_id: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          household_id: string
          id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          household_id?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      things: {
        Row: {
          created_at: string
          fed_at: string | null
          household_id: string
          id: string
          note: string
          space: string
          title: string
          watered_at: string | null
        }
        Insert: {
          created_at?: string
          fed_at?: string | null
          household_id: string
          id?: string
          note?: string
          space: string
          title?: string
          watered_at?: string | null
        }
        Update: {
          created_at?: string
          fed_at?: string | null
          household_id?: string
          id?: string
          note?: string
          space?: string
          title?: string
          watered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "things_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      k_create_household: { Args: { _name: string }; Returns: string }
      k_delete_group: {
        Args: { _id: string; _token: string }
        Returns: undefined
      }
      k_delete_note: {
        Args: { _id: string; _token: string }
        Returns: undefined
      }
      k_delete_thing: {
        Args: { _id: string; _token: string }
        Returns: undefined
      }
      k_get: { Args: { _token: string }; Returns: Json }
      k_header_hid: { Args: never; Returns: string }
      k_hid: { Args: { _token: string }; Returns: string }
      k_mark_thing: {
        Args: { _id: string; _kind: string; _token: string }
        Returns: undefined
      }
      k_rename: { Args: { _name: string; _token: string }; Returns: undefined }
      k_save_box: {
        Args: { _box: Json; _items: Json; _token: string }
        Returns: string
      }
      k_save_group: {
        Args: {
          _color: string
          _icon: string
          _id: string
          _name: string
          _position: number
          _token: string
        }
        Returns: undefined
      }
      k_save_note: {
        Args: { _body: string; _id: string; _title: string; _token: string }
        Returns: string
      }
      k_save_thing: {
        Args: {
          _id: string
          _note: string
          _space: string
          _title: string
          _token: string
        }
        Returns: string
      }
      k_things: { Args: { _token: string }; Returns: Json }
      k_trash_box: {
        Args: { _deleted: boolean; _id: string; _token: string }
        Returns: undefined
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
