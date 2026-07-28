import Link from "next/link";

import {
  login,
  signup,
} from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-5 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-7 shadow-2xl">
        <div className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
            Kay Assistant
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Welcome
          </h1>

          <p className="mt-3 leading-7 text-neutral-400">
            Sign in to manage your photography,
            videography and drone shoot plans.
          </p>
        </div>

        {params.error && (
          <div className="mb-5 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-200">
            {params.error}
          </div>
        )}

        {params.message && (
          <div className="mb-5 rounded-xl border border-green-900 bg-green-950/50 p-4 text-sm text-green-200">
            {params.message}
          </div>
        )}

        <form className="space-y-5">
          <label className="block text-sm font-medium text-neutral-300">
            Email address

            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-500"
            />
          </label>

          <div>
            <label className="block text-sm font-medium text-neutral-300">
              Password

              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                placeholder="At least 6 characters"
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-500"
              />
            </label>

            <div className="mt-3 flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-neutral-400 transition hover:text-white"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="submit"
              formAction={login}
              className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-neutral-200"
            >
              Log in
            </button>

            <button
              type="submit"
              formAction={signup}
              className="w-full rounded-xl border border-neutral-700 px-5 py-3 font-semibold text-white transition hover:bg-neutral-800"
            >
              Create account
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-neutral-500">
          Your account keeps your shoot plans private
          and synchronised across devices.
        </p>
      </section>
    </main>
  );
}