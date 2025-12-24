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
            domain_ownership: {
                Row: {
                    created_at: string | null;
                    domain_id: string;
                    id: string;
                    updated_at: string | null;
                    user_id: string;
                };
                Insert: {
                    created_at?: string | null;
                    domain_id: string;
                    id?: string;
                    updated_at?: string | null;
                    user_id: string;
                };
                Update: {
                    created_at?: string | null;
                    domain_id?: string;
                    id?: string;
                    updated_at?: string | null;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'domain_ownership_domain_id_fkey';
                        columns: ['domain_id'];
                        isOneToOne: false;
                        referencedRelation: 'domains';
                        referencedColumns: ['id'];
                    },
                ];
            };
            domain_verifications: {
                Row: {
                    created_at: string | null;
                    domain_id: string;
                    id: string;
                    updated_at: string | null;
                    used_at: string | null;
                    user_id: string;
                };
                Insert: {
                    created_at?: string | null;
                    domain_id: string;
                    id?: string;
                    updated_at?: string | null;
                    used_at?: string | null;
                    user_id: string;
                };
                Update: {
                    created_at?: string | null;
                    domain_id?: string;
                    id?: string;
                    updated_at?: string | null;
                    used_at?: string | null;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'domain_verifications_domain_id_fkey';
                        columns: ['domain_id'];
                        isOneToOne: false;
                        referencedRelation: 'domains';
                        referencedColumns: ['id'];
                    },
                ];
            };
            domains: {
                Row: {
                    created_at: string | null;
                    domain: string;
                    id: string;
                    updated_at: string | null;
                    verified: boolean | null;
                };
                Insert: {
                    created_at?: string | null;
                    domain: string;
                    id?: string;
                    updated_at?: string | null;
                    verified?: boolean | null;
                };
                Update: {
                    created_at?: string | null;
                    domain?: string;
                    id?: string;
                    updated_at?: string | null;
                    verified?: boolean | null;
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
                ];
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
            check_and_increment_usage: {
                Args: {
                    user_id_param: string;
                };
                Returns: Json;
            };
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
            get_user_domains: {
                Args: {
                    p_user_id: string;
                };
                Returns: {
                    id: string;
                    domain: string;
                    verified: boolean;
                    created_at: string;
                    updated_at: string;
                }[];
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
            is_domain_verified_and_owned: {
                Args: {
                    p_domain: string;
                    p_user_id: string;
                };
                Returns: boolean;
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
            usage_limit_reason: 'none' | 'daily' | 'monthly';
            usage_plan_values: 'basic' | 'pro';
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
    storage: {
        Tables: {
            buckets: {
                Row: {
                    allowed_mime_types: string[] | null;
                    avif_autodetection: boolean | null;
                    created_at: string | null;
                    file_size_limit: number | null;
                    id: string;
                    name: string;
                    owner: string | null;
                    owner_id: string | null;
                    public: boolean | null;
                    updated_at: string | null;
                };
                Insert: {
                    allowed_mime_types?: string[] | null;
                    avif_autodetection?: boolean | null;
                    created_at?: string | null;
                    file_size_limit?: number | null;
                    id: string;
                    name: string;
                    owner?: string | null;
                    owner_id?: string | null;
                    public?: boolean | null;
                    updated_at?: string | null;
                };
                Update: {
                    allowed_mime_types?: string[] | null;
                    avif_autodetection?: boolean | null;
                    created_at?: string | null;
                    file_size_limit?: number | null;
                    id?: string;
                    name?: string;
                    owner?: string | null;
                    owner_id?: string | null;
                    public?: boolean | null;
                    updated_at?: string | null;
                };
                Relationships: [];
            };
            migrations: {
                Row: {
                    executed_at: string | null;
                    hash: string;
                    id: number;
                    name: string;
                };
                Insert: {
                    executed_at?: string | null;
                    hash: string;
                    id: number;
                    name: string;
                };
                Update: {
                    executed_at?: string | null;
                    hash?: string;
                    id?: number;
                    name?: string;
                };
                Relationships: [];
            };
            objects: {
                Row: {
                    bucket_id: string | null;
                    created_at: string | null;
                    id: string;
                    last_accessed_at: string | null;
                    metadata: Json | null;
                    name: string | null;
                    owner: string | null;
                    owner_id: string | null;
                    path_tokens: string[] | null;
                    updated_at: string | null;
                    user_metadata: Json | null;
                    version: string | null;
                };
                Insert: {
                    bucket_id?: string | null;
                    created_at?: string | null;
                    id?: string;
                    last_accessed_at?: string | null;
                    metadata?: Json | null;
                    name?: string | null;
                    owner?: string | null;
                    owner_id?: string | null;
                    path_tokens?: string[] | null;
                    updated_at?: string | null;
                    user_metadata?: Json | null;
                    version?: string | null;
                };
                Update: {
                    bucket_id?: string | null;
                    created_at?: string | null;
                    id?: string;
                    last_accessed_at?: string | null;
                    metadata?: Json | null;
                    name?: string | null;
                    owner?: string | null;
                    owner_id?: string | null;
                    path_tokens?: string[] | null;
                    updated_at?: string | null;
                    user_metadata?: Json | null;
                    version?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'objects_bucketId_fkey';
                        columns: ['bucket_id'];
                        isOneToOne: false;
                        referencedRelation: 'buckets';
                        referencedColumns: ['id'];
                    },
                ];
            };
            s3_multipart_uploads: {
                Row: {
                    bucket_id: string;
                    created_at: string;
                    id: string;
                    in_progress_size: number;
                    key: string;
                    owner_id: string | null;
                    upload_signature: string;
                    user_metadata: Json | null;
                    version: string;
                };
                Insert: {
                    bucket_id: string;
                    created_at?: string;
                    id: string;
                    in_progress_size?: number;
                    key: string;
                    owner_id?: string | null;
                    upload_signature: string;
                    user_metadata?: Json | null;
                    version: string;
                };
                Update: {
                    bucket_id?: string;
                    created_at?: string;
                    id?: string;
                    in_progress_size?: number;
                    key?: string;
                    owner_id?: string | null;
                    upload_signature?: string;
                    user_metadata?: Json | null;
                    version?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 's3_multipart_uploads_bucket_id_fkey';
                        columns: ['bucket_id'];
                        isOneToOne: false;
                        referencedRelation: 'buckets';
                        referencedColumns: ['id'];
                    },
                ];
            };
            s3_multipart_uploads_parts: {
                Row: {
                    bucket_id: string;
                    created_at: string;
                    etag: string;
                    id: string;
                    key: string;
                    owner_id: string | null;
                    part_number: number;
                    size: number;
                    upload_id: string;
                    version: string;
                };
                Insert: {
                    bucket_id: string;
                    created_at?: string;
                    etag: string;
                    id?: string;
                    key: string;
                    owner_id?: string | null;
                    part_number: number;
                    size?: number;
                    upload_id: string;
                    version: string;
                };
                Update: {
                    bucket_id?: string;
                    created_at?: string;
                    etag?: string;
                    id?: string;
                    key?: string;
                    owner_id?: string | null;
                    part_number?: number;
                    size?: number;
                    upload_id?: string;
                    version?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 's3_multipart_uploads_parts_bucket_id_fkey';
                        columns: ['bucket_id'];
                        isOneToOne: false;
                        referencedRelation: 'buckets';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 's3_multipart_uploads_parts_upload_id_fkey';
                        columns: ['upload_id'];
                        isOneToOne: false;
                        referencedRelation: 's3_multipart_uploads';
                        referencedColumns: ['id'];
                    },
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            can_insert_object: {
                Args: {
                    bucketid: string;
                    name: string;
                    owner: string;
                    metadata: Json;
                };
                Returns: undefined;
            };
            extension: {
                Args: {
                    name: string;
                };
                Returns: string;
            };
            filename: {
                Args: {
                    name: string;
                };
                Returns: string;
            };
            foldername: {
                Args: {
                    name: string;
                };
                Returns: string[];
            };
            get_size_by_bucket: {
                Args: Record<PropertyKey, never>;
                Returns: {
                    size: number;
                    bucket_id: string;
                }[];
            };
            list_multipart_uploads_with_delimiter: {
                Args: {
                    bucket_id: string;
                    prefix_param: string;
                    delimiter_param: string;
                    max_keys?: number;
                    next_key_token?: string;
                    next_upload_token?: string;
                };
                Returns: {
                    key: string;
                    id: string;
                    created_at: string;
                }[];
            };
            list_objects_with_delimiter: {
                Args: {
                    bucket_id: string;
                    prefix_param: string;
                    delimiter_param: string;
                    max_keys?: number;
                    start_after?: string;
                    next_token?: string;
                };
                Returns: {
                    name: string;
                    id: string;
                    metadata: Json;
                    updated_at: string;
                }[];
            };
            operation: {
                Args: Record<PropertyKey, never>;
                Returns: string;
            };
            search: {
                Args: {
                    prefix: string;
                    bucketname: string;
                    limits?: number;
                    levels?: number;
                    offsets?: number;
                    search?: string;
                    sortcolumn?: string;
                    sortorder?: string;
                };
                Returns: {
                    name: string;
                    id: string;
                    updated_at: string;
                    created_at: string;
                    last_accessed_at: string;
                    metadata: Json;
                }[];
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
