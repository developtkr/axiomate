import { verifyToken } from "@clerk/backend";

export class AuthError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function authorizedParties() {
  const configured = (process.env.CLERK_AUTHORIZED_PARTIES ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const deploymentOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
  return [...new Set([
    "http://localhost:5173",
    "https://axiomate-delta.vercel.app",
    deploymentOrigin,
    ...configured,
  ].filter((origin): origin is string => Boolean(origin)))];
}

export async function requireUserId(request: Request) {
  const authorization = request.headers.get("Authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  if (!token) throw new AuthError("Sign in required", 401);
  const secretKey = process.env.CLERK_SECRET_KEY;
  const jwtKey = process.env.CLERK_JWT_KEY;
  if (!secretKey && !jwtKey) throw new AuthError("Authentication is not configured", 503);
  try {
    const verified = await verifyToken(token, {
      ...(jwtKey ? { jwtKey } : { secretKey }),
      authorizedParties: authorizedParties(),
    });
    if (!verified.sub) throw new Error("Session has no user identifier");
    return verified.sub;
  } catch {
    throw new AuthError("Invalid session", 401);
  }
}
