"use client";

import { useState } from "react";

import type {
  ShootPlan,
  ShootType,
} from "@/lib/shootStorage";

type UpcomingShootsProps = {
  plans: ShootPlan[];
  isLoaded: boolean;
  onToggleStatus: (shootId: string) => void;
  onDelete: (shootId: string) => void;
  onToggleShot: (
    shootId: string,
    shot: string,
  ) => void;
  onToggleEquipment: (
    shootId: string,
    equipment: string,
  ) => void;
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
  onToggleShot,
  onToggleEquipment,
}: UpcomingShootsProps) {
  const [
    expandedShootId,
    setExpandedShootId,
  ] = useState<string | null>(null);

  const sortedPlans = [...plans].sort(
    (firstPlan, secondPlan) =>
      firstPlan.date.localeCompare(
        secondPlan.date,
      ),
  );

  function toggleDetails(
    shootId: string,
  ) {
    setExpandedShootId((currentId) =>
      currentId === shootId
        ? null
        : shootId,
    );
  }

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
            Ask Kay to create and save a
            photography, videography or drone
            shoot plan.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedPlans.map((plan) => {
            const isCompleted =
              plan.status === "completed";

            const isExpanded =
              expandedShootId === plan.id;

            const completedShots =
              plan.completedShots ?? [];

            const packedEquipment =
              plan.packedEquipment ?? [];

            return (
              <article
                key={plan.id}
                className={`rounded-2xl border p-5 transition ${
                  isCompleted
                    ? "border-neutral-800 bg-neutral-950/40 opacity-75"
                    : "border-neutral-700 bg-neutral-950/70"
                } ${
                  isExpanded
                    ? "md:col-span-2"
                    : ""
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
                        className={`mt-1 font-semibold ${
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
                      {formatShootDate(
                        plan.date,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-neutral-500">
                      Location
                    </span>

                    <span className="text-right text-neutral-200">
                      {plan.location}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <span className="shrink-0 text-neutral-500">
                      Recommended time
                    </span>

                    <span className="text-right text-neutral-200">
                      {plan.recommendedTime ||
                        "Not selected"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-neutral-500">
                      Shots completed
                    </span>

                    <span className="text-neutral-200">
                      {completedShots.length}/
                      {plan.shotList.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-neutral-500">
                      Equipment packed
                    </span>

                    <span className="text-neutral-200">
                      {packedEquipment.length}/
                      {plan.equipment.length}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-6 grid gap-6 border-t border-neutral-800 pt-6 md:grid-cols-2">
                    <div>
                      <h4 className="font-semibold text-white">
                        Shot list
                      </h4>

                      <div className="mt-3 space-y-2">
                        {plan.shotList.map(
                          (shot, index) => {
                            const checked =
                              completedShots.includes(
                                shot,
                              );

                            return (
                              <button
                                key={`${plan.id}-shot-${index}`}
                                type="button"
                                onClick={() =>
                                  onToggleShot(
                                    plan.id,
                                    shot,
                                  )
                                }
                                className="flex w-full items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-left transition hover:border-neutral-700"
                              >
                                <span
                                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                                    checked
                                      ? "border-green-600 bg-green-600 text-white"
                                      : "border-neutral-600"
                                  }`}
                                >
                                  {checked
                                    ? "✓"
                                    : ""}
                                </span>

                                <span
                                  className={
                                    checked
                                      ? "text-neutral-500 line-through"
                                      : "text-neutral-200"
                                  }
                                >
                                  {shot}
                                </span>
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-white">
                        Equipment checklist
                      </h4>

                      <div className="mt-3 space-y-2">
                        {plan.equipment.map(
                          (item, index) => {
                            const checked =
                              packedEquipment.includes(
                                item,
                              );

                            return (
                              <button
                                key={`${plan.id}-equipment-${index}`}
                                type="button"
                                onClick={() =>
                                  onToggleEquipment(
                                    plan.id,
                                    item,
                                  )
                                }
                                className="flex w-full items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-left transition hover:border-neutral-700"
                              >
                                <span
                                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                                    checked
                                      ? "border-green-600 bg-green-600 text-white"
                                      : "border-neutral-600"
                                  }`}
                                >
                                  {checked
                                    ? "✓"
                                    : ""}
                                </span>

                                <span
                                  className={
                                    checked
                                      ? "text-neutral-500 line-through"
                                      : "text-neutral-200"
                                  }
                                >
                                  {item}
                                </span>
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>

                    {plan.notes && (
                      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 md:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          Preparation notes
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-300">
                          {plan.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-5 grid grid-cols-3 gap-3 border-t border-neutral-800 pt-5">
                  <button
                    type="button"
                    onClick={() =>
                      toggleDetails(plan.id)
                    }
                    className="rounded-xl border border-neutral-700 px-3 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
                  >
                    {isExpanded
                      ? "Hide details"
                      : "View details"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onToggleStatus(plan.id)
                    }
                    className="rounded-xl border border-neutral-700 px-3 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
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
                    className="rounded-xl border border-red-950 px-3 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-950/50"
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