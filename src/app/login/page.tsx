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
    <main className="flex min-h-screen min-w-0 items-center justify-center overflow-x-hidden bg-neutral-950 px-3 py-6 text-white sm:px-5 sm:py-10">
      <section className="w-full min-w-0 max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-4 shadow-2xl sm:p-7">
        <div className="mb-6 sm:mb-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 sm:text-sm">
            Kay Assistant
          </p>

          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome
          </h1>

          <p className="mt-3 text-sm leading-6 text-neutral-400 sm:text-base sm:leading-7">
            Sign in to manage your photography,
            videography and drone shoot plans.
          </p>
        </div>

        {params.error && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-5 break-words rounded-xl border border-red-900 bg-red-950/50 p-3 text-sm leading-6 text-red-200 sm:p-4"
          >
            {params.error}
          </div>
        )}

        {params.message && (
          <div
            role="status"
            aria-live="polite"
            className="mb-5 break-words rounded-xl border border-green-900 bg-green-950/50 p-3 text-sm leading-6 text-green-200 sm:p-4"
          >
            {params.message}
          </div>
        )}

        <form className="min-w-0 space-y-5">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-neutral-300"
          >
            Email address

            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              className="mt-2 w-full min-w-0 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-500"
            />
          </label>

          <div className="min-w-0">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-300"
            >
              Password

              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                placeholder="At least 6 characters"
                className="mt-2 w-full min-w-0 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-500"
              />
            </label>

            <div className="mt-3 flex justify-end">
              <Link
                href="/forgot-password"
                className="rounded-lg px-1 py-2 text-sm text-neutral-400 transition hover:text-white"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <div className="space-y-3 pt-1 sm:pt-2">
            <button
              type="submit"
              formAction={login}
              className="min-h-12 w-full rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-neutral-200"
            >
              Log in
            </button>

            <button
              type="submit"
              formAction={signup}
              className="min-h-12 w-full rounded-xl border border-neutral-700 px-5 py-3 font-semibold text-white transition hover:bg-neutral-800"
            >
              Create account
            </button>
          </div>
        </form>

        <p className="mt-6 break-words text-center text-xs leading-5 text-neutral-500">
          Your account keeps your shoot plans private
          and synchronised across devices.
        </p>
      </section>
    </main>
  );
}