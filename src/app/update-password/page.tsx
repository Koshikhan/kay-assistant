"use client";

import Link from "next/link";
import {
  type FormEvent,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [isUpdating, setIsUpdating] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [passwordUpdated, setPasswordUpdated] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage("");

    if (password.length < 6) {
      setErrorMessage(
        "Your password must contain at least 6 characters.",
      );

      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(
        "The passwords do not match.",
      );

      return;
    }

    try {
      setIsUpdating(true);

      const supabase = createClient();

      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        throw error;
      }

      setPasswordUpdated(true);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(
        "Password update failed:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Your password could not be updated.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <main className="flex min-h-screen min-w-0 items-center justify-center overflow-x-hidden bg-neutral-950 px-3 py-6 text-white sm:px-5 sm:py-10">
      <section className="w-full min-w-0 max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-4 shadow-2xl sm:p-8">
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-500 sm:text-sm">
          Account security
        </p>

        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Choose a new password
        </h1>

        {!passwordUpdated ? (
          <>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              Enter a new password for your
              Kay Assistant account.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-6 min-w-0 space-y-5 sm:mt-7"
            >
              <label
                htmlFor="new-password"
                className="block"
              >
                <span className="text-sm font-medium text-neutral-300">
                  New password
                </span>

                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  className="mt-2 w-full min-w-0 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-500"
                />
              </label>

              <label
                htmlFor="confirm-password"
                className="block"
              >
                <span className="text-sm font-medium text-neutral-300">
                  Confirm new password
                </span>

                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value,
                    )
                  }
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Enter the password again"
                  className="mt-2 w-full min-w-0 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-500"
                />
              </label>

              {errorMessage && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="break-words rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm leading-6 text-red-300 sm:p-4"
                >
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdating}
                className="min-h-12 w-full rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUpdating
                  ? "Updating password..."
                  : "Update password"}
              </button>
            </form>
          </>
        ) : (
          <div
            role="status"
            aria-live="polite"
            className="mt-6 break-words rounded-xl border border-green-900 bg-green-950/40 p-4 text-sm leading-6 text-green-300 sm:p-5"
          >
            Your password has been updated
            successfully.

            <p className="mt-2 text-green-400">
              You can now continue using your
              Kay Assistant account.
            </p>
          </div>
        )}

        <div className="mt-6 grid gap-3">
          {passwordUpdated && (
            <Link
              href="/"
              className="min-h-12 rounded-xl bg-white px-5 py-3 text-center font-semibold text-black transition hover:bg-neutral-200"
            >
              Continue to Kay Assistant
            </Link>
          )}

          <Link
            href="/login"
            className="block rounded-lg px-2 py-3 text-center text-sm text-neutral-400 transition hover:bg-neutral-800/60 hover:text-white"
          >
            Return to login
          </Link>
        </div>
      </section>
    </main>
  );
}