import { z } from "zod";

export const BRANCH_ID_SCHEMA = z
    .string()
    .trim()
    .min(1)
    .describe('Branch ID to run the command in. Only use the branch ID, not the branch name.');