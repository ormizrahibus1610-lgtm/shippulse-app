import type { IncomingMessage } from "node:http";
import type { SessionUser } from "../../shared/types.ts";

export interface AuthDecision {
  allowed: boolean;
  status: number;
  error?: string;
}

const VALID_ROLES = new Set<SessionUser["role"]>(["user", "admin"]);

export function parseDemoUserHeader(
  raw: string | string[] | undefined,
): SessionUser | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;

  const parts = value.trim().split(":");
  if (parts.length !== 3) return null;

  const [id, email, role] = parts.map((part) => part.trim());
  if (!id || !email) return null;
  if (!VALID_ROLES.has(role as SessionUser["role"])) return null;

  return {
    id,
    email,
    role: role as SessionUser["role"],
  };
}

export function resolveSession(req: IncomingMessage): SessionUser | null {
  const headers = req.headers;
  if (!headers) return null;

  let raw = headers["x-demo-user"];
  if (raw === undefined) {
    for (const [key, val] of Object.entries(headers)) {
      if (key.toLowerCase() === "x-demo-user") {
        raw = val;
        break;
      }
    }
  }

  return parseDemoUserHeader(raw);
}

export function checkAuthMiddleware(
  user: SessionUser | null,
  method: string,
  pathname: string,
): AuthDecision {
  const verb = method.toUpperCase();
  if (verb === "GET") {
    return { allowed: true, status: 200 };
  }

  if (verb === "POST" && pathname === "/api/changelogs") {
    if (!user) {
      return { allowed: false, status: 401, error: "unauthorized" };
    }
    if (user.role !== "admin") {
      return { allowed: false, status: 403, error: "forbidden" };
    }
    return { allowed: true, status: 200 };
  }

  if (
    verb === "POST" &&
    (pathname === "/api/features" ||
      pathname === "/api/votes" ||
      pathname.startsWith("/api/"))
  ) {
    if (!user) {
      return { allowed: false, status: 401, error: "unauthorized" };
    }
    return { allowed: true, status: 200 };
  }

  return { allowed: true, status: 200 };
}
