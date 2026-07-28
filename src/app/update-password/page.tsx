"use client";

import {
  type FormEvent,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [isUpdating, setIsUpdating] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (password.length < 8) {
      setErrorMessage(
        "Your password must contain at least 8 characters.",
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
      setErrorMessage("");
      setSuccessMessage("");

      const supabase =
        createClient();

      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        throw error;
      }

      setSuccessMessage(
        "Your password was updated successfully.",
      );

      await supabase.auth.signOut();

      window.setTimeout(() => {
        window.location.href =
          "/login";
      }, 1500);
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
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-5 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
        <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
          Account security
        </p>

        <h1 className="mt-3 text-3xl font-bold">
          Create a new password
        </h1>

        <p className="mt-3 text-sm leading-6 text-neutral-400">
          Enter the new password you want to
          use for your Kay Assistant account.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-7 space-y-5"
        >
          <label className="block">
            <span className="text-sm font-medium text-neutral-300">
              New password
            </span>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-neutral-300">
              Confirm new password
            </span>

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value,
                )
              }
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            />
          </label>

          {errorMessage && (
            <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-green-900 bg-green-950/40 p-4 text-sm text-green-300">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={
              isUpdating ||
              Boolean(successMessage)
            }
            className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUpdating
              ? "Updating password..."
              : "Update password"}
          </button>
        </form>
      </section>
    </main>
  );
}