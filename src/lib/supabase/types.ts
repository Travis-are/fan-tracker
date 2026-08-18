export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: 'member' | 'admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: 'member' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
      celebrities: {
        Row: {
          id: string;
          canonical_name: string;
          category:
            | 'actor'
            | 'musician'
            | 'athlete'
            | 'influencer'
            | 'creator'
            | 'public_figure'
            | 'other';
          country: string | null;
          verification_status: 'verified' | 'unverified';
          primary_image_url: string | null;
          fan_demand_score: number;
          score_level: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
          total_discussions: number;
          trend: 'up' | 'down' | 'stable';
          is_demo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['celebrities']['Row']> & {
          canonical_name: string;
          category: Database['public']['Tables']['celebrities']['Row']['category'];
        };
        Update: Partial<Database['public']['Tables']['celebrities']['Row']>;
      };
      celebrity_aliases: {
        Row: {
          id: string;
          celebrity_id: string;
          alias: string;
          alias_type: 'username' | 'handle' | 'hashtag' | 'nickname' | 'misspelling';
          platform: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['celebrity_aliases']['Row']> & {
          celebrity_id: string;
          alias: string;
        };
        Update: Partial<Database['public']['Tables']['celebrity_aliases']['Row']>;
      };
      social_platforms: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          is_active: boolean;
        };
        Insert: Partial<Database['public']['Tables']['social_platforms']['Row']> & {
          name: string;
          display_name: string;
        };
        Update: Partial<Database['public']['Tables']['social_platforms']['Row']>;
      };
      data_sources: {
        Row: {
          id: string;
          platform_id: string | null;
          source_type: 'api' | 'demo';
          status: 'active' | 'inactive' | 'error';
          last_synced_at: string | null;
          config: Record<string, unknown>;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['data_sources']['Row']> & {
          source_type: 'api' | 'demo';
        };
        Update: Partial<Database['public']['Tables']['data_sources']['Row']>;
      };
      ingestion_jobs: {
        Row: {
          id: string;
          data_source_id: string | null;
          status: 'pending' | 'running' | 'completed' | 'failed';
          items_processed: number;
          items_created: number;
          error_message: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ingestion_jobs']['Row']>;
        Update: Partial<Database['public']['Tables']['ingestion_jobs']['Row']>;
      };
      public_discussions: {
        Row: {
          id: string;
          celebrity_id: string | null;
          platform_id: string | null;
          source_url: string | null;
          external_id: string | null;
          author_handle: string | null;
          content_excerpt: string;
          engagement_count: number;
          posted_at: string | null;
          is_demo: boolean;
          ingestion_job_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['public_discussions']['Row']> & {
          content_excerpt: string;
        };
        Update: Partial<Database['public']['Tables']['public_discussions']['Row']>;
      };
      discussion_categories: {
        Row: {
          id: string;
          discussion_id: string;
          category: string;
          confidence: number | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['discussion_categories']['Row']> & {
          discussion_id: string;
          category: string;
        };
        Update: Partial<Database['public']['Tables']['discussion_categories']['Row']>;
      };
      sentiment_analysis: {
        Row: {
          id: string;
          discussion_id: string;
          sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
          confidence: number | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['sentiment_analysis']['Row']> & {
          discussion_id: string;
          sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
        };
        Update: Partial<Database['public']['Tables']['sentiment_analysis']['Row']>;
      };
      ai_analysis: {
        Row: {
          id: string;
          discussion_id: string | null;
          celebrity_id: string | null;
          analysis_type:
            | 'classification'
            | 'sentiment'
            | 'entity_extraction'
            | 'summary'
            | 'score_reasoning';
          model_name: string;
          ai_output: Record<string, unknown>;
          is_inference: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ai_analysis']['Row']> & {
          analysis_type: Database['public']['Tables']['ai_analysis']['Row']['analysis_type'];
          model_name: string;
          ai_output: Record<string, unknown>;
        };
        Update: Partial<Database['public']['Tables']['ai_analysis']['Row']>;
      };
      demand_metrics: {
        Row: {
          id: string;
          celebrity_id: string;
          period_start: string;
          period_end: string;
          total_discussions: number;
          fan_card_count: number;
          membership_count: number;
          meet_greet_count: number;
          unanswered_count: number;
          complaint_count: number;
          fan_card_pct: number | null;
          membership_pct: number | null;
          meet_greet_pct: number | null;
          unanswered_pct: number | null;
          complaint_pct: number | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['demand_metrics']['Row']> & {
          celebrity_id: string;
          period_start: string;
          period_end: string;
        };
        Update: Partial<Database['public']['Tables']['demand_metrics']['Row']>;
      };
      trend_metrics: {
        Row: {
          id: string;
          celebrity_id: string;
          metric_date: string;
          fan_card_demand: number;
          membership_demand: number;
          meet_greet_demand: number;
          complaints: number;
          unanswered_requests: number;
          total_volume: number;
          fan_demand_score: number | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['trend_metrics']['Row']> & {
          celebrity_id: string;
          metric_date: string;
        };
        Update: Partial<Database['public']['Tables']['trend_metrics']['Row']>;
      };
      watchlists: {
        Row: {
          id: string;
          user_id: string;
          celebrity_id: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['watchlists']['Row']> & {
          user_id: string;
          celebrity_id: string;
        };
        Update: Partial<Database['public']['Tables']['watchlists']['Row']>;
      };
      alerts: {
        Row: {
          id: string;
          user_id: string;
          celebrity_id: string | null;
          alert_type:
            | 'fan_card_increase'
            | 'membership_increase'
            | 'meet_greet_threshold'
            | 'unanswered_increase'
            | 'score_threshold';
          threshold_value: number;
          status: 'active' | 'triggered' | 'disabled';
          last_triggered_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['alerts']['Row']> & {
          user_id: string;
          alert_type: Database['public']['Tables']['alerts']['Row']['alert_type'];
          threshold_value: number;
        };
        Update: Partial<Database['public']['Tables']['alerts']['Row']>;
      };
      system_logs: {
        Row: {
          id: string;
          level: 'info' | 'warning' | 'error';
          source: string;
          message: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['system_logs']['Row']> & {
          level: 'info' | 'warning' | 'error';
          source: string;
          message: string;
        };
        Update: Partial<Database['public']['Tables']['system_logs']['Row']>;
      };
    };
  };
};
