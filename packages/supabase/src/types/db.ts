export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
    public: {
        Tables: {
            account_registry: {
                Row: {
                    account_name: string;
                    created_at: string | null;
                    is_organization: boolean;
                    updated_at: string | null;
                };
                Insert: {
                    account_name: string;
                    created_at?: string | null;
                    is_organization: boolean;
                    updated_at?: string | null;
                };
                Update: {
                    account_name?: string;
                    created_at?: string | null;
                    is_organization?: boolean;
                    updated_at?: string | null;
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
            organizations: {
                Row: {
                    account_name: string;
                    avatar_url: string | null;
                    bio: string | null;
                    created_at: string | null;
                    created_by: string | null;
                    display_name: string | null;
                    id: string;
                    is_organization: boolean;
                    private_metadata: Json | null;
                    public_metadata: Json | null;
                    updated_at: string | null;
                    updated_by: string | null;
                };
                Insert: {
                    account_name: string;
                    avatar_url?: string | null;
                    bio?: string | null;
                    created_at?: string | null;
                    created_by?: string | null;
                    display_name?: string | null;
                    id?: string;
                    is_organization?: boolean;
                    private_metadata?: Json | null;
                    public_metadata?: Json | null;
                    updated_at?: string | null;
                    updated_by?: string | null;
                };
                Update: {
                    account_name?: string;
                    avatar_url?: string | null;
                    bio?: string | null;
                    created_at?: string | null;
                    created_by?: string | null;
                    display_name?: string | null;
                    id?: string;
                    is_organization?: boolean;
                    private_metadata?: Json | null;
                    public_metadata?: Json | null;
                    updated_at?: string | null;
                    updated_by?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'fk_account_registry';
                        columns: ['account_name', 'is_organization'];
                        isOneToOne: false;
                        referencedRelation: 'account_registry';
                        referencedColumns: ['account_name', 'is_organization'];
                    },
                    {
                        foreignKeyName: 'organizations_created_by_fkey';
                        columns: ['created_by'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'organizations_updated_by_fkey';
                        columns: ['updated_by'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                ];
            };
            users: {
                Row: {
                    account_name: string;
                    avatar_url: string | null;
                    bio: string | null;
                    created_at: string | null;
                    created_by: string | null;
                    display_name: string | null;
                    id: string;
                    is_organization: boolean;
                    private_metadata: Json | null;
                    public_metadata: Json | null;
                    updated_at: string | null;
                    updated_by: string | null;
                };
                Insert: {
                    account_name: string;
                    avatar_url?: string | null;
                    bio?: string | null;
                    created_at?: string | null;
                    created_by?: string | null;
                    display_name?: string | null;
                    id: string;
                    is_organization?: boolean;
                    private_metadata?: Json | null;
                    public_metadata?: Json | null;
                    updated_at?: string | null;
                    updated_by?: string | null;
                };
                Update: {
                    account_name?: string;
                    avatar_url?: string | null;
                    bio?: string | null;
                    created_at?: string | null;
                    created_by?: string | null;
                    display_name?: string | null;
                    id?: string;
                    is_organization?: boolean;
                    private_metadata?: Json | null;
                    public_metadata?: Json | null;
                    updated_at?: string | null;
                    updated_by?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'fk_account_registry';
                        columns: ['account_name', 'is_organization'];
                        isOneToOne: false;
                        referencedRelation: 'account_registry';
                        referencedColumns: ['account_name', 'is_organization'];
                    },
                    {
                        foreignKeyName: 'users_created_by_fkey';
                        columns: ['created_by'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'users_id_fkey';
                        columns: ['id'];
                        isOneToOne: true;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'users_updated_by_fkey';
                        columns: ['updated_by'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                ];
            };
            users_on_organization: {
                Row: {
                    created_at: string | null;
                    membership_role: 'owner' | 'write' | 'read';
                    organization_id: string;
                    updated_at: string | null;
                    user_id: string;
                };
                Insert: {
                    created_at?: string | null;
                    membership_role: 'owner' | 'write' | 'read';
                    organization_id: string;
                    updated_at?: string | null;
                    user_id: string;
                };
                Update: {
                    created_at?: string | null;
                    membership_role?: 'owner' | 'write' | 'read';
                    organization_id?: string;
                    updated_at?: string | null;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'users_on_organization_organization_id_fkey';
                        columns: ['organization_id'];
                        isOneToOne: false;
                        referencedRelation: 'organizations';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'users_on_organization_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            create_organization: {
                Args: {
                    account_name: string;
                    display_name?: string;
                    bio?: string;
                };
                Returns: {
                    account_name: string;
                    avatar_url: string | null;
                    bio: string | null;
                    created_at: string | null;
                    created_by: string | null;
                    display_name: string | null;
                    id: string;
                    is_organization: boolean;
                    private_metadata: Json | null;
                    public_metadata: Json | null;
                    updated_at: string | null;
                    updated_by: string | null;
                };
            };
            delete_organization: {
                Args: {
                    organization_id: string;
                };
                Returns: boolean;
            };
            get_accounts_state: {
                Args: Record<PropertyKey, never>;
                Returns: Json;
            };
            get_current_user_organizations: {
                Args: Record<PropertyKey, never>;
                Returns: {
                    created_at: string | null;
                    membership_role: 'owner' | 'write' | 'read';
                    organization_id: string;
                    updated_at: string | null;
                    user_id: string;
                }[];
            };
            get_me: {
                Args: Record<PropertyKey, never>;
                Returns: {
                    account_name: string;
                    avatar_url: string | null;
                    bio: string | null;
                    created_at: string | null;
                    created_by: string | null;
                    display_name: string | null;
                    id: string;
                    is_organization: boolean;
                    private_metadata: Json | null;
                    public_metadata: Json | null;
                    updated_at: string | null;
                    updated_by: string | null;
                };
            };
            get_organization_by_id: {
                Args: {
                    organization_id: string;
                };
                Returns: {
                    account_name: string;
                    avatar_url: string | null;
                    bio: string | null;
                    created_at: string | null;
                    created_by: string | null;
                    display_name: string | null;
                    id: string;
                    is_organization: boolean;
                    private_metadata: Json | null;
                    public_metadata: Json | null;
                    updated_at: string | null;
                    updated_by: string | null;
                };
            };
            get_organization_by_name: {
                Args: {
                    account_name: string;
                };
                Returns: {
                    account_name: string;
                    avatar_url: string | null;
                    bio: string | null;
                    created_at: string | null;
                    created_by: string | null;
                    display_name: string | null;
                    id: string;
                    is_organization: boolean;
                    private_metadata: Json | null;
                    public_metadata: Json | null;
                    updated_at: string | null;
                    updated_by: string | null;
                };
            };
            get_organization_id: {
                Args: {
                    account_name: string;
                };
                Returns: string;
            };
            get_organization_users: {
                Args: {
                    organization_id: string;
                    results_limit?: number;
                    results_offset?: number;
                };
                Returns: {
                    created_at: string | null;
                    membership_role: 'owner' | 'write' | 'read';
                    organization_id: string;
                    updated_at: string | null;
                    user_id: string;
                }[];
            };
            get_user_by_id: {
                Args: {
                    user_id: string;
                };
                Returns: {
                    account_name: string;
                    avatar_url: string | null;
                    bio: string | null;
                    created_at: string | null;
                    created_by: string | null;
                    display_name: string | null;
                    id: string;
                    is_organization: boolean;
                    private_metadata: Json | null;
                    public_metadata: Json | null;
                    updated_at: string | null;
                    updated_by: string | null;
                };
            };
            get_user_by_name: {
                Args: {
                    account_name: string;
                };
                Returns: {
                    account_name: string;
                    avatar_url: string | null;
                    bio: string | null;
                    created_at: string | null;
                    created_by: string | null;
                    display_name: string | null;
                    id: string;
                    is_organization: boolean;
                    private_metadata: Json | null;
                    public_metadata: Json | null;
                    updated_at: string | null;
                    updated_by: string | null;
                };
            };
            get_user_id: {
                Args: {
                    account_name: string;
                };
                Returns: string;
            };
            get_user_on_organization: {
                Args: {
                    organization_id: string;
                    user_id: string;
                };
                Returns: {
                    created_at: string | null;
                    membership_role: 'owner' | 'write' | 'read';
                    organization_id: string;
                    updated_at: string | null;
                    user_id: string;
                };
            };
            remove_organization_user: {
                Args: {
                    organization_id: string;
                    user_id: string;
                };
                Returns: boolean;
            };
            search_organizations: {
                Args: {
                    account_name?: string;
                };
                Returns: {
                    account_name: string;
                    avatar_url: string | null;
                    bio: string | null;
                    created_at: string | null;
                    created_by: string | null;
                    display_name: string | null;
                    id: string;
                    is_organization: boolean;
                    private_metadata: Json | null;
                    public_metadata: Json | null;
                    updated_at: string | null;
                    updated_by: string | null;
                }[];
            };
            search_users: {
                Args: {
                    account_name?: string;
                };
                Returns: {
                    account_name: string;
                    avatar_url: string | null;
                    bio: string | null;
                    created_at: string | null;
                    created_by: string | null;
                    display_name: string | null;
                    id: string;
                    is_organization: boolean;
                    private_metadata: Json | null;
                    public_metadata: Json | null;
                    updated_at: string | null;
                    updated_by: string | null;
                }[];
            };
            unaccent: {
                Args: {
                    '': string;
                };
                Returns: string;
            };
            unaccent_init: {
                Args: {
                    '': unknown;
                };
                Returns: unknown;
            };
            update_organization: {
                Args: {
                    organization_id: string;
                    display_name?: string;
                    bio?: string;
                    public_metadata?: Json;
                    replace_metadata?: boolean;
                };
                Returns: {
                    account_name: string;
                    avatar_url: string | null;
                    bio: string | null;
                    created_at: string | null;
                    created_by: string | null;
                    display_name: string | null;
                    id: string;
                    is_organization: boolean;
                    private_metadata: Json | null;
                    public_metadata: Json | null;
                    updated_at: string | null;
                    updated_by: string | null;
                };
            };
            update_user: {
                Args: {
                    user_id: string;
                    display_name?: string;
                    bio?: string;
                    public_metadata?: Json;
                    replace_metadata?: boolean;
                };
                Returns: {
                    account_name: string;
                    avatar_url: string | null;
                    bio: string | null;
                    created_at: string | null;
                    created_by: string | null;
                    display_name: string | null;
                    id: string;
                    is_organization: boolean;
                    private_metadata: Json | null;
                    public_metadata: Json | null;
                    updated_at: string | null;
                    updated_by: string | null;
                };
            };
            update_user_on_organization: {
                Args: {
                    organization_id: string;
                    user_id: string;
                    new_membership_role: 'owner' | 'write' | 'read';
                };
                Returns: {
                    created_at: string | null;
                    membership_role: 'owner' | 'write' | 'read';
                    organization_id: string;
                    updated_at: string | null;
                    user_id: string;
                };
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
