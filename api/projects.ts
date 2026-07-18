import { z } from "zod";
import { AuthError, requireUserId } from "./_lib/auth.js";
import { database, DatabaseError } from "./_lib/db.js";
import { projectPayloadSchema } from "./_lib/projectSchema.js";

interface ProjectRow {
  id: string;
  name: string;
  snapshot: unknown;
  evidence: unknown;
  style_profile: unknown;
  updated_at: string;
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function failure(error: unknown) {
  if (error instanceof AuthError || error instanceof DatabaseError) return json({ error: error.message }, error.status);
  if (error instanceof z.ZodError || error instanceof SyntaxError) return json({ error: "Invalid project payload" }, 422);
  return json({ error: "Cloud project request failed" }, 500);
}

function projectResponse(row: ProjectRow) {
  return {
    id: row.id,
    name: row.name,
    snapshot: row.snapshot,
    evidence: row.evidence,
    styleProfile: row.style_profile,
    updatedAt: row.updated_at,
  };
}

export default {
  async fetch(request: Request) {
    try {
      const userId = await requireUserId(request);
      const sql = database();
      if (request.method === "GET") {
        const rows = await sql`
          select id, name, updated_at
          from projects
          where owner_id = ${userId}
          order by updated_at desc
          limit 100
        ` as Array<{ id: string; name: string; updated_at: string }>;
        return json(rows.map((row) => ({ id: row.id, name: row.name, updatedAt: row.updated_at })));
      }
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      const rawBody = await request.text();
      if (rawBody.length > 2_000_000) return json({ error: "Project snapshot is too large" }, 413);
      const payload = projectPayloadSchema.parse(JSON.parse(rawBody));
      const rows = await sql`
        insert into projects (owner_id, name, main_file, snapshot, evidence, style_profile, schema_version)
        values (
          ${userId},
          ${payload.project.name},
          ${payload.project.mainFile},
          ${JSON.stringify(payload.project)}::jsonb,
          ${JSON.stringify(payload.evidence)}::jsonb,
          ${JSON.stringify(payload.styleProfile)}::jsonb,
          1
        )
        returning id, name, snapshot, evidence, style_profile, updated_at
      ` as ProjectRow[];
      return json(projectResponse(rows[0]), 201);
    } catch (error) {
      return failure(error);
    }
  },
};
