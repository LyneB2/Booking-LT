"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../lib/client";
export default function Workspace() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [message, setMessage] = useState("Loading your account…");
  useEffect(() => {
    api<{ userId: string }>("me")
      .then((data) => {
        setId(data.userId);
        setMessage(
          "You’re signed in. A platform administrator can use your account ID to give you access to a complex.",
        );
      })
      .catch((e) => setMessage(e.message));
  }, []);
  return (
    <section className="card">
      <p className="eyebrow">My account</p>
      <h1>Your workspace</h1>
      <p role="status">{message}</p>
      {id && (
        <>
          <p>Account ID</p>
          <code>{id}</code>
          <p>
            Complex pages and operational tools will arrive in later milestones.
          </p>
          <button
            onClick={async () => {
              await api("auth/sign-out", "POST");
              router.push("/sign-in");
            }}
          >
            Sign out
          </button>
        </>
      )}
      <p>
        <Link href="/sign-in">Go to sign in</Link>
      </p>
    </section>
  );
}
