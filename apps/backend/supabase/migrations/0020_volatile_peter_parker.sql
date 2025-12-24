CREATE TYPE "public"."agent_type" AS ENUM('root', 'user');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar NOT NULL,
	"type" varchar NOT NULL,
	"format" varchar NOT NULL,
	"size" integer NOT NULL,
	"original_path" varchar NOT NULL,
	"optimized_path" varchar,
	"thumbnail_path" varchar,
	"url" varchar NOT NULL,
	"optimized_url" varchar,
	"thumbnail_url" varchar,
	"dimensions" jsonb,
	"metadata" jsonb,
	"is_reference" boolean DEFAULT false NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"source" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "asset_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"file_path" varchar NOT NULL,
	"line_number" varchar,
	"import_statement" text,
	"reference_type" varchar NOT NULL,
	"component_name" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_references" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"element_id" varchar NOT NULL,
	"element_selector" varchar NOT NULL,
	"page_url" varchar NOT NULL,
	"content" text NOT NULL,
	"status" varchar DEFAULT 'open' NOT NULL,
	"position" jsonb NOT NULL,
	"parent_id" uuid,
	"thread_id" uuid,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "comment_mentions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"mentioned_user_id" uuid NOT NULL,
	"notified" boolean DEFAULT false NOT NULL,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comment_mentions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "figma_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"figma_file_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"last_modified" timestamp with time zone NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"imported_by" uuid NOT NULL,
	"design_tokens" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "figma_files_figma_file_id_unique" UNIQUE("figma_file_id")
);
--> statement-breakpoint
ALTER TABLE "figma_files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "figma_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"figma_file_id" uuid NOT NULL,
	"figma_asset_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"type" varchar NOT NULL,
	"format" varchar NOT NULL,
	"original_url" varchar NOT NULL,
	"local_path" varchar,
	"optimized_path" varchar,
	"size" integer,
	"dimensions" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "figma_assets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "figma_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"figma_file_id" uuid NOT NULL,
	"figma_component_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"type" varchar NOT NULL,
	"properties" jsonb,
	"styles" jsonb,
	"children" jsonb,
	"generated_code" text,
	"code_framework" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "figma_components" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "github_repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"github_repo_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"full_name" varchar NOT NULL,
	"owner" varchar NOT NULL,
	"default_branch" varchar DEFAULT 'main' NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"html_url" varchar NOT NULL,
	"clone_url" varchar NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"connected_by" uuid NOT NULL,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_repositories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "github_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"pr_number" varchar,
	"pr_title" varchar,
	"pr_description" text,
	"branch_name" varchar,
	"base_branch" varchar DEFAULT 'main',
	"status" varchar DEFAULT 'pending' NOT NULL,
	"changes" jsonb,
	"commit_message" text,
	"commit_sha" varchar,
	"pr_url" varchar,
	"branch_url" varchar,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_integrations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mcp_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar NOT NULL,
	"description" varchar,
	"config" jsonb NOT NULL,
	"auto_approve" varchar[] DEFAULT '{}',
	"enabled" boolean DEFAULT true NOT NULL,
	"setup_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mcp_configs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mcp_servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_id" uuid NOT NULL,
	"name" varchar NOT NULL,
	"command" varchar NOT NULL,
	"args" varchar[] DEFAULT '{}',
	"env" jsonb,
	"server_config" jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"status" varchar DEFAULT 'stopped' NOT NULL,
	"available_tools" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mcp_servers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- Asset policies
