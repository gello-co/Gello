export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Array<Json>;

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      boards: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          name: string;
          team_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          team_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'boards_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'boards_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      lists: {
        Row: {
          board_id: string;
          created_at: string;
          id: string;
          name: string;
          position: number;
        };
        Insert: {
          board_id: string;
          created_at?: string;
          id?: string;
          name: string;
          position: number;
        };
        Update: {
          board_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'lists_board_id_fkey';
            columns: ['board_id'];
            isOneToOne: false;
            referencedRelation: 'boards';
            referencedColumns: ['id'];
          },
        ];
      };
      points_history: {
        Row: {
          awarded_by: string | null;
          created_at: string;
          id: string;
          notes: string | null;
          points_earned: number;
          reason: Database['public']['Enums']['points_reason'];
          task_id: string | null;
          user_id: string;
        };
        Insert: {
          awarded_by?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          points_earned: number;
          reason: Database['public']['Enums']['points_reason'];
          task_id?: string | null;
          user_id: string;
        };
        Update: {
          awarded_by?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          points_earned?: number;
          reason?: Database['public']['Enums']['points_reason'];
          task_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'points_history_awarded_by_fkey';
            columns: ['awarded_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'points_history_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'points_history_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      redemptions: {
        Row: {
          id: string;
          points_spent: number;
          redeemed_at: string;
          shop_item_id: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          points_spent: number;
          redeemed_at?: string;
          shop_item_id: string;
          user_id: string;
        };
        Update: {
          id?: string;
          points_spent?: number;
          redeemed_at?: string;
          shop_item_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'redemptions_shop_item_id_fkey';
            columns: ['shop_item_id'];
            isOneToOne: false;
            referencedRelation: 'shop_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'redemptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      shop_items: {
        Row: {
          category: string;
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean;
          name: string;
          point_cost: number;
        };
        Insert: {
          category?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name: string;
          point_cost: number;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name?: string;
          point_cost?: number;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          assigned_to: string | null;
          completed_at: string | null;
          created_at: string;
          description: string | null;
          due_date: string | null;
          id: string;
          list_id: string;
          position: number;
          story_points: number;
          title: string;
        };
        Insert: {
          assigned_to?: string | null;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          list_id: string;
          position: number;
          story_points?: number;
          title: string;
        };
        Update: {
          assigned_to?: string | null;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          list_id?: string;
          position?: number;
          story_points?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_list_id_fkey';
            columns: ['list_id'];
            isOneToOne: false;
            referencedRelation: 'lists';
            referencedColumns: ['id'];
          },
        ];
      };
      teams: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      user_context: {
        Row: {
          role: Database['public']['Enums']['user_role'];
          team_id: string | null;
          user_id: string;
        };
        Insert: {
          role: Database['public']['Enums']['user_role'];
          team_id?: string | null;
          user_id: string;
        };
        Update: {
          role?: Database['public']['Enums']['user_role'];
          team_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_context_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          email: string;
          id: string;
          password_hash: string;
          role: Database['public']['Enums']['user_role'];
          team_id: string | null;
          total_points: number;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name: string;
          email: string;
          id?: string;
          password_hash?: string;
          role?: Database['public']['Enums']['user_role'];
          team_id?: string | null;
          total_points?: number;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          email?: string;
          id?: string;
          password_hash?: string;
          role?: Database['public']['Enums']['user_role'];
          team_id?: string | null;
          total_points?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'users_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      auth_is_admin: { Args: never; Returns: boolean };
      auth_is_manager_or_admin: { Args: never; Returns: boolean };
      auth_user_role: {
        Args: never;
        Returns: Database['public']['Enums']['user_role'];
      };
      auth_user_team_id: { Args: never; Returns: string };
      auth_user_team_matches: { Args: { team: string }; Returns: boolean };
      auth_user_team_matches_board: {
        Args: { board: string };
        Returns: boolean;
      };
      auth_user_team_matches_list: { Args: { list: string }; Returns: boolean };
      board_in_current_team: {
        Args: { target_board: string };
        Returns: boolean;
      };
      complete_task_atomic: { Args: { p_task_id: string }; Returns: Json };
      create_points_history_atomic: {
        Args: {
          p_awarded_by?: string;
          p_notes?: string;
          p_points_earned: number;
          p_reason: Database['public']['Enums']['points_reason'];
          p_task_id?: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      current_user_role: {
        Args: never;
        Returns: Database['public']['Enums']['user_role'];
      };
      current_user_team_id: { Args: never; Returns: string };
      is_admin: { Args: never; Returns: boolean };
      is_manager_of_current_team: { Args: never; Returns: boolean };
      is_member: { Args: never; Returns: boolean };
      list_in_current_team: { Args: { target_list: string }; Returns: boolean };
      reorder_lists:
        | {
            Args: {
              p_board_id: string;
              p_list_positions: Json;
              p_user_id: string;
            };
            Returns: number;
          }
        | {
            Args: { p_board_id: string; p_list_positions: Json };
            Returns: number;
          };
      truncate_all_tables: { Args: never; Returns: undefined };
      user_in_current_team: { Args: { target_user: string }; Returns: boolean };
    };
    Enums: {
      points_reason: 'task_complete' | 'manual_award' | 'redemption';
      user_role: 'admin' | 'manager' | 'member';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      points_reason: ['task_complete', 'manual_award', 'redemption'],
      user_role: ['admin', 'manager', 'member'],
    },
  },
} as const;
