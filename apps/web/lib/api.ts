import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AccessError } from "@booking-lt/core";
import {
  connect,
  newComplex,
  listComplexes,
  listRoles,
  addRole,
  revokeRole,
  getWorkspace,
  protectedOperation,
  type Database,
} from "@booking-lt/db";
import {
  createComplex,
  grantRole,
  requestCode,
  verifyCode,
  uuid,
} from "@booking-lt/schemas";
import { authContext } from "./auth";
let connection: ReturnType<typeof connect> | undefined;
function database() {
  if (!process.env.DATABASE_URL) throw new Error("SERVICE_UNCONFIGURED");
  return (connection ??= connect(process.env.DATABASE_URL)).db;
}
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function body(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "A JSON body is required.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    bytes += part.value.length;
    if (bytes > 4096) {
      await reader.cancel();
      throw new HttpError(413, "Request is too large.");
    }
    chunks.push(part.value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Enter valid JSON.");
  }
}
function checkOrigin(request: NextRequest, authRoute: boolean) {
  if (["GET", "HEAD"].includes(request.method)) return;
  // Native clients use a verified bearer token, with no cookie fallback.
  if (
    !authRoute &&
    /^Bearer [^\s]+$/.test(request.headers.get("authorization") ?? "")
  )
    return;
  const origin = process.env.APP_ORIGIN;
  if (!origin) throw new Error("SERVICE_UNCONFIGURED");
  if (request.headers.get("origin") !== new URL(origin).origin)
    throw new HttpError(403, "This request origin is not allowed.");
}
export function makeHandler(
  deps: { db: () => Database; auth: typeof authContext } = {
    db: database,
    auth: authContext,
  },
) {
  return async (request: NextRequest) => {
    let auth: ReturnType<typeof authContext> | undefined;
    const respond = (data: unknown, status = 200) => {
      const response = NextResponse.json(data, {
        status,
        headers: {
          "Cache-Control": "private, no-store",
          Vary: "Cookie, Authorization",
        },
      });
      return auth ? auth.apply(response) : response;
    };
    try {
      const path = new URL(request.url).pathname
        .replace(/^\/api\/v1\//, "")
        .split("/");
      const method = request.method;
      checkOrigin(request, path[0] === "auth");
      auth = deps.auth(request);
      if (method === "POST" && path.join("/") === "auth/request-code") {
        const input = requestCode.parse(await body(request));
        // Supabase enforces issuance cooldown, per-IP limits and OTP expiry; see development.md.
        await auth.client.auth.signInWithOtp({
          email: input.email,
          options: { shouldCreateUser: true },
        });
        return respond(
          {
            message:
              "If email delivery is available, a sign-in code is on its way. Check your inbox.",
          },
          202,
        );
      }
      if (method === "POST" && path.join("/") === "auth/verify-code") {
        const input = verifyCode.parse(await body(request));
        const { error } = await auth.client.auth.verifyOtp({
          email: input.email,
          token: input.code,
          type: "email",
        });
        if (error)
          throw new HttpError(
            400,
            "That code is invalid or expired. Request a new code and try again.",
          );
        return respond({ ok: true });
      }
      if (method === "POST" && path.join("/") === "auth/sign-out") {
        await auth.client.auth.signOut({ scope: "local" });
        auth.clear();
        return respond({ ok: true });
      }
      const userId = uuid.parse(await auth.userId());
      const db = deps.db();
      if (method === "GET" && path.join("/") === "me") {
        await protectedOperation(
          db,
          userId,
          "account.read",
          undefined,
          async () => undefined,
        );
        return respond({ userId });
      }
      if (path.join("/") === "admin/complexes") {
        if (method === "GET") return respond(await listComplexes(db, userId));
        if (method === "POST")
          return respond(
            await newComplex(
              db,
              userId,
              createComplex.parse(await body(request)),
            ),
            201,
          );
      }
      if (
        path.length === 5 &&
        path[0] === "admin" &&
        path[1] === "complexes" &&
        path[3] === "roles" &&
        method === "DELETE"
      )
        return respond(
          await revokeRole(
            db,
            userId,
            uuid.parse(path[2]),
            uuid.parse(path[4]),
          ),
        );
      if (
        path.length === 4 &&
        path[0] === "admin" &&
        path[1] === "complexes" &&
        path[3] === "roles"
      ) {
        const id = uuid.parse(path[2]);
        if (method === "GET") return respond(await listRoles(db, userId, id));
        if (method === "POST")
          return respond(
            await addRole(db, userId, id, grantRole.parse(await body(request))),
            201,
          );
      }
      if (path.length === 2 && path[0] === "complexes" && method === "GET")
        return respond(await getWorkspace(db, userId, uuid.parse(path[1])));
      // Always check enabled account before returning a protected not-found response.
      await protectedOperation(
        db,
        userId,
        "platform.manage",
        undefined,
        async () => undefined,
      );
      return respond({ error: "Not found." }, 404);
    } catch (error) {
      if (error instanceof AccessError || error instanceof HttpError)
        return respond({ error: error.message }, error.status);
      if (error instanceof ZodError)
        return respond(
          {
            error: "Check the submitted fields.",
            fields: error.flatten().fieldErrors,
          },
          400,
        );
      const code =
        (error as { code?: string; cause?: { code?: string } })?.cause?.code ??
        (error as { code?: string })?.code;
      if (code === "23505")
        return respond(
          { error: "This slug or active role already exists." },
          409,
        );
      // Do not log provider/SQL errors, request bodies, headers or session data.
      return respond(
        { error: "The service is unavailable. Please try again later." },
        503,
      );
    }
  };
}
