import { env } from '@/env';
import { z } from 'zod';
import { Octokit } from 'octokit';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const octokit = new Octokit({ auth: env.GITHUB_API_KEY }); 

export const githubRouter = createTRPCRouter({
    validate: protectedProcedure
        .input(
            z.object({
                owner: z.string(),
                repo: z.string()
            }),
        )
        .mutation(async ({ input }) => {
            const { data } = await octokit.rest.repos.get({ owner: input.owner, repo: input.repo });
            return {
                branch: data.default_branch,
                isPrivateRepo: data.private
            };
        }),
});
