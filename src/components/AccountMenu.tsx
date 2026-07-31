"use client";

import Link from "next/link";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  LogoutButton,
} from "@/components/LogoutButton";

import {
  loadUserProfileFromDatabase,
} from "@/lib/userProfileDatabase";

import {
  createClient,
} from "@/lib/supabase/client";

type AccountDetails = {
  displayName: string;
  email: string;
};

export function AccountMenu() {
  const menuRef =
    useRef<HTMLDivElement | null>(null);

  const [isOpen, setIsOpen] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [account, setAccount] =
    useState<AccountDetails>({
      displayName: "Account",
      email: "",
    });

  useEffect(() => {
    let isActive = true;

    async function loadAccount() {
      try {
        const supabase =
          createClient();

        const {
          data: userData,
          error: userError,
        } =
          await supabase.auth.getUser();

        if (
          userError ||
          !userData.user
        ) {
          throw new Error(
            userError?.message ??
              "The signed-in account could not be loaded.",
          );
        }

        const profile =
          await loadUserProfileFromDatabase();

        const email =
          userData.user.email ?? "";

        const fallbackName =
          email.split("@")[0] ||
          "Account";

        if (isActive) {
          setAccount({
            displayName:
              profile?.displayName.trim() ||
              fallbackName,

            email,
          });
        }
      } catch (error) {
        console.warn(
          "Account menu loading failed:",
          error,
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadAccount();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleOutsideClick(
      event: MouseEvent,
    ) {
      const target =
        event.target;

      if (
        target instanceof Node &&
        menuRef.current &&
        !menuRef.current.contains(
          target,
        )
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [isOpen]);

  const accountInitial =
    (
      account.displayName ||
      account.email ||
      "A"
    )
      .charAt(0)
      .toUpperCase();

  return (
    <div
      ref={menuRef}
      className="relative mt-5"
    >
      {isOpen && (
        <div className="mb-3 w-full min-w-[260px] overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl lg:absolute lg:bottom-0 lg:left-[calc(100%+0.75rem)] lg:z-50 lg:mb-0 lg:w-80">
          <div className="border-b border-neutral-800 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Signed in as
            </p>

            <p className="mt-2 truncate font-semibold text-white">
              {isLoading
                ? "Loading account..."
                : account.displayName}
            </p>

            <p className="mt-1 truncate text-sm text-neutral-400">
              {isLoading
                ? "Checking your session"
                : account.email ||
                  "Email unavailable"}
            </p>
          </div>

          <div className="space-y-1 p-2">
            <Link
              href="/settings/profile"
              onClick={() =>
                setIsOpen(false)
              }
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800 hover:text-white"
            >
              Profile and Preferences
            </Link>

            <LogoutButton
              variant="menu"
            />
          </div>
        </div>
      )}

      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() =>
          setIsOpen(
            (currentValue) =>
              !currentValue,
          )
        }
        className="flex w-full items-center gap-3 rounded-xl border border-neutral-700 bg-neutral-950/40 px-3 py-3 text-left transition hover:bg-neutral-800"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white font-bold text-black">
          {accountInitial}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">
            {isLoading
              ? "Loading account..."
              : account.displayName}
          </span>

          <span className="mt-0.5 block truncate text-xs text-neutral-500">
            {isLoading
              ? "Please wait"
              : account.email ||
                "View account"}
          </span>
        </span>

        <span
          aria-hidden="true"
          className={`shrink-0 text-neutral-500 transition ${
            isOpen
              ? "rotate-180"
              : ""
          }`}
        >
          ▾
        </span>
      </button>
    </div>
  );
}