// Protocol fixture only. It is never imported by application code or deployed.
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { ids, freePort } from "./database";
const users: Record<string, string> = {
  "platform@example.test": ids.platform,
  "ana@example.test": ids.adminA,
  "ben@example.test": ids.adminB,
  "desk@example.test": ids.deskA,
  "visitor@example.test": ids.none,
  "disabled@example.test": ids.disabled,
};
export async function authServer() {
  const issued = new Map<string, { code: string; expires: number }>();
  const tokens = new Map<string, { id: string; email: string }>();
  const port = await freePort();
  const server = createServer(async (req, res) => {
    const send = (value: unknown, status = 200) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(value));
    };
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
    if (req.url === "/mailbox")
      return send(
        [...issued.entries()].map(([email, data]) => ({
          email,
          code: data.code,
        })),
      );
    if (req.url === "/auth/v1/otp") {
      if (users[body.email])
        issued.set(body.email, {
          code: String(Math.floor(100000 + Math.random() * 900000)),
          expires: Date.now() + 600000,
        });
      return send({});
    }
    if (req.url === "/auth/v1/verify") {
      const code = issued.get(body.email);
      if (!code || code.code !== body.token || code.expires < Date.now())
        return send({ msg: "invalid code" }, 403);
      issued.delete(body.email);
      const id = users[body.email];
      const now = Math.floor(Date.now() / 1000);
      const jwt = [
        Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),
        Buffer.from(
          JSON.stringify({
            sub: id,
            role: "authenticated",
            aud: "authenticated",
            exp: now + 3600,
            iat: now,
          }),
        ).toString("base64url"),
        randomBytes(24).toString("base64url"),
      ].join(".");
      tokens.set(jwt, { id, email: body.email });
      return send({
        access_token: jwt,
        refresh_token: randomBytes(24).toString("hex"),
        expires_in: 3600,
        expires_at: now + 3600,
        token_type: "bearer",
        user: {
          id,
          email: body.email,
          role: "authenticated",
          aud: "authenticated",
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
        },
      });
    }
    if (req.url === "/auth/v1/user") {
      const user = tokens.get(
        req.headers.authorization?.replace("Bearer ", "") ?? "",
      );
      return user
        ? send({
            ...user,
            aud: "authenticated",
            role: "authenticated",
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          })
        : send({ msg: "invalid session" }, 401);
    }
    if (req.url?.startsWith("/auth/v1/logout")) {
      tokens.delete(req.headers.authorization?.replace("Bearer ", "") ?? "");
      return send({});
    }
    return send({ msg: "fixture endpoint not implemented" }, 404);
  });
  await new Promise<void>((resolve) =>
    server.listen(port, "127.0.0.1", resolve),
  );
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
