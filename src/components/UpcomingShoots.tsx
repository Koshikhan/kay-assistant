"use client";

import { useState } from "react";

import type {
  ShootPlan,
  ShootType,
  ShootWeatherSummary,
} from "@/lib/shootStorage";

type EditShootForm = {
  title: string;
  location: string;
  date: string;
  recommendedTime: string;
  shotListText: string;
  equipmentText: string;
  notes: string;
};

type ShootTypeFilter =
  | "all"
  | ShootType;

type ShootStatusFilter =
  | "all"
  | "planned"
  | "completed";

type ShootSortOrder =
  | "date-ascending"
  | "date-descending"
  | "recently-updated";

type UpcomingShootsProps = {
  plans: ShootPlan[];
  isLoaded: boolean;
  refreshingShootId: string | null;

  onToggleStatus: (shootId: string) => void;
  onDelete: (shootId: string) => void;

  onRefreshWeather: (
    shootId: string,
  ) => void;

  onUpdateShoot: (
    updatedPlan: ShootPlan,
  ) => void;

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

function formatWeatherNumber(
  value: number | null,
): string {
  if (value === null) {
    return "Not available";
  }

  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(1);
}

function formatWeatherMetric(
  value: number | null,
  unit: string,
): string {
  if (value === null) {
    return "Not available";
  }

  return `${formatWeatherNumber(value)} ${unit}`;
}

function formatTemperatureRange(
  weather: ShootWeatherSummary,
): string {
  const minimum =
    weather.minimumTemperature;

  const maximum =
    weather.maximumTemperature;

  const unit =
    weather.temperatureUnit ?? "°C";

  if (
    minimum === null &&
    maximum === null
  ) {
    return "Not available";
  }

  if (minimum === null) {
    return `${formatWeatherNumber(
      maximum,
    )} ${unit}`;
  }

  if (maximum === null) {
    return `${formatWeatherNumber(
      minimum,
    )} ${unit}`;
  }

  return `${formatWeatherNumber(
    minimum,
  )}–${formatWeatherNumber(
    maximum,
  )} ${unit}`;
}

function formatGoldenHour(
  weather: ShootWeatherSummary,
): string {
  const start = weather.goldenHourStart;
  const end = weather.goldenHourEnd;

  if (start && end) {
    return `${start}–${end}`;
  }

  if (start) {
    return `From ${start}`;
  }

  if (end) {
    return `Until ${end}`;
  }

  return "Not available";
}

export function UpcomingShoots({
  plans,
  isLoaded,
  refreshingShootId,
  onToggleStatus,
  onDelete,
  onRefreshWeather,
  onUpdateShoot,
  onToggleShot,
  onToggleEquipment,
}: UpcomingShootsProps) {
  const [
    expandedShootId,
    setExpandedShootId,
  ] = useState<string | null>(null);

  const [
    editingShootId,
    setEditingShootId,
  ] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [typeFilter, setTypeFilter] =
    useState<ShootTypeFilter>("all");

  const [statusFilter, setStatusFilter] =
    useState<ShootStatusFilter>("all");

  const [sortOrder, setSortOrder] =
    useState<ShootSortOrder>(
      "date-ascending",
    );

  const [editForm, setEditForm] =
    useState<EditShootForm>({
      title: "",
      location: "",
      date: "",
      recommendedTime: "",
      shotListText: "",
      equipmentText: "",
      notes: "",
    });

  const normalisedSearch =
    searchQuery.trim().toLowerCase();

  const filteredPlans = [...plans]
    .filter((plan) => {
      const matchesSearch =
        !normalisedSearch ||
        plan.title
          .toLowerCase()
          .includes(normalisedSearch) ||
        plan.location
          .toLowerCase()
          .includes(normalisedSearch);

      const matchesType =
        typeFilter === "all" ||
        plan.shootType === typeFilter;

      const matchesStatus =
        statusFilter === "all" ||
        plan.status === statusFilter;

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus
      );
    })
    .sort((firstPlan, secondPlan) => {
      if (sortOrder === "date-descending") {
        return secondPlan.date.localeCompare(
          firstPlan.date,
        );
      }

      if (sortOrder === "recently-updated") {
        return secondPlan.updatedAt.localeCompare(
          firstPlan.updatedAt,
        );
      }

      return firstPlan.date.localeCompare(
        secondPlan.date,
      );
    });

  const hasActiveFilters =
    Boolean(normalisedSearch) ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    sortOrder !== "date-ascending";

  const plannedShootCount =
    plans.filter(
      (plan) => plan.status === "planned",
    ).length;

  const completedShootCount =
    plans.filter(
      (plan) => plan.status === "completed",
    ).length;

  const photographyShootCount =
    plans.filter(
      (plan) =>
        plan.shootType === "photography",
    ).length;

  const videographyShootCount =
    plans.filter(
      (plan) =>
        plan.shootType === "videography",
    ).length;

  const droneShootCount =
    plans.filter(
      (plan) => plan.shootType === "drone",
    ).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysFromToday =
    new Date(today);

  sevenDaysFromToday.setDate(
    sevenDaysFromToday.getDate() + 7,
  );

  const shootsThisWeekCount =
    plans.filter((plan) => {
      if (plan.status !== "planned") {
        return false;
      }

      const shootDate = new Date(
        `${plan.date}T12:00:00`,
      );

      return (
        shootDate >= today &&
        shootDate < sevenDaysFromToday
      );
    }).length;

  function toggleDetails(
    shootId: string,
  ) {
    setExpandedShootId((currentId) =>
      currentId === shootId
        ? null
        : shootId,
    );
  }

  function clearFilters() {
    setSearchQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
    setSortOrder("date-ascending");
  }

  function beginEditing(
    plan: ShootPlan,
  ) {
    setExpandedShootId(plan.id);
    setEditingShootId(plan.id);

    setEditForm({
      title: plan.title,
      location: plan.location,
      date: plan.date,
      recommendedTime:
        plan.recommendedTime,
      shotListText:
        plan.shotList.join("\n"),
      equipmentText:
        plan.equipment.join("\n"),
      notes: plan.notes,
    });
  }

  function cancelEditing() {
    setEditingShootId(null);
  }

  function updateEditField(
    field: keyof EditShootForm,
    value: string,
  ) {
    setEditForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function saveEditedShoot(
    plan: ShootPlan,
  ) {
    const title = editForm.title.trim();
    const location =
      editForm.location.trim();
    const date = editForm.date;

    if (!title || !location || !date) {
      return;
    }

    const shotList =
      editForm.shotListText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);

    const equipment =
      editForm.equipmentText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);

    const locationChanged =
      location.toLowerCase() !==
      plan.location.trim().toLowerCase();

    const dateChanged =
      date !== plan.date;

    onUpdateShoot({
      ...plan,
      title,
      location,
      date,
      recommendedTime:
        editForm.recommendedTime.trim(),
      shotList,
      equipment,
      completedShots: (
        plan.completedShots ?? []
      ).filter((item) =>
        shotList.includes(item),
      ),
      packedEquipment: (
        plan.packedEquipment ?? []
      ).filter((item) =>
        equipment.includes(item),
      ),
      notes: editForm.notes.trim(),
      weather:
        locationChanged || dateChanged
          ? null
          : plan.weather,
    });

    setEditingShootId(null);
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
              {filteredPlans.length} of{" "}
              {plans.length}{" "}
              {plans.length === 1
                ? "shoot"
                : "shoots"}
            </div>
          )}
        </div>

        {plans.length > 0 && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Planned
              </p>

              <p className="mt-2 text-2xl font-semibold text-white">
                {plannedShootCount}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Completed
              </p>

              <p className="mt-2 text-2xl font-semibold text-white">
                {completedShootCount}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Next 7 days
              </p>

              <p className="mt-2 text-2xl font-semibold text-white">
                {shootsThisWeekCount}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Photography
              </p>

              <p className="mt-2 text-2xl font-semibold text-white">
                {photographyShootCount}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Videography
              </p>

              <p className="mt-2 text-2xl font-semibold text-white">
                {videographyShootCount}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Drone
              </p>

              <p className="mt-2 text-2xl font-semibold text-white">
                {droneShootCount}
              </p>
            </div>
          </div>
        )}

        {plans.length > 0 && (
          <div className="mt-5 grid gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/50 p-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))_auto]">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Search
              <input
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value,
                  )
                }
                placeholder="Title or location"
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Shoot type
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(
                    event.target
                      .value as ShootTypeFilter,
                  )
                }
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-neutral-500"
              >
                <option value="all">
                  All types
                </option>
                <option value="photography">
                  Photography
                </option>
                <option value="videography">
                  Videography
                </option>
                <option value="drone">
                  Drone
                </option>
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Status
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target
                      .value as ShootStatusFilter,
                  )
                }
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-neutral-500"
              >
                <option value="all">
                  All statuses
                </option>
                <option value="planned">
                  Planned
                </option>
                <option value="completed">
                  Completed
                </option>
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Sort
              <select
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(
                    event.target
                      .value as ShootSortOrder,
                  )
                }
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-neutral-500"
              >
                <option value="date-ascending">
                  Nearest date
                </option>
                <option value="date-descending">
                  Latest date
                </option>
                <option value="recently-updated">
                  Recently updated
                </option>
              </select>
            </label>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="self-end rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {!isLoaded ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-8 text-center">
          <p className="text-neutral-400">
            Loading saved shoots...
          </p>
        </div>
      ) : plans.length === 0 ? (
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
      ) : filteredPlans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/40 p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-800 text-2xl">
            🔎
          </div>

          <h3 className="mt-4 font-semibold text-white">
            No matching shoots
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
            Try changing the search text or
            clearing the selected filters.
          </p>

          <button
            type="button"
            onClick={clearFilters}
            className="mt-5 rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredPlans.map((plan) => {
            const isCompleted =
              plan.status === "completed";

            const isExpanded =
              expandedShootId === plan.id;

            const isRefreshing =
              refreshingShootId === plan.id;

            const isEditing =
              editingShootId === plan.id;

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
                    {isEditing && (
                      <div className="rounded-xl border border-amber-900/60 bg-neutral-900 p-5 md:col-span-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
                            Edit shoot
                          </p>

                          <h4 className="mt-1 font-semibold text-white">
                            Update plan details
                          </h4>

                          <p className="mt-1 text-xs leading-5 text-neutral-500">
                            Put each shot-list and equipment item on a separate line.
                            Changing the date or location clears the saved weather,
                            so refresh it again afterwards.
                          </p>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          <label className="text-sm text-neutral-300">
                            Title
                            <input
                              type="text"
                              value={editForm.title}
                              onChange={(event) =>
                                updateEditField(
                                  "title",
                                  event.target.value,
                                )
                              }
                              className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
                            />
                          </label>

                          <label className="text-sm text-neutral-300">
                            Location
                            <input
                              type="text"
                              value={editForm.location}
                              onChange={(event) =>
                                updateEditField(
                                  "location",
                                  event.target.value,
                                )
                              }
                              className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
                            />
                          </label>

                          <label className="text-sm text-neutral-300">
                            Date
                            <input
                              type="date"
                              value={editForm.date}
                              onChange={(event) =>
                                updateEditField(
                                  "date",
                                  event.target.value,
                                )
                              }
                              className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
                            />
                          </label>

                          <label className="text-sm text-neutral-300">
                            Recommended time
                            <input
                              type="text"
                              value={
                                editForm.recommendedTime
                              }
                              onChange={(event) =>
                                updateEditField(
                                  "recommendedTime",
                                  event.target.value,
                                )
                              }
                              className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
                            />
                          </label>

                          <label className="text-sm text-neutral-300">
                            Shot list
                            <textarea
                              value={
                                editForm.shotListText
                              }
                              onChange={(event) =>
                                updateEditField(
                                  "shotListText",
                                  event.target.value,
                                )
                              }
                              rows={7}
                              className="mt-2 w-full resize-y rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
                            />
                          </label>

                          <label className="text-sm text-neutral-300">
                            Equipment
                            <textarea
                              value={
                                editForm.equipmentText
                              }
                              onChange={(event) =>
                                updateEditField(
                                  "equipmentText",
                                  event.target.value,
                                )
                              }
                              rows={7}
                              className="mt-2 w-full resize-y rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
                            />
                          </label>

                          <label className="text-sm text-neutral-300 md:col-span-2">
                            Preparation notes
                            <textarea
                              value={editForm.notes}
                              onChange={(event) =>
                                updateEditField(
                                  "notes",
                                  event.target.value,
                                )
                              }
                              rows={4}
                              className="mt-2 w-full resize-y rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-neutral-500"
                            />
                          </label>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              saveEditedShoot(plan)
                            }
                            disabled={
                              !editForm.title.trim() ||
                              !editForm.location.trim() ||
                              !editForm.date
                            }
                            className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Save changes
                          </button>

                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="rounded-xl border border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {plan.weather && (
                      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 md:col-span-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                            Saved weather
                          </p>

                          <h4 className="mt-1 font-semibold text-white">
                            Shoot conditions
                          </h4>

                          <p className="mt-1 text-xs text-neutral-500">
                            Forecast saved when this
                            shoot plan was created.
                          </p>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                          <div className="rounded-xl bg-neutral-950 p-4">
                            <p className="text-xs text-neutral-500">
                              Temperature
                            </p>

                            <p className="mt-2 font-medium text-neutral-200">
                              {formatTemperatureRange(
                                plan.weather,
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl bg-neutral-950 p-4">
                            <p className="text-xs text-neutral-500">
                              Rain
                            </p>

                            <p className="mt-2 font-medium text-neutral-200">
                              {formatWeatherMetric(
                                plan.weather
                                  .rainProbability,
                                plan.weather
                                  .rainProbabilityUnit ??
                                  "%",
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl bg-neutral-950 p-4">
                            <p className="text-xs text-neutral-500">
                              Wind
                            </p>

                            <p className="mt-2 font-medium text-neutral-200">
                              {formatWeatherMetric(
                                plan.weather
                                  .maximumWindSpeed,
                                plan.weather
                                  .windSpeedUnit ??
                                  "km/h",
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl bg-neutral-950 p-4">
                            <p className="text-xs text-neutral-500">
                              Wind gusts
                            </p>

                            <p className="mt-2 font-medium text-neutral-200">
                              {formatWeatherMetric(
                                plan.weather
                                  .maximumWindGusts,
                                plan.weather
                                  .windSpeedUnit ??
                                  "km/h",
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl bg-neutral-950 p-4">
                            <p className="text-xs text-neutral-500">
                              Golden hour
                            </p>

                            <p className="mt-2 font-medium text-neutral-200">
                              {formatGoldenHour(
                                plan.weather,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

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

                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-neutral-800 pt-5 sm:grid-cols-5">
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
                      isEditing
                        ? cancelEditing()
                        : beginEditing(plan)
                    }
                    className="rounded-xl border border-amber-900 px-3 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-950/40"
                  >
                    {isEditing
                      ? "Cancel edit"
                      : "Edit"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onRefreshWeather(plan.id)
                    }
                    disabled={isRefreshing}
                    className="rounded-xl border border-blue-900 px-3 py-2.5 text-sm font-medium text-blue-300 transition hover:bg-blue-950/50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isRefreshing
                      ? "Refreshing..."
                      : "Refresh weather"}
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