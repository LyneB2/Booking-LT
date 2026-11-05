import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Send sign-in code" }).click();
  await expect(page.getByLabel("Sign-in code")).toBeVisible();
  const fixtureUrl = await readFile("/tmp/booking-lt-fixture-url", "utf8");
  const mailbox = await (
    await page.request.get(fixtureUrl + "/mailbox")
  ).json();
  await page
    .getByLabel("Sign-in code")
    .fill(mailbox.find((m: { email: string }) => m.email === email).code);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/workspace");
}
test("email code UI, secure cookies, complex/role management and sign-out", async ({
  page,
  context,
  browser,
}, info) => {
  await signIn(page, "platform@example.test");
  await expect(
    page.getByText("You’re signed in.", { exact: false }),
  ).toBeVisible();
  const cookies = await context.cookies();
  const auth = cookies.filter((c) => c.name.startsWith("__Host-booking-auth"));
  expect(auth.length).toBeGreaterThan(0);
  for (const cookie of auth) {
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.secure).toBe(true);
    expect(cookie.sameSite).toBe("Lax");
  }
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "booking-auth",
  );
  await page.getByRole("link", { name: "Platform", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Add a complex" }),
  ).toBeVisible();
  const slug = `browser-${info.project.name}-${Date.now()}`;
  await page
    .getByLabel("Complex name", { exact: true })
    .fill("Browser test complex");
  await page.getByLabel("Address slug").fill(slug);
  await page
    .getByRole("button", { name: "Create complex", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Complex created.");
  const complexes = await (
    await page.request.get("/api/v1/admin/complexes")
  ).json();
  const complex = complexes.find((c: { slug: string }) => c.slug === slug);
  await page.getByLabel("Complex", { exact: true }).selectOption(complex.id);
  await page
    .getByLabel("Existing account ID")
    .fill("10000000-0000-4000-8000-000000000005");
  await page.getByRole("button", { name: "Grant role" }).click();
  await expect(page.getByRole("status")).toHaveText("Role granted.");
  await expect(
    page.getByRole("button", { name: "Revoke", exact: true }),
  ).toHaveCount(1);
  const visitorContext = await browser.newContext();
  const visitor = await visitorContext.newPage();
  await signIn(visitor, "visitor@example.test");
  expect(
    (await visitor.request.get(`/api/v1/complexes/${complex.id}`)).status(),
  ).toBe(200);
  const scan = await new AxeBuilder({ page }).analyze();
  expect(
    scan.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/admin-${info.project.name}.png`,
    fullPage: true,
  });
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Revoke", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Role revoked.");
  expect(
    (await visitor.request.get(`/api/v1/complexes/${complex.id}`)).status(),
  ).toBe(403);
  await visitorContext.close();
  // Cookie request without an Origin cannot change data.
  expect(
    (
      await page.request.post("/api/v1/admin/complexes", {
        data: { name: "CSRF", slug: "csrf" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/v1/admin/complexes", {
        headers: { authorization: "" },
        data: { name: "CSRF", slug: "csrf-empty-auth" },
      })
    ).status(),
  ).toBe(403);
  // Native bearer path uses network-verified identity and the same database authorization.
  const stored = auth
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => c.value)
    .join("");
  const session = JSON.parse(
    Buffer.from(stored.replace(/^base64-/, ""), "base64url").toString("utf8"),
  );
  const nativeContext = await browser.newContext();
  expect(
    (
      await nativeContext.request.get(
        "http://localhost:3000/api/v1/admin/complexes",
        { headers: { authorization: "Bearer " + session.access_token } },
      )
    ).status(),
  ).toBe(200);
  expect(
    (
      await nativeContext.request.get(
        "http://localhost:3000/api/v1/admin/complexes",
        { headers: { authorization: "Bearer invalid-token" } },
      )
    ).status(),
  ).toBe(401);
  await nativeContext.close();
  await page.getByRole("link", { name: "My account" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL("/sign-in");
  expect((await page.request.get("/api/v1/admin/complexes")).status()).toBe(
    401,
  );
});
test("lesser role and disabled account are refused through real browser/session adapter", async ({
  page,
}) => {
  await signIn(page, "ana@example.test");
  await page.goto("/admin");
  await expect(page.getByRole("status")).toContainText("do not have access");
  expect((await page.request.get("/api/v1/admin/complexes")).status()).toBe(
    403,
  );
  await page.goto("/workspace");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await signIn(page, "disabled@example.test");
  await expect(page.getByRole("status")).toContainText("do not have access");
  expect((await page.request.get("/api/v1/me")).status()).toBe(403);
});
test("sign-in is accessible and invalid code never grants a session", async ({
  page,
}, info) => {
  await page.goto("/sign-in");
  const scan = await new AxeBuilder({ page }).analyze();
  expect(
    scan.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  await page.screenshot({
    path: `test-results/sign-in-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByLabel("Email address").fill("platform@example.test");
  await page.getByRole("button", { name: "Send sign-in code" }).click();
  await page.getByLabel("Sign-in code").fill("000000");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("invalid or expired");
  expect((await page.request.get("/api/v1/me")).status()).toBe(401);
});
