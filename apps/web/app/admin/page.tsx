"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/client";
type Complex = { id: string; name: string; slug: string; status: string };
type Grant = { id: string; userId: string; role: string };
export default function Admin() {
  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [selected, setSelected] = useState("");
  const [roles, setRoles] = useState<Grant[]>([]);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState("Loading access…");
  const [busy, setBusy] = useState(false);
  async function load() {
    const data = await api<Complex[]>("admin/complexes");
    setComplexes(data);
    setAllowed(true);
    setMessage("");
  }
  useEffect(() => {
    api<Complex[]>("admin/complexes")
      .then((data) => {
        setComplexes(data);
        setAllowed(true);
        setMessage("");
      })
      .catch((e) => setMessage(e.message));
  }, []);
  useEffect(() => {
    if (!selected) return;
    let current = true;
    api<Grant[]>(`admin/complexes/${selected}/roles`)
      .then((data) => {
        if (current) setRoles(data);
      })
      .catch((e) => {
        if (current) setMessage(e.message);
      });
    return () => {
      current = false;
    };
  }, [selected]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setMessage("");
    try {
      await api("admin/complexes", "POST", {
        name: data.get("name"),
        slug: data.get("slug"),
      });
      await load();
      form.reset();
      setMessage("Complex created.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function grant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setMessage("");
    try {
      await api(`admin/complexes/${selected}/roles`, "POST", {
        userId: data.get("userId"),
        role: data.get("role"),
      });
      setRoles(await api(`admin/complexes/${selected}/roles`));
      form.reset();
      setMessage("Role granted.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function revoke(role: Grant) {
    if (
      !window.confirm("Revoke this role? Access will end on the next request.")
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      await api(`admin/complexes/${selected}/roles/${role.id}`, "DELETE");
      setRoles(await api(`admin/complexes/${selected}/roles`));
      setMessage("Role revoked.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Platform administration</p>
        <h1>Complexes & people</h1>
        <p>Create a home for each complex, and give the right people access.</p>
      </div>
      <p role="status" className="notice">
        {message}
      </p>
      {!allowed ? (
        <p>
          <Link href="/sign-in">Sign in with an authorized account</Link>
        </p>
      ) : (
        <div className="admin-grid">
          <section className="card">
            <h2>Add a complex</h2>
            <form onSubmit={create}>
              <label htmlFor="name">Complex name</label>
              <input
                id="name"
                name="name"
                required
                minLength={2}
                maxLength={120}
                placeholder="e.g. Playa Serena Residences"
              />
              <label htmlFor="slug">Address slug</label>
              <input
                id="slug"
                name="slug"
                required
                minLength={2}
                maxLength={80}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                placeholder="playa-serena"
              />
              <p className="hint">
                Lowercase letters, numbers and hyphens. This will identify the
                complex’s public address.
              </p>
              <button disabled={busy}>Create complex</button>
            </form>
          </section>
          <section className="card">
            <h2>Team access</h2>
            <label htmlFor="complex">Complex</label>
            <select
              id="complex"
              value={selected}
              onChange={(e) => {
                setRoles([]);
                setSelected(e.target.value);
              }}
            >
              <option value="">Choose a complex</option>
              {complexes
                .filter((c) => c.status === "active")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            {selected ? (
              <>
                <form onSubmit={grant}>
                  <label htmlFor="userId">Existing account ID</label>
                  <input
                    id="userId"
                    name="userId"
                    required
                    placeholder="Account UUID"
                  />
                  <p className="hint">
                    Ask the person to sign in and share the ID on My account.
                  </p>
                  <label htmlFor="role">Role</label>
                  <select id="role" name="role">
                    <option value="complex_admin">Complex administrator</option>
                    <option value="front_desk">Front desk</option>
                  </select>
                  <button disabled={busy}>Grant role</button>
                </form>
                <h3>Current access</h3>
                {roles.length === 0 && <p>No active roles.</p>}
                <ul className="roles">
                  {roles.map((r) => (
                    <li key={r.id}>
                      <div>
                        <strong>
                          {r.role === "complex_admin"
                            ? "Complex administrator"
                            : "Front desk"}
                        </strong>
                        <code>{r.userId}</code>
                      </div>
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() => revoke(r)}
                      >
                        Revoke
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Choose a complex to manage its team.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
