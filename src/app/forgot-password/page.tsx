"use client";

import Link from "next/link";
import {
  type FormEvent,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] =
    useState("");

  const [isSending, setIsSending] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [emailSent, setEmailSent] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setErrorMessage(
        "Enter your email address.",
      );

      return;
    }

    try {
      setIsSending(true);
      setErrorMessage("");

      const supabase = createClient();

      const redirectTo =
        `${window.location.origin}/auth/callback`;

      const { error } =
        await supabase.auth
          .resetPasswordForEmail(
            cleanEmail,
            {
              redirectTo,
            },
          );

      if (error) {
        throw error;
      }

      setEmailSent(true);
    } catch (error) {
      console.error(
        "Password reset email failed:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The reset email could not be sent.",
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="flex min-h-screen min-w-0 items-center justify-center overflow-x-hidden bg-neutral-950 px-3 py-6 text-white sm:px-5 sm:py-10">
      <section className="w-full min-w-0 max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-4 shadow-2xl sm:p-8">
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-500 sm:text-sm">
          Account recovery
        </p>

        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Reset your password
        </h1>

        {!emailSent ? (
          <>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              Enter the email address connected
              to your Kay Assistant account.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-6 min-w-0 sm:mt-7"
            >
              <label
                htmlFor="reset-email"
                className="block"
              >
                <span className="text-sm font-medium text-neutral-300">
                  Email address
                </span>

                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  className="mt-2 w-full min-w-0 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-500"
                />
              </label>

              {errorMessage && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="mt-5 break-words rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm leading-6 text-red-300 sm:p-4"
                >
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSending}
                className="mt-6 min-h-12 w-full rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending
                  ? "Sending reset email..."
                  : "Send reset email"}
              </button>
            </form>
          </>
        ) : (
          <div
            role="status"
            aria-live="polite"
            className="mt-6 break-words rounded-xl border border-green-900 bg-green-950/40 p-4 text-sm leading-6 text-green-300 sm:p-5"
          >
            Check your email for a password
            reset link.

            <p className="mt-2 text-green-400">
              Also check your spam or junk
              folder.
            </p>
          </div>
        )}

        <Link
          href="/login"
          className="mt-6 block rounded-lg px-2 py-3 text-center text-sm text-neutral-400 transition hover:bg-neutral-800/60 hover:text-white"
        >
          Return to login
        </Link>
      </section>
    </main>
  );
}