import { describe, it, expect } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { setupRequiredSandboxIdMiddleware } from "./requireSandboxId";
import { AuthJwtPayload } from "@/util/auth";
import type { LocalHono } from "@/server";

describe("requireSandboxId middleware", () => {
  describe("when sandboxId is present in auth context", () => {
    it("should allow the request to proceed when sandboxId is a string", async () => {
      const app = new OpenAPIHono<{
        Variables: { client: any; auth: AuthJwtPayload };
      }>();

      // Set up auth context first
      app.use(env.URL_PATH_PREFIX + "/api/test", async (c, next) => {
        c.set("auth", {
          sandboxId: "test-sandbox-123",
          userId: "test-user-456",
        });
        await next();
      });

      // Apply the requireSandboxId middleware
      setupRequiredSandboxIdMiddleware(app, env.URL_PATH_PREFIX + "/api/test");

      // Add the route handler
      app.get(env.URL_PATH_PREFIX + "/api/test", (c) => {
        const auth = c.get("auth");
        return c.json({
          success: true,
          sandboxId: auth?.sandboxId,
          userId: auth?.userId,
        });
      });

      const res = await app.request(env.URL_PATH_PREFIX + "/api/test");

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        success: boolean;
        sandboxId: string;
        userId: string;
      };
      expect(body.success).toBe(true);
      expect(body.sandboxId).toBe("test-sandbox-123");
      expect(body.userId).toBe("test-user-456");
    });

    it("should allow the request to proceed when sandboxId is present but userId is undefined", async () => {
      const app = new OpenAPIHono<{
        Variables: { client: any; auth: AuthJwtPayload };
      }>();

      // Set up auth context first
      app.use(env.URL_PATH_PREFIX + "/api/test", async (c, next) => {
        c.set("auth", {
          sandboxId: "test-sandbox-123",
          userId: undefined,
        });
        await next();
      });

      // Apply the requireSandboxId middleware
      setupRequiredSandboxIdMiddleware(app, env.URL_PATH_PREFIX + "/api/test");

      // Add the route handler
      app.get(env.URL_PATH_PREFIX + "/api/test", (c) => {
        const auth = c.get("auth");
        return c.json({
          success: true,
          sandboxId: auth?.sandboxId,
          userId: auth?.userId,
        });
      });

      const res = await app.request(env.URL_PATH_PREFIX + "/api/test");

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        success: boolean;
        sandboxId: string;
        userId: string | undefined;
      };
      expect(body.success).toBe(true);
      expect(body.sandboxId).toBe("test-sandbox-123");
      expect(body.userId).toBeUndefined();
    });

    it("should allow the request to proceed when only sandboxId is present", async () => {
      const app = new OpenAPIHono<{
        Variables: { client: any; auth: AuthJwtPayload };
      }>();

      // Set up auth context first
      app.use(env.URL_PATH_PREFIX + "/api/test", async (c, next) => {
        c.set("auth", {
          sandboxId: "test-sandbox-123",
        });
        await next();
      });

      // Apply the requireSandboxId middleware
      setupRequiredSandboxIdMiddleware(app, env.URL_PATH_PREFIX + "/api/test");

      // Add the route handler
      app.get(env.URL_PATH_PREFIX + "/api/test", (c) => {
        const auth = c.get("auth");
        return c.json({
          success: true,
          sandboxId: auth?.sandboxId,
          userId: auth?.userId,
        });
      });

      const res = await app.request(env.URL_PATH_PREFIX + "/api/test");

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        success: boolean;
        sandboxId: string;
        userId: string | undefined;
      };
      expect(body.success).toBe(true);
      expect(body.sandboxId).toBe("test-sandbox-123");
      expect(body.userId).toBeUndefined();
    });
  });

  describe("when sandboxId is missing from auth context", () => {
    it("should return 400 error when sandboxId is undefined", async () => {
      const app = new OpenAPIHono<{
        Variables: { client: any; auth: AuthJwtPayload };
      }>();

      // Set up auth context first
      app.use(env.URL_PATH_PREFIX + "/api/test", async (c, next) => {
        c.set("auth", {
          sandboxId: undefined,
          userId: "test-user-456",
        });
        await next();
      });

      // Apply the requireSandboxId middleware
      setupRequiredSandboxIdMiddleware(app, env.URL_PATH_PREFIX + "/api/test");

      // Add the route handler (should not be reached)
      app.get(env.URL_PATH_PREFIX + "/api/test", (c) => {
        const auth = c.get("auth");
        return c.json({
          success: true,
          sandboxId: auth?.sandboxId,
          userId: auth?.userId,
        });
      });

      const res = await app.request(env.URL_PATH_PREFIX + "/api/test");

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('"sandboxId" is not set in JWT token.');
    });

    it("should return 400 error when sandboxId is not present in auth object", async () => {
      const app = new OpenAPIHono<{
        Variables: { client: any; auth: AuthJwtPayload };
      }>();

      // Set up auth context first
      app.use(env.URL_PATH_PREFIX + "/api/test", async (c, next) => {
        c.set("auth", {
          userId: "test-user-456",
        });
        await next();
      });

      // Apply the requireSandboxId middleware
      setupRequiredSandboxIdMiddleware(app, env.URL_PATH_PREFIX + "/api/test");

      // Add the route handler (should not be reached)
      app.get(env.URL_PATH_PREFIX + "/api/test", (c) => {
        const auth = c.get("auth");
        return c.json({
          success: true,
          sandboxId: auth?.sandboxId,
          userId: auth?.userId,
        });
      });

      const res = await app.request(env.URL_PATH_PREFIX + "/api/test");

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('"sandboxId" is not set in JWT token.');
    });

    it("should return 400 error when auth object is empty", async () => {
      const app = new OpenAPIHono<{
        Variables: { client: any; auth: AuthJwtPayload };
      }>();

      // Set up auth context first
      app.use(env.URL_PATH_PREFIX + "/api/test", async (c, next) => {
        c.set("auth", {});
        await next();
      });

      // Apply the requireSandboxId middleware
      setupRequiredSandboxIdMiddleware(app, env.URL_PATH_PREFIX + "/api/test");

      // Add the route handler (should not be reached)
      app.get(env.URL_PATH_PREFIX + "/api/test", (c) => {
        const auth = c.get("auth");
        return c.json({
          success: true,
          sandboxId: auth?.sandboxId,
          userId: auth?.userId,
        });
      });

      const res = await app.request(env.URL_PATH_PREFIX + "/api/test");

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('"sandboxId" is not set in JWT token.');
    });

    it("should return 400 error when auth context is not set", async () => {
      const app = new OpenAPIHono<{
        Variables: { client: any; auth: AuthJwtPayload };
      }>();

      // Apply the requireSandboxId middleware without setting auth context
      setupRequiredSandboxIdMiddleware(app, env.URL_PATH_PREFIX + "/api/test");

      // Add the route handler (should not be reached)
      app.get(env.URL_PATH_PREFIX + "/api/test", (c) => {
        const auth = c.get("auth");
        return c.json({
          success: true,
          sandboxId: auth?.sandboxId,
          userId: auth?.userId,
        });
      });

      const res = await app.request(env.URL_PATH_PREFIX + "/api/test");

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('"sandboxId" is not set in JWT token.');
    });
  });

  describe("middleware path matching", () => {
    it("should only apply to the specified path", async () => {
      const app = new OpenAPIHono<{
        Variables: { client: any; auth: AuthJwtPayload };
      }>();

      // Apply the requireSandboxId middleware to a specific path
      setupRequiredSandboxIdMiddleware(app, env.URL_PATH_PREFIX + "/api/test");

      // Add a route that doesn't use the middleware
      app.get(env.URL_PATH_PREFIX + "/api/other", (c) => {
        return c.json({ success: true, message: "other route" });
      });

      const res = await app.request(env.URL_PATH_PREFIX + "/api/other");

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; message: string };
      expect(body.success).toBe(true);
      expect(body.message).toBe("other route");
    });

    it("should apply to sub-paths of the specified path", async () => {
      const app = new OpenAPIHono<{
        Variables: { client: any; auth: AuthJwtPayload };
      }>();

      // Set up auth context first
      app.use(env.URL_PATH_PREFIX + "/api/test/sub", async (c, next) => {
        c.set("auth", {
          sandboxId: "test-sandbox-123",
        });
        await next();
      });

      // Apply the requireSandboxId middleware to the sub-path
      setupRequiredSandboxIdMiddleware(
        app,
        env.URL_PATH_PREFIX + "/api/test/sub"
      );

      // Add the route handler
      app.get(env.URL_PATH_PREFIX + "/api/test/sub", (c) => {
        const auth = c.get("auth");
        return c.json({
          success: true,
          sandboxId: auth?.sandboxId,
          path: "sub",
        });
      });

      const res = await app.request(env.URL_PATH_PREFIX + "/api/test/sub");

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        success: boolean;
        sandboxId: string;
        path: string;
      };
      expect(body.success).toBe(true);
      expect(body.sandboxId).toBe("test-sandbox-123");
      expect(body.path).toBe("sub");
    });
  });
});
