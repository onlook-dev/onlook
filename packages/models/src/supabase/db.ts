export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
    public: {
        Tables: {
            custom_domains: {
                Row: {
                    created_at: string | null;
                    domain: string;
                    id: string;
                    subdomains: string[] | null;
                    updated_at: string | null;
                    user_id: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    domain: string;
                    id?: string;
                    subdomains?: string[] | null;
                    updated_at?: string | null;
                    user_id?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    domain?: string;
                    id?: string;
                    subdomains?: string[] | null;
                    updated_at?: string | null;
                    user_id?: string | null;
                };
                Relationships: [];
            };
            feature: {
                Row: {
                    ai: boolean | null;
                    created_at: string;
                    email: string;
                    id: number;
                };
                Insert: {
                    ai?: boolean | null;
                    created_at?: string;
                    email: string;
                    id?: number;
                };
                Update: {
                    ai?: boolean | null;
                    created_at?: string;
                    email?: string;
                    id?: number;
                };
                Relationships: [];
            };
            feedback: {
                Row: {
                    comment: string | null;
                    created_at: string;
                    id: number;
                    mood: string | null;
                };
                Insert: {
                    comment?: string | null;
                    created_at?: string;
                    id?: number;
                    mood?: string | null;
                };
                Update: {
                    comment?: string | null;
                    created_at?: string;
                    id?: number;
                    mood?: string | null;
                };
                Relationships: [];
            };
            subscription: {
                Row: {
                    created_at: string;
                    email: string | null;
                    id: number;
                };
                Insert: {
                    created_at?: string;
                    email?: string | null;
                    id?: number;
                };
                Update: {
                    created_at?: string;
                    email?: string | null;
                    id?: number;
                };
                Relationships: [];
            };
            usage_plans: {
                Row: {
                    created_at: string | null;
                    daily_requests_limit: number;
                    id: number;
                    is_free: boolean;
                    monthly_requests_limit: number;
                    name: Database['public']['Enums']['usage_plan_values'];
                    stripe_price_id: string | null;
                    stripe_product_id: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    daily_requests_limit: number;
                    id?: never;
                    is_free?: boolean;
                    monthly_requests_limit: number;
                    name: Database['public']['Enums']['usage_plan_values'];
                    stripe_price_id?: string | null;
                    stripe_product_id?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    daily_requests_limit?: number;
                    id?: never;
                    is_free?: boolean;
                    monthly_requests_limit?: number;
                    name?: Database['public']['Enums']['usage_plan_values'];
                    stripe_price_id?: string | null;
                    stripe_product_id?: string | null;
                    updated_at?: string | null;
                };
                Relationships: [];
            };
            user_usage: {
                Row: {
                    cancelled: boolean | null;
                    created_at: string | null;
                    daily_requests_count: number | null;
                    id: number;
                    last_request_date: string | null;
                    monthly_requests_count: number | null;
                    plan_id: number;
                    stripe_customer_id: string | null;
                    stripe_subscription_id: string | null;
                    updated_at: string | null;
                    user_id: string;
                };
                Insert: {
                    cancelled?: boolean | null;
                    created_at?: string | null;
                    daily_requests_count?: number | null;
                    id?: never;
                    last_request_date?: string | null;
                    monthly_requests_count?: number | null;
                    plan_id: number;
                    stripe_customer_id?: string | null;
                    stripe_subscription_id?: string | null;
                    updated_at?: string | null;
                    user_id: string;
                };
                Update: {
                    cancelled?: boolean | null;
                    created_at?: string | null;
                    daily_requests_count?: number | null;
                    id?: never;
                    last_request_date?: string | null;
                    monthly_requests_count?: number | null;
                    plan_id?: number;
                    stripe_customer_id?: string | null;
                    stripe_subscription_id?: string | null;
                    updated_at?: string | null;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'user_usage_plan_id_fkey';
                        columns: ['plan_id'];
                        isOneToOne: false;
                        referencedRelation: 'usage_plans';
                        referencedColumns: ['id'];
                    },
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            check_and_increment_usage: {
                Args: {
                    user_id_param: string;
                };
                Returns: Json;
            };
        };
        Enums: {
            usage_limit_reason: 'none' | 'daily' | 'monthly';
            usage_plan_values: 'basic' | 'pro';
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
    PublicTableNameOrOptions extends
        | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
        | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
        ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
              Database[PublicTableNameOrOptions['schema']]['Views'])
        : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
          Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
          Row: infer R;
      }
        ? R
        : never
    : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
      ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
            Row: infer R;
        }
          ? R
          : never
      : never;

export type TablesInsert<
    PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
        ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
        : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Insert: infer I;
      }
        ? I
        : never
    : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
      ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
            Insert: infer I;
        }
          ? I
          : never
      : never;

export type TablesUpdate<
    PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
        ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
        : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Update: infer U;
      }
        ? U
        : never
    : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
      ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
            Update: infer U;
        }
          ? U
          : never
      : never;

export type Enums<
    PublicEnumNameOrOptions extends keyof PublicSchema['Enums'] | { schema: keyof Database },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
        ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
        : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
    ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
    : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
      ? PublicSchema['Enums'][PublicEnumNameOrOptions]
      : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
        | keyof PublicSchema['CompositeTypes']
        | { schema: keyof Database },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof Database;
    }
        ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
        : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
    ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes']
      ? PublicSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
      : never;
