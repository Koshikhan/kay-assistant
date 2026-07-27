"use client";

import { useState } from "react";

import {
  loadShootPlansFromDatabase,
  migrateShootPlansToDatabase,
} from "@/lib/shootDatabase";

import {
  loadShootPlans,
  type ShootPlan,
} from "@/lib/shootStorage";

type DatabaseMigrationButtonProps = {
  onCompleted: (
    plans: ShootPlan[],
  ) => void;
};

export function DatabaseMigrationButton({
  onCompleted,
}: DatabaseMigrationButtonProps) {
  const [isMigrating, setIsMigrating] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [hasError, setHasError] =
    useState(false);

  async function handleMigration() {
    const localPlans = loadShootPlans();

    if (localPlans.length === 0) {
      setHasError(false);
      setMessage(
        "There are no local shoot plans to copy.",
      );

      return;
    }

    const shouldContinue = window.confirm(
      `Copy ${localPlans.length} local shoot plan${
        localPlans.length === 1 ? "" : "s"
      } to your Supabase account?`,
    );

    if (!shouldContinue) {
      return;
    }

    try {
      setIsMigrating(true);
      setHasError(false);
      setMessage("");

      const migratedCount =
        await migrateShootPlansToDatabase(
          localPlans,
        );

      const databasePlans =
        await loadShootPlansFromDatabase();

      onCompleted(databasePlans);

      setMessage(
        `${migratedCount} shoot plan${
          migratedCount === 1 ? "" : "s"
        } copied to Supabase successfully.`,
      );
    } catch (error) {
      setHasError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "The migration could not be completed.",
      );
    } finally {
      setIsMigrating(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleMigration}
        disabled={isMigrating}
        className="w-full rounded-xl border border-blue-900 px-5 py-3 text-sm font-semibold text-blue-300 transition hover:bg-blue-950/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isMigrating
          ? "Copying shoots..."
          : "Copy local shoots to database"}
      </button>

      {message && (
        <p
          className={`mt-3 text-sm ${
            hasError
              ? "text-red-300"
              : "text-green-300"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}