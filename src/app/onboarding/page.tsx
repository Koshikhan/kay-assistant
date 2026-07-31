"use client";

import { useRouter } from "next/navigation";

import { UserProfilePreferences } from "@/components/UserProfilePreferences";

export default function OnboardingPage() {
  const router = useRouter();

  function handleProfileSaved() {
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-500 sm:text-sm">
            Welcome to Kay Assistant
          </p>

          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            Complete your account
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400 sm:text-base">
            Set your creative preferences before entering
            your dashboard. You can update these details
            later from your profile settings.
          </p>
        </div>

        <UserProfilePreferences
          mode="onboarding"
          onSaved={handleProfileSaved}
        />
      </div>
    </main>
  );
}