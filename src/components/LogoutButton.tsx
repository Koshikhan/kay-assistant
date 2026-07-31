"use client";

type LogoutButtonProps = {
  variant?: "default" | "menu";
};

export function LogoutButton({
  variant = "default",
}: LogoutButtonProps) {
  const isMenuVariant =
    variant === "menu";

  return (
    <form
      action="/auth/signout"
      method="post"
      className={
        isMenuVariant
          ? ""
          : "mt-5"
      }
    >
      <button
        type="submit"
        className={
          isMenuVariant
            ? "w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-300 transition hover:bg-red-950/40 hover:text-red-200"
            : "w-full rounded-xl border border-neutral-700 px-5 py-3 text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
        }
      >
        Log out
      </button>
    </form>
  );
}