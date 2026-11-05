import { describe, it, expect } from "vitest";
import { authorize, type Account, type Action } from "@booking-lt/core";
const complex = { id: "A", status: "active" };
const actions: Action[] = [
  "platform.manage",
  "complex.workspace",
  "page.edit",
  "page.publish",
  "page.history",
];
function actor(
  role?: "platform_admin" | "complex_admin" | "front_desk",
  scope: string | null = "A",
): Account {
  return {
    disabledAt: null,
    assignments: role ? [{ role, complexId: scope, revokedAt: null }] : [],
  };
}
const cases: [string, Account | null, boolean[]][] = [
  ["no profile", null, [false, false, false, false, false]],
  ["no role", actor(), [false, false, false, false, false]],
  ["front desk A", actor("front_desk"), [false, true, false, false, false]],
  ["admin A", actor("complex_admin"), [false, true, true, true, true]],
  ["admin B", actor("complex_admin", "B"), [false, false, false, false, false]],
  ["platform", actor("platform_admin", null), [true, true, false, false, true]],
  [
    "revoked",
    {
      disabledAt: null,
      assignments: [
        { role: "complex_admin", complexId: "A", revokedAt: new Date() },
      ],
    },
    [false, false, false, false, false],
  ],
];
describe("complete foundation/future-page permission table", () => {
  for (const [name, account, expected] of cases)
    for (const [i, action] of actions.entries())
      it(`${name}: ${action}`, () => {
        const run = () => authorize(account, action, complex);
        if (expected[i]) expect(run).not.toThrow();
        else expect(run).toThrow();
      });
  for (const role of ["platform_admin", "complex_admin", "front_desk"] as const)
    for (const action of actions)
      it(`disabled ${role}: ${action}`, () => {
        expect(() =>
          authorize(
            {
              ...actor(role, role === "platform_admin" ? null : "A"),
              disabledAt: new Date(),
            },
            action,
            complex,
          ),
        ).toThrow();
      });
  for (const action of actions.filter((a) => a !== "platform.manage"))
    it(`archived: ${action}`, () =>
      expect(() =>
        authorize(actor("complex_admin"), action, {
          ...complex,
          status: "archived",
        }),
      ).toThrow());
});