DROP POLICY IF EXISTS "assets_select_policy" ON assets;
CREATE POLICY "assets_select_policy" ON assets
FOR SELECT TO authenticated
USING (user_has_project_access(project_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "assets_insert_policy" ON assets;
CREATE POLICY "assets_insert_policy" ON assets
FOR INSERT TO authenticated
WITH CHECK (user_has_project_access(project_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "assets_update_policy" ON assets;
CREATE POLICY "assets_update_policy" ON assets
FOR UPDATE TO authenticated
USING (user_has_project_access(project_id, ARRAY['owner', 'admin']))
WITH CHECK (user_has_project_access(project_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "assets_delete_policy" ON assets;
CREATE POLICY "assets_delete_policy" ON assets
FOR DELETE TO authenticated
USING (user_has_project_access(project_id, ARRAY['owner']));

-- Asset reference policies
DROP POLICY IF EXISTS "asset_references_select_policy" ON asset_references;
CREATE POLICY "asset_references_select_policy" ON asset_references
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assets
    WHERE assets.id = asset_references.asset_id
    AND user_has_project_access(assets.project_id, ARRAY['owner', 'admin'])
  )
);

DROP POLICY IF EXISTS "asset_references_mutation_policy" ON asset_references;
CREATE POLICY "asset_references_mutation_policy" ON asset_references
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assets
    WHERE assets.id = asset_references.asset_id
    AND user_has_project_access(assets.project_id, ARRAY['owner', 'admin'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM assets
    WHERE assets.id = asset_references.asset_id
    AND user_has_project_access(assets.project_id, ARRAY['owner', 'admin'])
  )
);

-- Comment policies
DROP POLICY IF EXISTS "comments_select_policy" ON comments;
CREATE POLICY "comments_select_policy" ON comments
FOR SELECT TO authenticated
USING (user_has_project_access(project_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "comments_insert_policy" ON comments;
CREATE POLICY "comments_insert_policy" ON comments
FOR INSERT TO authenticated
WITH CHECK (user_has_project_access(project_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "comments_update_policy" ON comments;
CREATE POLICY "comments_update_policy" ON comments
FOR UPDATE TO authenticated
USING (user_has_project_access(project_id, ARRAY['owner', 'admin']))
WITH CHECK (user_has_project_access(project_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "comments_delete_policy" ON comments;
CREATE POLICY "comments_delete_policy" ON comments
FOR DELETE TO authenticated
USING (user_has_project_access(project_id, ARRAY['owner']));

-- Comment mention policies
DROP POLICY IF EXISTS "comment_mentions_policy" ON comment_mentions;
CREATE POLICY "comment_mentions_policy" ON comment_mentions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM comments
    WHERE comments.id = comment_mentions.comment_id
    AND user_has_project_access(comments.project_id, ARRAY['owner', 'admin'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM comments
    WHERE comments.id = comment_mentions.comment_id
    AND user_has_project_access(comments.project_id, ARRAY['owner', 'admin'])
  )
);

-- Figma file policies
DROP POLICY IF EXISTS "figma_files_policy" ON figma_files;
CREATE POLICY "figma_files_policy" ON figma_files
FOR ALL TO authenticated
USING (user_has_project_access(project_id, ARRAY['owner', 'admin']))
WITH CHECK (user_has_project_access(project_id, ARRAY['owner', 'admin']));

-- Figma asset policies
DROP POLICY IF EXISTS "figma_assets_policy" ON figma_assets;
CREATE POLICY "figma_assets_policy" ON figma_assets
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM figma_files
    WHERE figma_files.id = figma_assets.figma_file_id
    AND user_has_project_access(figma_files.project_id, ARRAY['owner', 'admin'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM figma_files
    WHERE figma_files.id = figma_assets.figma_file_id
    AND user_has_project_access(figma_files.project_id, ARRAY['owner', 'admin'])
  )
);

-- Figma component policies
DROP POLICY IF EXISTS "figma_components_policy" ON figma_components;
CREATE POLICY "figma_components_policy" ON figma_components
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM figma_files
    WHERE figma_files.id = figma_components.figma_file_id
    AND user_has_project_access(figma_files.project_id, ARRAY['owner', 'admin'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM figma_files
    WHERE figma_files.id = figma_components.figma_file_id
    AND user_has_project_access(figma_files.project_id, ARRAY['owner', 'admin'])
  )
);

-- GitHub repository policies
DROP POLICY IF EXISTS "github_repositories_policy" ON github_repositories;
CREATE POLICY "github_repositories_policy" ON github_repositories
FOR ALL TO authenticated
USING (user_has_project_access(project_id, ARRAY['owner', 'admin']))
WITH CHECK (user_has_project_access(project_id, ARRAY['owner', 'admin']));

-- GitHub integration policies
DROP POLICY IF EXISTS "github_integrations_policy" ON github_integrations;
CREATE POLICY "github_integrations_policy" ON github_integrations
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM github_repositories
    WHERE github_repositories.id = github_integrations.repository_id
    AND user_has_project_access(github_repositories.project_id, ARRAY['owner', 'admin'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM github_repositories
    WHERE github_repositories.id = github_integrations.repository_id
    AND user_has_project_access(github_repositories.project_id, ARRAY['owner', 'admin'])
  )
);

-- MCP config policies
DROP POLICY IF EXISTS "mcp_configs_policy" ON mcp_configs;
CREATE POLICY "mcp_configs_policy" ON mcp_configs
FOR ALL TO authenticated
USING (user_has_project_access(project_id, ARRAY['owner', 'admin']))
WITH CHECK (user_has_project_access(project_id, ARRAY['owner', 'admin']));

-- MCP server policies
DROP POLICY IF EXISTS "mcp_servers_policy" ON mcp_servers;
CREATE POLICY "mcp_servers_policy" ON mcp_servers
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM mcp_configs
    WHERE mcp_configs.id = mcp_servers.config_id
    AND user_has_project_access(mcp_configs.project_id, ARRAY['owner', 'admin'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM mcp_configs
    WHERE mcp_configs.id = mcp_servers.config_id
    AND user_has_project_access(mcp_configs.project_id, ARRAY['owner', 'admin'])
  )
);

ALTER TABLE "deployments" DROP CONSTRAINT "deployments_requested_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "rate_limits" DROP CONSTRAINT "rate_limits_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "rate_limits" DROP CONSTRAINT "rate_limits_subscription_id_subscriptions_id_fk";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_price_id_prices_id_fk";
--> statement-breakpoint
ALTER TABLE "usage_records" DROP CONSTRAINT "usage_records_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "show_mini_chat" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "agent_type" "agent_type" DEFAULT 'root';--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "usage" jsonb;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_references" ADD CONSTRAINT "asset_references_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "figma_files" ADD CONSTRAINT "figma_files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "figma_assets" ADD CONSTRAINT "figma_assets_figma_file_id_figma_files_id_fk" FOREIGN KEY ("figma_file_id") REFERENCES "public"."figma_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "figma_components" ADD CONSTRAINT "figma_components_figma_file_id_figma_files_id_fk" FOREIGN KEY ("figma_file_id") REFERENCES "public"."figma_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD CONSTRAINT "github_repositories_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_integrations" ADD CONSTRAINT "github_integrations_repository_id_github_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."github_repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_configs" ADD CONSTRAINT "mcp_configs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD CONSTRAINT "mcp_servers_config_id_mcp_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."mcp_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "rate_limits" ADD CONSTRAINT "rate_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "rate_limits" ADD CONSTRAINT "rate_limits_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_price_id_prices_id_fk" FOREIGN KEY ("price_id") REFERENCES "public"."prices"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;