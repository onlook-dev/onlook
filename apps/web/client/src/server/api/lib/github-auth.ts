import { Octokit } from 'octokit';

/**
 * Creates an Octokit instance with personal access token
 */
export const createGitHubOctokit = (accessToken: string): Octokit => {
    return new Octokit({
        auth: accessToken,
        userAgent: 'Onlook/1.0.0'
    });
};

/**
 * Gets GitHub session data from Supabase
 */
const getGitHubSessionData = async (supabase: any) => {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
        throw new Error('No active session found');
    }

    const githubIdentity = session.user?.identities?.find(
        (identity: any) => identity.provider === 'github'
    );
    
    if (!githubIdentity) {
        throw new Error('GitHub identity not found in session. Please sign in with GitHub.');
    }

    // Try multiple ways to get the access token
    const accessToken = session.provider_token || 
                       githubIdentity.access_token ||
                       githubIdentity.provider_token ||
                       session.access_token;
    
    if (!accessToken) {
        throw new Error('GitHub access token not found. Please re-authenticate with GitHub.');
    }

    return { session, githubIdentity, accessToken };
};

/**
 * Gets GitHub access token from Supabase session
 */
export const getGitHubTokenFromSession = async (supabase: any): Promise<string> => {
    const { accessToken } = await getGitHubSessionData(supabase);
    return accessToken;
};

/**
 * Gets GitHub user info from session
 */
export const getGitHubUserFromSession = async (supabase: any): Promise<{
    githubId: number;
    githubUsername: string;
    email: string;
    accessToken: string;
}> => {
    const { session, githubIdentity, accessToken } = await getGitHubSessionData(supabase);

    const githubId = githubIdentity.id || githubIdentity.identity_data?.provider_id;
    const githubUsername = githubIdentity.identity_data?.user_name || 
                          githubIdentity.identity_data?.login ||
                          githubIdentity.identity_data?.preferred_username ||
                          session.user?.user_metadata?.user_name ||
                          session.user?.user_metadata?.preferred_username ||
                          session.user?.user_metadata?.name;

    if (!githubId || !githubUsername) {
        throw new Error('GitHub user information incomplete. Please re-authenticate.');
    }

    return {
        githubId: parseInt(githubId),
        githubUsername,
        email: session.user?.email || '',
        accessToken
    };
};

/**
 * Creates a GitHub service instance for the current user using OAuth
 */
export const createUserGitHubService = async (supabase: any) => {
    const userInfo = await getGitHubUserFromSession(supabase);
    const octokit = createGitHubOctokit(userInfo.accessToken);
    
    return {
        octokit,
        userInfo
    };
};
