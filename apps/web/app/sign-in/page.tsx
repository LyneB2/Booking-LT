"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/client";
export default function SignIn() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (sent) {
        await api("auth/verify-code", "POST", { email, code });
        router.push("/workspace");
      } else {
        const result = await api<{ message: string }>(
          "auth/request-code",
          "POST",
          { email },
        );
        setSent(true);
        setMessage(result.message);
      }
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth card">
      <p className="eyebrow">Welcome to Booking LT</p>
      <h1>{sent ? "Check your inbox" : "Make yourself at home"}</h1>
      <p>
        {sent
          ? "Enter the six-digit code from your sign-in email."
          : "Use your email to sign in or create an account. No password to remember."}
      </p>
      <form onSubmit={submit}>
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          value={email}
          disabled={sent || busy}
          onChange={(e) => setEmail(e.target.value)}
        />
        {sent && (
          <>
            <label htmlFor="code">Sign-in code</label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
          </>
        )}
        <button disabled={busy}>
          {busy ? "Please wait…" : sent ? "Sign in" : "Send sign-in code"}
        </button>
        {sent && (
          <button
            className="secondary"
            type="button"
            disabled={busy}
            onClick={() => {
              setSent(false);
              setCode("");
              setMessage("");
            }}
          >
            Use another email or request a new code
          </button>
        )}
        <p role="status">{message}</p>
      </form>
    </section>
  );
}
