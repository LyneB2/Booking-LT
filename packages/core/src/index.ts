export type Role = "platform_admin" | "complex_admin" | "front_desk";
export type Action =
  | "account.read"
  | "platform.manage"
  | "complex.workspace"
  | "page.edit"
  | "page.publish"
  | "page.history";
export type Assignment = {
  role: Role;
  complexId: string | null;
  revokedAt: Date | null;
};
export type Account = { disabledAt: Date | null; assignments: Assignment[] };
export class AccessError extends Error {
  constructor(
    public status: 401 | 403 | 404,
    message = "You do not have access to this workspace.",
  ) {
    super(message);
  }
}
export function authorize(
  account: Account | null,
  action: Action,
  complex?: { id: string; status: string },
) {
  if (!account || account.disabledAt) throw new AccessError(403);
  if (action === "account.read") return;
  const roles = account.assignments.filter((r) => !r.revokedAt);
  const platform = roles.some(
    (r) => r.role === "platform_admin" && r.complexId === null,
  );
  if (action === "platform.manage") {
    if (platform) return;
    throw new AccessError(403);
  }
  if (!complex || complex.status !== "active") throw new AccessError(404);
  const admin = roles.some(
    (r) => r.role === "complex_admin" && r.complexId === complex.id,
  );
  const desk = roles.some(
    (r) => r.role === "front_desk" && r.complexId === complex.id,
  );
  if (
    admin ||
    ((action === "complex.workspace" || action === "page.history") &&
      platform) ||
    (action === "complex.workspace" && desk)
  )
    return;
  throw new AccessError(403);
}
