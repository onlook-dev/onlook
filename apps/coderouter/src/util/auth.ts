import { env } from "bun";
import jwt from "jsonwebtoken";
import { z } from "@hono/zod-openapi";

export const JwtAuthResponses = {
  401: {
    content: {
      "application/json": {
        schema: z.object({ error: z.string() }),
      },
    },
    description: "The JWT token is missing or is invalid.",
  },
};

export interface AuthJwtPayload {
  sandboxId?: string;
  userId?: string;
}

export function encodeJwtToken(jwtPayload: AuthJwtPayload) {
  return jwt.sign(jwtPayload, env.JWT_SECRET_KEY!, {
    expiresIn: "1d",
  });
}

export function decodeJwtToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET_KEY!);
}

export function verifyApiKeyFromHeader(header?: string) {
  const apiKey = header?.toLowerCase().split("bearer ")[1];
  if (!apiKey) {
    return false;
  }
  return verifyApiKey(apiKey);
}

export function verifyApiKey(apiKey: string) {
  return apiKey === env.SUPAROUTA_API_KEY;
}
