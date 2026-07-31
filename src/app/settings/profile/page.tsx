import Link from "next/link";

import { UserProfilePreferences } from "@/components/UserProfilePreferences";

export default function ProfileSettingsPage() {
  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-neutral-500 sm:text-sm">
              Account settings
            </p>

            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
              Profile and Preferences
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400 sm:text-base">
              Update how Kay personalises creative advice,
              location recommendations and shoot plans.
            </p>
          </div>

          <Link
            href="/"
            className="w-full rounded-xl border border-neutral-700 px-5 py-3 text-center text-sm font-semibold text-neutral-200 transition hover:bg-neutral-800 sm:w-auto"
          >
            Back to dashboard
          </Link>
        </div>

        <UserProfilePreferences />
      </div>
    </main>
  );
}