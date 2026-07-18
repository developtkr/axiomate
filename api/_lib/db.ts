import { neon } from "@neondatabase/serverless";

export class DatabaseError extends Error {
  constructor(message: string, readonly status = 503) {
    super(message);
  }
}

export function database() {
  if (!process.env.DATABASE_URL) throw new DatabaseError("Cloud database is not configured");
  return neon(process.env.DATABASE_URL);
}
