"use client";

import type {
  ShootPlan,
  ShootType,
} from "@/lib/shootStorage";

type UpcomingShootsProps = {
  plans: ShootPlan[];
  isLoaded: boolean;
  onToggleStatus: (shootId: string) => void;
  onDelete: (shootId: string) => void;
};

function formatShootDate(
  dateString: string,
): string {
  const date = new Date(
    `${dateString}T12:00:00`,
  );

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getShootTypeLabel(
  shootType: ShootType,
): string {
  switch (shootType) {
    case "photography":
      return "Photography";

    case "videography":
      return "Videography";

    case "drone":
      return "Drone";

    default:
      return "Shoot";
  }
}

function getShootTypeIcon(
  shootType: ShootType,
): string {
  switch (shootType) {
    case "photography":
      return "📷";

    case "videography":
      return "🎥";

    case "drone":
      return "🚁";

    default:
      return "📍";
  }
}

export function UpcomingShoots({
  plans,
  isLoaded,
  onToggleStatus,
  onDelete,
}: UpcomingShootsProps) {
  const sortedPlans = [...plans].sort(
    (firstPlan, secondPlan) =>
      firstPlan.date.localeCompare(
        secondPlan.date,
      ),
  );

  return (
    <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl lg:col-span-2">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Shoot planner
        </p>

        <div className="mt-2 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Upcoming shoots
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Plans created and saved by Kay
              Assistant.
            </p>
          </div>

          {plans.length > 0 && (
            <div className="rounded-full bg-neutral-800 px-4 py-2 text-sm text-neutral-300">
              {plans.length}{" "}
              {plans.length === 1
                ? "shoot"
                : "shoots"}
            </div>
          )}
        </div>
      </div>

      {!isLoaded ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-8 text-center">
          <p className="text-neutral-400">
            Loading saved shoots...
          </p>
        </div>
      ) : sortedPlans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/40 p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-800 text-2xl">
            📅
          </div>

          <h3 className="mt-4 font-semibold text-white">
            No shoots planned yet
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
            Kay will soon be able to create and
            save photography, videography and
            drone shoot plans here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedPlans.map((plan) => {
            const isCompleted =
              plan.status === "completed";

            return (
              <article
                key={plan.id}
                className={`rounded-2xl border p-5 transition ${
                  isCompleted
                    ? "border-neutral-800 bg-neutral-950/40 opacity-70"
                    : "border-neutral-700 bg-neutral-950/70"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-xl">
                      {getShootTypeIcon(
                        plan.shootType,
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        {getShootTypeLabel(
                          plan.shootType,
                        )}
                      </p>

                      <h3
                        className={`mt-1 truncate font-semibold ${
                          isCompleted
                            ? "text-neutral-500 line-through"
                            : "text-white"
                        }`}
                      >
                        {plan.title}
                      </h3>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      isCompleted
                        ? "bg-green-950 text-green-300"
                        : "bg-blue-950 text-blue-300"
                    }`}
                  >
                    {isCompleted
                      ? "Completed"
                      : "Planned"}
                  </span>
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-neutral-500">
                      Date
                    </span>

                    <span className="text-right text-neutral-200">
                      {formatShootDate(plan.date)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-neutral-500">
                      Location
                    </span>

                    <span className="truncate text-right text-neutral-200">
                      {plan.location}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-neutral-500">
                      Recommended time
                    </span>

                    <span className="text-right text-neutral-200">
                      {plan.recommendedTime ||
                        "Not selected"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-neutral-500">
                      Shot list
                    </span>

                    <span className="text-neutral-200">
                      {plan.shotList.length} items
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-neutral-500">
                      Equipment
                    </span>

                    <span className="text-neutral-200">
                      {plan.equipment.length} items
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-neutral-800 pt-5">
                  <button
                    type="button"
                    onClick={() =>
                      onToggleStatus(plan.id)
                    }
                    className="rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
                  >
                    {isCompleted
                      ? "Mark planned"
                      : "Complete"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onDelete(plan.id)
                    }
                    className="rounded-xl border border-red-950 px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-950/50"
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}