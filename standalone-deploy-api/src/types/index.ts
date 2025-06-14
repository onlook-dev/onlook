export interface FreestyleDeployWebConfiguration {
  domains: string[];
  envVars?: Record<string, string>;
}

export interface FreestyleDeployWebSuccessResponse {
  id?: string;
  url?: string;
  domains?: string[] | null;
  [key: string]: any;
}

export interface DeploymentSource {
  files: Record<string, {
    content: string;
    encoding?: string;
  }>;
  kind: 'files';
}

export interface HandleCreateDomainVerificationResponse {
  type: string;
  message?: string;
}

export interface GetOwnedDomainsResponse {
  success: boolean;
  domains: string[];
}

export interface PublishRequest {
  files: Record<string, {
    content: string;
    encoding?: string;
  }>;
  config: FreestyleDeployWebConfiguration;
}

export interface PublishResponse {
  success: boolean;
  data?: FreestyleDeployWebSuccessResponse;
  error?: {
    message: string;
  };
}

export interface DatabaseTables {
  domains: {
    id: string;
    domain: string;
    verified: boolean;
    created_at: string;
  };
  domain_verifications: {
    id: string;
    domain_id: string;
    user_id: string;
    created_at: string;
    usedAt?: string;
  };
  domain_ownership: {
    id: string;
    domain_id: string;
    user_id: string;
    created_at: string;
  };
  usage_plans: {
    id: string;
    name: string;
    created_at: string;
  };
  user_usage: {
    id: string;
    plan_id: string;
    cancelled: boolean;
    created_at: string;
  };
}

export interface User {
  id: string;
  email?: string;
  [key: string]: any;
}
