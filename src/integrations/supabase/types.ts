export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      agenda_events: {
        Row: {
          category: string | null;
          cote_azur_source_url: string | null;
          cote_azur_type: string | null;
          created_at: string;
          editorial_priority: string | null;
          editorial_rhythm: string | null;
          editorial_score: number;
          editorial_tags: string[];
          id: string;
          last_synced_at: string;
          location_label: string | null;
          location_slug: string | null;
          schedule_text: string | null;
          source: string;
          source_category: string | null;
          source_event_id: string;
          source_published_at: string | null;
          source_updated_at: string | null;
          source_url: string;
          title: string;
          traveler_category: string | null;
          updated_at: string;
        };
        Insert: {
          category?: string | null;
          cote_azur_source_url?: string | null;
          cote_azur_type?: string | null;
          created_at?: string;
          editorial_priority?: string | null;
          editorial_rhythm?: string | null;
          editorial_score?: number;
          editorial_tags?: string[];
          id?: string;
          last_synced_at?: string;
          location_label?: string | null;
          location_slug?: string | null;
          schedule_text?: string | null;
          source?: string;
          source_category?: string | null;
          source_event_id: string;
          source_published_at?: string | null;
          source_updated_at?: string | null;
          source_url: string;
          title: string;
          traveler_category?: string | null;
          updated_at?: string;
        };
        Update: {
          category?: string | null;
          cote_azur_source_url?: string | null;
          cote_azur_type?: string | null;
          created_at?: string;
          editorial_priority?: string | null;
          editorial_rhythm?: string | null;
          editorial_score?: number;
          editorial_tags?: string[];
          id?: string;
          last_synced_at?: string;
          location_label?: string | null;
          location_slug?: string | null;
          schedule_text?: string | null;
          source?: string;
          source_category?: string | null;
          source_event_id?: string;
          source_published_at?: string | null;
          source_updated_at?: string | null;
          source_url?: string;
          title?: string;
          traveler_category?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      agenda_occurrences: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          occurrence_date: string;
          source_checked_at: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          occurrence_date: string;
          source_checked_at?: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          occurrence_date?: string;
          source_checked_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agenda_occurrences_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "agenda_events";
            referencedColumns: ["id"];
          },
        ];
      };
      agenda_sync_runs: {
        Row: {
          completed_at: string | null;
          created_at: string;
          error_message: string | null;
          events_seen: number;
          id: string;
          occurrences_seen: number;
          range_end: string;
          range_start: string;
          source: string;
          started_at: string;
          status: string;
          unmatched_events: number;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          error_message?: string | null;
          events_seen?: number;
          id?: string;
          occurrences_seen?: number;
          range_end: string;
          range_start: string;
          source?: string;
          started_at?: string;
          status: string;
          unmatched_events?: number;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          error_message?: string | null;
          events_seen?: number;
          id?: string;
          occurrences_seen?: number;
          range_end?: string;
          range_start?: string;
          source?: string;
          started_at?: string;
          status?: string;
          unmatched_events?: number;
        };
        Relationships: [];
      };
      app_logs: {
        Row: {
          area: string | null;
          created_at: string;
          details: Json;
          event: string;
          id: string;
          level: string;
          message: string | null;
          url: string | null;
          user_agent: string | null;
        };
        Insert: {
          area?: string | null;
          created_at?: string;
          details?: Json;
          event: string;
          id?: string;
          level: string;
          message?: string | null;
          url?: string | null;
          user_agent?: string | null;
        };
        Update: {
          area?: string | null;
          created_at?: string;
          details?: Json;
          event?: string;
          id?: string;
          level?: string;
          message?: string | null;
          url?: string | null;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      booking_notifications: {
        Row: {
          booking_id: string | null;
          created_at: string;
          error_message: string | null;
          id: string;
          provider: string;
          provider_response: string | null;
          provider_status: number | null;
          recipient_email: string;
          sent_at: string | null;
          status: string;
        };
        Insert: {
          booking_id?: string | null;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          provider?: string;
          provider_response?: string | null;
          provider_status?: number | null;
          recipient_email: string;
          sent_at?: string | null;
          status?: string;
        };
        Update: {
          booking_id?: string | null;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          provider?: string;
          provider_response?: string | null;
          provider_status?: number | null;
          recipient_email?: string;
          sent_at?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_notifications_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          check_in: string;
          check_out: string;
          created_at: string;
          email: string;
          guest_name: string;
          guests: number;
          id: string;
          message: string | null;
          phone: string | null;
          status: string;
          total_price: number | null;
        };
        Insert: {
          check_in: string;
          check_out: string;
          created_at?: string;
          email: string;
          guest_name: string;
          guests?: number;
          id?: string;
          message?: string | null;
          phone?: string | null;
          status?: string;
          total_price?: number | null;
        };
        Update: {
          check_in?: string;
          check_out?: string;
          created_at?: string;
          email?: string;
          guest_name?: string;
          guests?: number;
          id?: string;
          message?: string | null;
          phone?: string | null;
          status?: string;
          total_price?: number | null;
        };
        Relationships: [];
      };
      crm_contacts: {
        Row: {
          created_at: string;
          email: string;
          first_name: string;
          id: string;
          last_source: string | null;
          last_source_url: string | null;
          last_submitted_at: string;
          lifecycle_stage: string;
          newsletter_consent: boolean;
          newsletter_consent_at: string | null;
          newsletter_consent_text: string | null;
          newsletter_consent_version: string | null;
          notes: string | null;
          phone: string | null;
          segments: string[];
          sources: string[];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          first_name: string;
          id?: string;
          last_source?: string | null;
          last_source_url?: string | null;
          last_submitted_at?: string;
          lifecycle_stage?: string;
          newsletter_consent?: boolean;
          newsletter_consent_at?: string | null;
          newsletter_consent_text?: string | null;
          newsletter_consent_version?: string | null;
          notes?: string | null;
          phone?: string | null;
          segments?: string[];
          sources?: string[];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          first_name?: string;
          id?: string;
          last_source?: string | null;
          last_source_url?: string | null;
          last_submitted_at?: string;
          lifecycle_stage?: string;
          newsletter_consent?: boolean;
          newsletter_consent_at?: string | null;
          newsletter_consent_text?: string | null;
          newsletter_consent_version?: string | null;
          notes?: string | null;
          phone?: string | null;
          segments?: string[];
          sources?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      crm_events: {
        Row: {
          contact_id: string;
          created_at: string;
          event_type: string;
          id: string;
          metadata: Json;
          source: string;
          source_url: string | null;
        };
        Insert: {
          contact_id: string;
          created_at?: string;
          event_type: string;
          id?: string;
          metadata?: Json;
          source: string;
          source_url?: string | null;
        };
        Update: {
          contact_id?: string;
          created_at?: string;
          event_type?: string;
          id?: string;
          metadata?: Json;
          source?: string;
          source_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "crm_events_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "crm_contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      ical_sources: {
        Row: {
          created_at: string;
          enabled: boolean;
          id: string;
          label: string;
          updated_at: string;
          url: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          label: string;
          updated_at?: string;
          url: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          label?: string;
          updated_at?: string;
          url?: string;
        };
        Relationships: [];
      };
      ota_links: {
        Row: {
          created_at: string;
          enabled: boolean;
          id: string;
          label: string | null;
          position: number;
          updated_at: string;
          url: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          label?: string | null;
          position?: number;
          updated_at?: string;
          url: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          label?: string | null;
          position?: number;
          updated_at?: string;
          url?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      capture_crm_lead: {
        Args: {
          p_consent_version: string;
          p_desired_dates: string;
          p_email: string;
          p_first_name: string;
          p_message: string;
          p_newsletter_consent: boolean;
          p_phone: string;
          p_source: string;
          p_source_url: string;
          p_stay_period: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
