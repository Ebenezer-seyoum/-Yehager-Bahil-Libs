"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string };
}) {
  const callbackUrl = searchParams?.callbackUrl ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await signIn("credentials", {
      email,
      password,
      role,
      callbackUrl,
      redirect: false,
    });
    setSubmitting(false);

    if (!result || result.error) {
      setError("Invalid credentials");
      return;
    }

    window.location.href = result.url ?? callbackUrl;
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl font-semibold">Sign In</h1>
      <p className="mt-2 text-sm text-muted-foreground">Use the demo credentials configured in your env.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-5">
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-10 w-full rounded-md border border-input bg-background px-3"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-10 w-full rounded-md border border-input bg-background px-3"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3"
          >
            <option value="customer">customer</option>
            <option value="admin">admin</option>
          </select>
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
