"use client";

export function LogoutButton() {
  return (
    <form
      action="/auth/signout"
      method="post"
      className="mt-5"
    >
      <button
        type="submit"
        className="w-full rounded-xl border border-neutral-700 px-5 py-3 text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
      >
        Log out
      </button>
    </form>
  );
}