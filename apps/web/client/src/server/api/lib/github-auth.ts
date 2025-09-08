import { Octokit } from 'octokit';

export const createGitHubOctokit = (accessToken: string): Octokit => {
    return new Octokit({
        auth: accessToken,
        userAgent: 'Onlook/1.0.0'
    });
};

const getGitHubSessionData = async (supabase: any) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new Error('No authenticated user found');
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        const githubIdentity = user?.identities?.find(
            (identity: any) => identity.provider === 'github'
        );
        
        if (!githubIdentity) {
            throw new Error('GitHub identity not found in session. Please sign in with GitHub.');
        }

        let accessToken = null;
        
        if (session && !sessionError) {
            accessToken = session.provider_token || 
                         session.access_token ||
                         githubIdentity.access_token ||
                         githubIdentity.provider_token;
        } else {
            accessToken = githubIdentity.access_token ||
                         githubIdentity.provider_token;
        }
        
        if (!accessToken) {
            throw new Error('GitHub access token not found. Please re-authenticate with GitHub.');
        }

        if (typeof accessToken !== 'string' || accessToken.length < 20) {
            throw new Error('Invalid GitHub access token. Please re-authenticate with GitHub.');
        }

        return { 
            session: session || null, 
            githubIdentity, 
            accessToken, 
            user 
        };
    } catch (error) {
        throw new Error(`GitHub session error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const getGitHubTokenFromSession = async (supabase: any): Promise<string> => {
    const { accessToken } = await getGitHubSessionData(supabase);
    return accessToken;
};

export const getGitHubUserFromSession = async (supabase: any): Promise<{
    githubId: number;
    githubUsername: string;
    email: string;
    accessToken: string;
}> => {
    const { session, githubIdentity, accessToken, user } = await getGitHubSessionData(supabase);

    const githubId = githubIdentity.id || githubIdentity.identity_data?.provider_id;
    const githubUsername = githubIdentity.identity_data?.user_name || 
                          githubIdentity.identity_data?.login ||
                          githubIdentity.identity_data?.preferred_username ||
                          user?.user_metadata?.user_name ||
                          user?.user_metadata?.preferred_username ||
                          user?.user_metadata?.name;

    if (!githubId || !githubUsername) {
        throw new Error('GitHub user information incomplete. Please re-authenticate.');
    }

    return {
        githubId: parseInt(githubId),
        githubUsername,
        email: user?.email || session.user?.email || '',
        accessToken
    };
};

export const validateGitHubToken = async (accessToken: string): Promise<{ valid: boolean; error?: string }> => {
    try {
        const octokit = createGitHubOctokit(accessToken);
        await octokit.rest.users.getAuthenticated();
        return { valid: true };
    } catch (error: any) {
        let errorMessage = 'Token validation failed';
        
        if (error?.status === 401) {
            errorMessage = 'GitHub token is expired or invalid';
        } else if (error?.status === 403) {
            errorMessage = 'GitHub token lacks required permissions';
        } else if (error?.message) {
            errorMessage = error.message;
        }
        
        return { valid: false, error: errorMessage };
    }
};

export const createUserGitHubService = async (supabase: any) => {
    const userInfo = await getGitHubUserFromSession(supabase);
    
    const validation = await validateGitHubToken(userInfo.accessToken);
    if (!validation.valid) {
        throw new Error(`GitHub authentication failed: ${validation.error || 'Please re-authenticate with GitHub.'}`);
    }
    
    const octokit = createGitHubOctokit(userInfo.accessToken);
    
    return {
        octokit,
        userInfo
    };
};
