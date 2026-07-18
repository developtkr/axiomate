import { z } from "zod";
import { AuthError, requireUserId } from "../_lib/auth.js";
import { database, DatabaseError } from "../_lib/db.js";
import { projectIdSchema, projectPayloadSchema } from "../_lib/projectSchema.js";

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
  if (error instanceof z.ZodError || error instanceof SyntaxError) return json({ error: "Invalid project request" }, 422);
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
      const projectId = projectIdSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-1));
      const sql = database();
      if (request.method === "GET") {
        const rows = await sql`
          select id, name, snapshot, evidence, style_profile, updated_at
          from projects
          where id = ${projectId} and owner_id = ${userId}
          limit 1
        ` as ProjectRow[];
        return rows[0] ? json(projectResponse(rows[0])) : json({ error: "Project not found" }, 404);
      }
      if (request.method === "DELETE") {
        const rows = await sql`
          delete from projects where id = ${projectId} and owner_id = ${userId} returning id
        ` as Array<{ id: string }>;
        return rows[0]
          ? new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } })
          : json({ error: "Project not found" }, 404);
      }
      if (request.method !== "PUT") return json({ error: "Method not allowed" }, 405);
      const rawBody = await request.text();
      if (rawBody.length > 2_000_000) return json({ error: "Project snapshot is too large" }, 413);
      const payload = projectPayloadSchema.parse(JSON.parse(rawBody));
      const rows = await sql`
        update projects
        set name = ${payload.project.name},
            main_file = ${payload.project.mainFile},
            snapshot = ${JSON.stringify(payload.project)}::jsonb,
            evidence = ${JSON.stringify(payload.evidence)}::jsonb,
            style_profile = ${JSON.stringify(payload.styleProfile)}::jsonb,
            schema_version = 1,
            updated_at = now()
        where id = ${projectId} and owner_id = ${userId}
        returning id, name, snapshot, evidence, style_profile, updated_at
      ` as ProjectRow[];
      return rows[0] ? json(projectResponse(rows[0])) : json({ error: "Project not found" }, 404);
    } catch (error) {
      return failure(error);
    }
  },
};
