import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";
import { AccessError } from "@booking-lt/core";
export function authContext(request: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("SERVICE_UNCONFIGURED");
  const pending: { name: string; value: string; options: CookieOptions }[] = [];
  const bearer = request.headers.get("authorization");
  const hasBearer = request.headers.has("authorization");
  const secure = process.env.NODE_ENV === "production";
  const cookieName = secure ? "__Host-booking-auth" : "booking-auth";
  const client = hasBearer
    ? createClient(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      })
    : createServerClient(url, key, {
        cookieOptions: {
          name: cookieName,
          httpOnly: true,
          secure,
          sameSite: "lax",
          path: "/",
        },
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookies) => {
            pending.push(...cookies);
          },
        },
      });
  return {
    client,
    async userId() {
      if (hasBearer && !/^Bearer [^\s]+$/.test(bearer ?? ""))
        throw new AccessError(401, "Please sign in.");
      // A network-verified Auth user, never getSession() or JWT role claims.
      const { data, error } = await client.auth.getUser(
        hasBearer ? bearer!.slice(7) : undefined,
      );
      if (error || !data.user) throw new AccessError(401, "Please sign in.");
      return data.user.id;
    },
    clear() {
      for (const { name } of request.cookies.getAll())
        if (name === cookieName || name.startsWith(cookieName + "."))
          pending.push({
            name,
            value: "",
            options: {
              maxAge: 0,
              path: "/",
              httpOnly: true,
              secure,
              sameSite: "lax",
            },
          });
    },
    apply(response: NextResponse) {
      for (const { name, value, options } of pending)
        response.cookies.set(name, value, {
          ...options,
          httpOnly: true,
          secure,
          sameSite: "lax",
          path: "/",
        });
      return response;
    },
  };
}
