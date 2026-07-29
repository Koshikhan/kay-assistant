"use client";

import { useEffect, useState } from "react";

import { LocationMapLinks } from "@/components/LocationMapLinks";

import {
  loadEquipmentItemsFromDatabase,
  type EquipmentItem,
} from "@/lib/equipmentDatabase";

import {
  createShootId,
  type ShootPlan,
  type ShootType,
  type ShootWeatherSummary,
} from "@/lib/shootStorage";

import type {
  ShootWeatherForecast,
} from "@/lib/shootWeatherTool";

type EditShootForm = {
  title: string;
  location: string;
  date: string;
  recommendedTime: string;
  shotListText: string;
  equipmentText: string;
  notes: string;
};

type ManualShootForm = {
  title: string;
  shootType: ShootType;
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

type ShootViewMode =
  | "list"
  | "calendar";

function formatLibraryEquipment(
  item: EquipmentItem,
): string {
  const brandAndModel = [
    item.brand,
    item.model,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const label =
    brandAndModel &&
    brandAndModel.toLowerCase() !==
      item.name.trim().toLowerCase()
      ? `${item.name} — ${brandAndModel}`
      : item.name;

  return item.quantity > 1
    ? `${label} ×${item.quantity}`
    : label;
}

function mergeEquipmentLists(
  typedEquipment: string[],
  selectedEquipment: string[],
): string[] {
  const uniqueEquipment = new Map<
    string,
    string
  >();

  for (const item of [
    ...selectedEquipment,
    ...typedEquipment,
  ]) {
    const trimmedItem = item.trim();

    if (!trimmedItem) {
      continue;
    }

    uniqueEquipment.set(
      trimmedItem.toLowerCase(),
      trimmedItem,
    );
  }

  return Array.from(
    uniqueEquipment.values(),
  );
}

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

  onCreateShoot: (
    newPlan: ShootPlan,
  ) => void;

  onCheckManualWeather: (
    location: string,
    date: string,
  ) => Promise<ShootWeatherForecast>;

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

function formatCalendarMonth(
  date: Date,
): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function createDateKey(
  year: number,
  monthIndex: number,
  day: number,
): string {
  const month = String(
    monthIndex + 1,
  ).padStart(2, "0");

  const date = String(day).padStart(
    2,
    "0",
  );

  return `${year}-${month}-${date}`;
}

type ShootDateAlertKind =
  | "completed"
  | "overdue"
  | "today"
  | "tomorrow"
  | "soon"
  | "this-week"
  | "planned";

type ShootDateAlert = {
  kind: ShootDateAlertKind;
  label: string;
};

function getShootDateDifference(
  dateString: string,
): number | null {
  const [year, month, day] =
    dateString
      .split("-")
      .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }

  const today = new Date();

  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const shootUtc = Date.UTC(
    year,
    month - 1,
    day,
  );

  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  return Math.round(
    (shootUtc - todayUtc) /
      millisecondsPerDay,
  );
}

function getShootDateAlert(
  plan: ShootPlan,
): ShootDateAlert {
  if (plan.status === "completed") {
    return {
      kind: "completed",
      label: "Completed",
    };
  }

  const difference =
    getShootDateDifference(plan.date);

  if (difference === null) {
    return {
      kind: "planned",
      label: "Planned",
    };
  }

  if (difference < 0) {
    const overdueDays =
      Math.abs(difference);

    return {
      kind: "overdue",
      label:
        overdueDays === 1
          ? "Overdue by 1 day"
          : `Overdue by ${overdueDays} days`,
    };
  }

  if (difference === 0) {
    return {
      kind: "today",
      label: "Today",
    };
  }

  if (difference === 1) {
    return {
      kind: "tomorrow",
      label: "Tomorrow",
    };
  }

  if (difference <= 3) {
    return {
      kind: "soon",
      label: `In ${difference} days`,
    };
  }

  if (difference <= 7) {
    return {
      kind: "this-week",
      label: "This week",
    };
  }

  return {
    kind: "planned",
    label: "Planned",
  };
}

function buildManualWeatherSummary(
  forecast: ShootWeatherForecast,
  recommendedTime: string,
): ShootWeatherSummary {
  const description =
    recommendedTime.toLowerCase();

  const selectedGoldenHour =
    description.includes("morning") ||
    description.includes("sunrise")
      ? forecast.sunlight.morningGoldenHour
      : forecast.sunlight.eveningGoldenHour;

  return {
    minimumTemperature:
      forecast.dailySummary.minimumTemperature,
    maximumTemperature:
      forecast.dailySummary.maximumTemperature,
    rainProbability:
      forecast.dailySummary.maximumRainProbability,
    maximumWindSpeed:
      forecast.dailySummary.maximumWindSpeed,
    maximumWindGusts:
      forecast.dailySummary.maximumWindGusts,
    goldenHourStart:
      selectedGoldenHour.start,
    goldenHourEnd:
      selectedGoldenHour.end,
    temperatureUnit:
      forecast.dailySummary.units.temperature,
    rainProbabilityUnit:
      forecast.dailySummary.units.rainProbability,
    windSpeedUnit:
      forecast.dailySummary.units.windSpeed,
  };
}

function formatSunlightRange(
  start: string | null,
  end: string | null,
): string {
  if (start && end) {
    return `${start}–${end}`;
  }

  return start ?? end ?? "Not available";
}

function getDateAlertBadgeClass(
  kind: ShootDateAlertKind,
): string {
  switch (kind) {
    case "completed":
      return "bg-green-950 text-green-300";

    case "overdue":
      return "bg-red-950 text-red-300";

    case "today":
      return "bg-amber-950 text-amber-300";

    case "tomorrow":
      return "bg-orange-950 text-orange-300";

    case "soon":
    case "this-week":
      return "bg-violet-950 text-violet-300";

    default:
      return "bg-blue-950 text-blue-300";
  }
}

export function UpcomingShoots({
  plans,
  isLoaded,
  refreshingShootId,
  onToggleStatus,
  onDelete,
  onRefreshWeather,
  onUpdateShoot,
  onCreateShoot,
  onCheckManualWeather,
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

  const [
    isAddingManualShoot,
    setIsAddingManualShoot,
  ] = useState(false);

  const [
    isCheckingManualWeather,
    setIsCheckingManualWeather,
  ] = useState(false);

  const [
    manualWeatherForecast,
    setManualWeatherForecast,
  ] = useState<ShootWeatherForecast | null>(
    null,
  );

  const [manualFormMessage, setManualFormMessage] =
    useState("");

  const [
    equipmentLibraryItems,
    setEquipmentLibraryItems,
  ] = useState<EquipmentItem[]>([]);

  const [
    equipmentLibraryLoaded,
    setEquipmentLibraryLoaded,
  ] = useState(false);

  const [
    equipmentLibraryError,
    setEquipmentLibraryError,
  ] = useState("");

  const [
    selectedEquipmentIds,
    setSelectedEquipmentIds,
  ] = useState<string[]>([]);

  const [manualForm, setManualForm] =
    useState<ManualShootForm>({
      title: "",
      shootType: "photography",
      location: "",
      date: "",
      recommendedTime: "",
      shotListText: "",
      equipmentText: "",
      notes: "",
    });

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

  const [viewMode, setViewMode] =
    useState<ShootViewMode>("list");

  const [calendarMonth, setCalendarMonth] =
    useState(() => {
      const currentDate = new Date();

      return new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1,
      );
    });

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

  useEffect(() => {
    if (!isAddingManualShoot) {
      return;
    }

    let isActive = true;

    async function loadEquipmentLibrary() {
      try {
        setEquipmentLibraryLoaded(false);
        setEquipmentLibraryError("");

        const items =
          await loadEquipmentItemsFromDatabase();

        if (isActive) {
          setEquipmentLibraryItems(items);
        }
      } catch (error) {
        console.warn(
          "Manual equipment library loading failed:",
          error,
        );

        if (isActive) {
          setEquipmentLibraryError(
            error instanceof Error
              ? error.message
              : "Your equipment library could not be loaded.",
          );
        }
      } finally {
        if (isActive) {
          setEquipmentLibraryLoaded(true);
        }
      }
    }

    void loadEquipmentLibrary();

    return () => {
      isActive = false;
    };
  }, [isAddingManualShoot]);

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

  const manualWeatherSummary =
    manualWeatherForecast
      ? buildManualWeatherSummary(
          manualWeatherForecast,
          manualForm.recommendedTime,
        )
      : null;

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

  const calendarYear =
    calendarMonth.getFullYear();

  const calendarMonthIndex =
    calendarMonth.getMonth();

  const firstWeekday =
    new Date(
      calendarYear,
      calendarMonthIndex,
      1,
    ).getDay();

  const mondayFirstOffset =
    (firstWeekday + 6) % 7;

  const daysInCalendarMonth =
    new Date(
      calendarYear,
      calendarMonthIndex + 1,
      0,
    ).getDate();

  const calendarCellCount =
    Math.ceil(
      (
        mondayFirstOffset +
        daysInCalendarMonth
      ) / 7,
    ) * 7;

  const todayKey = createDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const plansByDate = new Map<
    string,
    ShootPlan[]
  >();

  for (const plan of filteredPlans) {
    const existingPlans =
      plansByDate.get(plan.date) ?? [];

    plansByDate.set(
      plan.date,
      [...existingPlans, plan],
    );
  }

  const calendarCells = Array.from(
    { length: calendarCellCount },
    (_, index) => {
      const day =
        index - mondayFirstOffset + 1;

      if (
        day < 1 ||
        day > daysInCalendarMonth
      ) {
        return {
          day: null,
          dateKey: null,
        };
      }

      return {
        day,
        dateKey: createDateKey(
          calendarYear,
          calendarMonthIndex,
          day,
        ),
      };
    },
  );

  function updateManualFormField(
    field: keyof ManualShootForm,
    value: string,
  ) {
    setManualForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    if (field === "location" || field === "date") {
      setManualWeatherForecast(null);
      setManualFormMessage("");
    }
  }

  function resetManualShootForm() {
    setManualForm({
      title: "",
      shootType: "photography",
      location: "",
      date: "",
      recommendedTime: "",
      shotListText: "",
      equipmentText: "",
      notes: "",
    });

    setManualWeatherForecast(null);
    setManualFormMessage("");
    setSelectedEquipmentIds([]);
    setEquipmentLibraryError("");
    setIsAddingManualShoot(false);
  }

  function toggleLibraryEquipment(
    equipmentId: string,
  ) {
    setSelectedEquipmentIds(
      (currentIds) =>
        currentIds.includes(equipmentId)
          ? currentIds.filter(
              (id) => id !== equipmentId,
            )
          : [
              ...currentIds,
              equipmentId,
            ],
    );
  }

  async function refreshManualEquipmentLibrary() {
    try {
      setEquipmentLibraryLoaded(false);
      setEquipmentLibraryError("");

      const items =
        await loadEquipmentItemsFromDatabase();

      setEquipmentLibraryItems(items);

      const availableIds = new Set(
        items
          .filter(
            (item) =>
              item.status === "available",
          )
          .map((item) => item.id),
      );

      setSelectedEquipmentIds(
        (currentIds) =>
          currentIds.filter((id) =>
            availableIds.has(id),
          ),
      );
    } catch (error) {
      console.warn(
        "Manual equipment library refresh failed:",
        error,
      );

      setEquipmentLibraryError(
        error instanceof Error
          ? error.message
          : "Your equipment library could not be refreshed.",
      );
    } finally {
      setEquipmentLibraryLoaded(true);
    }
  }

  async function checkManualShootWeather() {
    const location = manualForm.location.trim();
    const date = manualForm.date;

    if (!location || !date) {
      setManualFormMessage(
        "Enter a location and date first.",
      );
      return;
    }

    try {
      setIsCheckingManualWeather(true);
      setManualFormMessage("");

      const forecast =
        await onCheckManualWeather(
          location,
          date,
        );

      setManualWeatherForecast(forecast);
      setManualFormMessage(
        "Weather checked. It will be saved with the shoot.",
      );
    } catch (error) {
      setManualWeatherForecast(null);
      setManualFormMessage(
        error instanceof Error
          ? error.message
          : "The weather could not be checked.",
      );
    } finally {
      setIsCheckingManualWeather(false);
    }
  }

  function createManualShoot() {
    const title = manualForm.title.trim();
    const location = manualForm.location.trim();
    const date = manualForm.date;

    if (!title || !location || !date) {
      setManualFormMessage(
        "Title, location and date are required.",
      );
      return;
    }

    const shotList = manualForm.shotListText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const typedEquipment =
      manualForm.equipmentText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);

    const selectedEquipment =
      equipmentLibraryItems
        .filter(
          (item) =>
            selectedEquipmentIds.includes(
              item.id,
            ) &&
            item.status === "available",
        )
        .map(formatLibraryEquipment);

    const equipment =
      mergeEquipmentLists(
        typedEquipment,
        selectedEquipment,
      );

    const now = new Date().toISOString();

    onCreateShoot({
      id: createShootId(),
      title,
      shootType: manualForm.shootType,
      location,
      date,
      recommendedTime:
        manualForm.recommendedTime.trim(),
      status: "planned",
      shotList,
      equipment,
      completedShots: [],
      packedEquipment: [],
      notes: manualForm.notes.trim(),
      weather: manualWeatherSummary,
      createdAt: now,
      updatedAt: now,
    });

    resetManualShootForm();
  }

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

  function showPreviousMonth() {
    setCalendarMonth((currentMonth) =>
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        1,
      ),
    );
  }

  function showNextMonth() {
    setCalendarMonth((currentMonth) =>
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1,
      ),
    );
  }

  function showCurrentMonth() {
    const currentDate = new Date();

    setCalendarMonth(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1,
      ),
    );
  }

  function openShootFromCalendar(
    shootId: string,
  ) {
    setViewMode("list");
    setExpandedShootId(shootId);
    setEditingShootId(null);
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
    <section className="min-w-0 rounded-3xl border border-neutral-800 bg-neutral-900 p-4 shadow-2xl sm:p-6 lg:col-span-2">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Shoot planner
        </p>

        <div className="mt-2 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <div className="w-full rounded-full bg-neutral-800 px-4 py-2 text-center text-sm text-neutral-300 sm:w-auto">
                {filteredPlans.length} of{" "}
                {plans.length}{" "}
                {plans.length === 1
                  ? "shoot"
                  : "shoots"}
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsAddingManualShoot(
                    (currentValue) =>
                      !currentValue,
                  );
                  setManualFormMessage("");
                }}
                className="w-full rounded-xl border border-blue-900 px-4 py-3 text-sm font-medium text-blue-300 transition hover:bg-blue-950/50 sm:w-auto sm:py-2"
              >
                {isAddingManualShoot
                  ? "Close manual form"
                  : "Add shoot manually"}
              </button>

              <div className="flex w-full rounded-xl border border-neutral-700 bg-neutral-950 p-1 sm:w-auto">
                <button
                  type="button"
                  onClick={() =>
                    setViewMode("list")
                  }
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-none ${
                    viewMode === "list"
                      ? "bg-white text-black"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  List
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setViewMode("calendar")
                  }
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-none ${
                    viewMode === "calendar"
                      ? "bg-white text-black"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Calendar
                </button>
              </div>
            </div>
          )}
        </div>

        {isAddingManualShoot && (
          <div className="mt-5 min-w-0 rounded-2xl border border-blue-900/60 bg-neutral-950/60 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
              Manual shoot
            </p>

            <h3 className="mt-1 text-xl font-semibold text-white">
              Create a shoot without AI
            </h3>

            <p className="mt-2 text-sm text-neutral-500">
              Put each shot-list and equipment item on a separate line.
              Weather checking is optional.
            </p>

            <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
              <label className="text-sm text-neutral-300">
                Title
                <input
                  type="text"
                  value={manualForm.title}
                  onChange={(event) =>
                    updateManualFormField(
                      "title",
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-neutral-500"
                />
              </label>

              <label className="text-sm text-neutral-300">
                Shoot type
                <select
                  value={manualForm.shootType}
                  onChange={(event) =>
                    updateManualFormField(
                      "shootType",
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-neutral-500"
                >
                  <option value="photography">Photography</option>
                  <option value="videography">Videography</option>
                  <option value="drone">Drone</option>
                </select>
              </label>

              <label className="text-sm text-neutral-300">
                Location
                <input
                  type="text"
                  value={manualForm.location}
                  onChange={(event) =>
                    updateManualFormField(
                      "location",
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-neutral-500"
                />
              </label>

              <label className="text-sm text-neutral-300">
                Date
                <input
                  type="date"
                  value={manualForm.date}
                  onChange={(event) =>
                    updateManualFormField(
                      "date",
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-neutral-500"
                />
              </label>

              <label className="text-sm text-neutral-300 md:col-span-2">
                Recommended time
                <input
                  type="text"
                  value={manualForm.recommendedTime}
                  onChange={(event) =>
                    updateManualFormField(
                      "recommendedTime",
                      event.target.value,
                    )
                  }
                  placeholder="Evening golden hour"
                  className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                />
              </label>

              <label className="text-sm text-neutral-300">
                Shot list
                <textarea
                  value={manualForm.shotListText}
                  onChange={(event) =>
                    updateManualFormField(
                      "shotListText",
                      event.target.value,
                    )
                  }
                  rows={6}
                  className="mt-2 w-full resize-y rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-neutral-500"
                />
              </label>

              <div className="text-sm text-neutral-300">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>Equipment</span>

                  <button
                    type="button"
                    onClick={() =>
                      void refreshManualEquipmentLibrary()
                    }
                    disabled={
                      !equipmentLibraryLoaded
                    }
                    className="w-fit rounded-lg border border-blue-900 px-3 py-2 text-xs font-medium text-blue-300 transition hover:bg-blue-950/40 hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Refresh library
                  </button>
                </div>

                <div className="mt-2 rounded-xl border border-neutral-700 bg-neutral-900 p-3">
                  {!equipmentLibraryLoaded ? (
                    <p className="py-4 text-center text-xs text-neutral-500">
                      Loading your equipment library...
                    </p>
                  ) : equipmentLibraryError ? (
                    <p className="py-3 text-xs text-red-300">
                      {equipmentLibraryError}
                    </p>
                  ) : equipmentLibraryItems.length ===
                    0 ? (
                    <p className="py-4 text-center text-xs leading-5 text-neutral-500">
                      Your equipment library is empty.
                      Add equipment above, then refresh
                      this list.
                    </p>
                  ) : (
                    <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                      {equipmentLibraryItems.map(
                        (item) => {
                          const isAvailable =
                            item.status ===
                            "available";

                          const isSelected =
                            selectedEquipmentIds.includes(
                              item.id,
                            );

                          return (
                            <label
                              key={item.id}
                              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
                                isAvailable
                                  ? "cursor-pointer border-neutral-800 hover:bg-neutral-800/70"
                                  : "cursor-not-allowed border-neutral-800/70 opacity-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  isSelected
                                }
                                disabled={
                                  !isAvailable
                                }
                                onChange={() =>
                                  toggleLibraryEquipment(
                                    item.id,
                                  )
                                }
                                className="mt-1 h-4 w-4 accent-white"
                              />

                              <span className="min-w-0 flex-1">
                                <span className="block break-words text-sm leading-5 text-neutral-200">
                                  {formatLibraryEquipment(
                                    item,
                                  )}
                                </span>

                                <span className="mt-0.5 block text-xs capitalize text-neutral-500">
                                  {item.category}
                                  {" · "}
                                  {item.status}
                                </span>
                              </span>
                            </label>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>

                <p className="mt-2 text-xs text-neutral-500">
                  {
                    selectedEquipmentIds
                      .length
                  }{" "}
                  library item
                  {selectedEquipmentIds.length ===
                  1
                    ? ""
                    : "s"}{" "}
                  selected
                </p>

                <label className="mt-3 block">
                  <span className="text-xs text-neutral-500">
                    Additional or rented equipment
                    — one item per line
                  </span>

                  <textarea
                    value={
                      manualForm.equipmentText
                    }
                    onChange={(event) =>
                      updateManualFormField(
                        "equipmentText",
                        event.target.value,
                      )
                    }
                    rows={4}
                    placeholder={
                      "Rental gimbal\nExtra memory cards"
                    }
                    className="mt-2 w-full resize-y rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                  />
                </label>
              </div>

              <label className="text-sm text-neutral-300 md:col-span-2">
                Preparation notes
                <textarea
                  value={manualForm.notes}
                  onChange={(event) =>
                    updateManualFormField(
                      "notes",
                      event.target.value,
                    )
                  }
                  rows={4}
                  className="mt-2 w-full resize-y rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-neutral-500"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={checkManualShootWeather}
                disabled={
                  isCheckingManualWeather ||
                  !manualForm.location.trim() ||
                  !manualForm.date
                }
                className="rounded-xl border border-blue-900 px-5 py-2.5 text-sm font-medium text-blue-300 transition hover:bg-blue-950/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isCheckingManualWeather
                  ? "Checking weather..."
                  : manualWeatherForecast
                    ? "Check weather again"
                    : "Check weather"}
              </button>

              <button
                type="button"
                onClick={createManualShoot}
                disabled={
                  !manualForm.title.trim() ||
                  !manualForm.location.trim() ||
                  !manualForm.date
                }
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Create shoot
              </button>

              <button
                type="button"
                onClick={resetManualShootForm}
                className="rounded-xl border border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>

            {manualFormMessage && (
              <p className="mt-4 text-sm text-neutral-400">
                {manualFormMessage}
              </p>
            )}

            {manualWeatherForecast && manualWeatherSummary && (
              <div className="mt-5 min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Weather preview
                </p>

                <h4 className="mt-1 font-semibold text-white">
                  {manualWeatherForecast.location.name}
                </h4>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
                  <div className="rounded-xl bg-neutral-950 p-4">
                    <p className="text-xs text-neutral-500">Temperature</p>
                    <p className="mt-2 text-neutral-200">
                      {formatTemperatureRange(manualWeatherSummary)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-neutral-950 p-4">
                    <p className="text-xs text-neutral-500">Rain</p>
                    <p className="mt-2 text-neutral-200">
                      {formatWeatherMetric(
                        manualWeatherSummary.rainProbability,
                        manualWeatherSummary.rainProbabilityUnit ?? "%",
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-neutral-950 p-4">
                    <p className="text-xs text-neutral-500">Wind</p>
                    <p className="mt-2 text-neutral-200">
                      {formatWeatherMetric(
                        manualWeatherSummary.maximumWindSpeed,
                        manualWeatherSummary.windSpeedUnit ?? "km/h",
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-neutral-950 p-4">
                    <p className="text-xs text-neutral-500">Wind gusts</p>
                    <p className="mt-2 text-neutral-200">
                      {formatWeatherMetric(
                        manualWeatherSummary.maximumWindGusts,
                        manualWeatherSummary.windSpeedUnit ?? "km/h",
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-neutral-950 p-4">
                    <p className="text-xs text-neutral-500">Morning golden hour</p>
                    <p className="mt-2 text-neutral-200">
                      {formatSunlightRange(
                        manualWeatherForecast.sunlight.morningGoldenHour.start,
                        manualWeatherForecast.sunlight.morningGoldenHour.end,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-neutral-950 p-4">
                    <p className="text-xs text-neutral-500">Evening golden hour</p>
                    <p className="mt-2 text-neutral-200">
                      {formatSunlightRange(
                        manualWeatherForecast.sunlight.eveningGoldenHour.start,
                        manualWeatherForecast.sunlight.eveningGoldenHour.end,
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {plans.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
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
          <div className="mt-5 grid min-w-0 gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/50 p-3 sm:p-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))_auto]">
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
                className="mt-2 w-full min-w-0 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-base normal-case tracking-normal text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500 sm:text-sm"
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
              className="w-full self-end rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {!isLoaded ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6 text-center sm:p-8">
          <p className="text-neutral-400">
            Loading saved shoots...
          </p>
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/40 p-6 text-center sm:p-10">
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
        <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/40 p-6 text-center sm:p-10">
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
            className="mt-5 w-full rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800 sm:w-auto sm:py-2.5"
          >
            Clear filters
          </button>
        </div>
      ) : viewMode === "calendar" ? (
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/50">
          <div className="flex flex-col gap-4 border-b border-neutral-800 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Calendar view
              </p>

              <h3 className="mt-1 text-xl font-semibold text-white">
                {formatCalendarMonth(
                  calendarMonth,
                )}
              </h3>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              <button
                type="button"
                onClick={showPreviousMonth}
                className="rounded-xl border border-neutral-700 px-2 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800 sm:px-4 sm:py-2"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={showCurrentMonth}
                className="rounded-xl border border-neutral-700 px-2 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800 sm:px-4 sm:py-2"
              >
                Today
              </button>

              <button
                type="button"
                onClick={showNextMonth}
                className="rounded-xl border border-neutral-700 px-2 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800 sm:px-4 sm:py-2"
              >
                Next
              </button>
            </div>
          </div>

          <div className="overflow-x-auto overscroll-x-contain">
          <div className="min-w-[720px] sm:min-w-[900px]">
              <div className="grid grid-cols-7 border-b border-neutral-800 bg-neutral-900">
                {[
                  "Mon",
                  "Tue",
                  "Wed",
                  "Thu",
                  "Fri",
                  "Sat",
                  "Sun",
                ].map((weekday) => (
                  <div
                    key={weekday}
                    className="border-r border-neutral-800 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500 last:border-r-0"
                  >
                    {weekday}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarCells.map(
                  (calendarCell, index) => {
                    const datePlans =
                      calendarCell.dateKey
                        ? plansByDate.get(
                            calendarCell.dateKey,
                          ) ?? []
                        : [];

                    const isToday =
                      calendarCell.dateKey ===
                      todayKey;

                    return (
                      <div
                        key={`${calendarYear}-${calendarMonthIndex}-${index}`}
                        className={`min-h-28 border-b border-r border-neutral-800 p-2 sm:min-h-36 ${
                          calendarCell.day
                            ? "bg-neutral-950/40"
                            : "bg-neutral-950/80"
                        } ${
                          index % 7 === 6
                            ? "border-r-0"
                            : ""
                        }`}
                      >
                        {calendarCell.day && (
                          <>
                            <div className="mb-2 flex items-center justify-between">
                              <span
                                className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm ${
                                  isToday
                                    ? "bg-white font-semibold text-black"
                                    : "text-neutral-400"
                                }`}
                              >
                                {calendarCell.day}
                              </span>

                              {datePlans.length > 0 && (
                                <span className="text-xs text-neutral-600">
                                  {datePlans.length}
                                </span>
                              )}
                            </div>

                            <div className="space-y-2">
                              {datePlans.map(
                                (plan) => {
                                  const dateAlert =
                                    getShootDateAlert(
                                      plan,
                                    );

                                  const calendarClass =
                                    dateAlert.kind ===
                                    "completed"
                                      ? "border-green-950 bg-green-950/20 opacity-70"
                                      : dateAlert.kind ===
                                          "overdue"
                                        ? "border-red-900 bg-red-950/20"
                                        : dateAlert.kind ===
                                            "today"
                                          ? "border-amber-800 bg-amber-950/20"
                                          : "border-neutral-700 bg-neutral-900";

                                  return (
                                    <button
                                      key={plan.id}
                                      type="button"
                                      onClick={() =>
                                        openShootFromCalendar(
                                          plan.id,
                                        )
                                      }
                                      title={`${plan.title} — ${plan.location} — ${dateAlert.label}`}
                                      className={`w-full rounded-lg border p-2 text-left transition hover:border-neutral-500 ${calendarClass}`}
                                    >
                                      <div className="flex items-start gap-2">
                                        <span className="shrink-0">
                                          {getShootTypeIcon(
                                            plan.shootType,
                                          )}
                                        </span>

                                        <span className="min-w-0">
                                          <span
                                            className={`block truncate text-xs font-medium ${
                                              dateAlert.kind ===
                                              "completed"
                                                ? "text-neutral-500 line-through"
                                                : "text-neutral-200"
                                            }`}
                                          >
                                            {plan.title}
                                          </span>

                                          <span className="mt-1 block truncate text-[11px] text-neutral-600">
                                            {plan.location}
                                          </span>

                                          <span
                                            className={`mt-1 block truncate text-[10px] font-medium ${
                                              dateAlert.kind ===
                                              "overdue"
                                                ? "text-red-400"
                                                : dateAlert.kind ===
                                                    "today"
                                                  ? "text-amber-400"
                                                  : "text-neutral-500"
                                            }`}
                                          >
                                            {
                                              dateAlert.label
                                            }
                                          </span>
                                        </span>
                                      </div>
                                    </button>
                                  );
                                },
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          </div>

          <p className="border-t border-neutral-800 px-4 py-3 text-xs leading-5 text-neutral-500">
    Swipe horizontally to explore the calendar.
  Results follow the active search and filters.
  Select a shoot to open it in list view.
</p>
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

            const dateAlert =
              getShootDateAlert(plan);

            const isOverdue =
              dateAlert.kind === "overdue";

            const isToday =
              dateAlert.kind === "today";

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
                    : isOverdue
                      ? "border-red-900 bg-red-950/15"
                      : isToday
                        ? "border-amber-800 bg-amber-950/10"
                        : "border-neutral-700 bg-neutral-950/70"
                } ${
                  isExpanded
                    ? "md:col-span-2"
                    : ""
                }`}
              >
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                        className={`mt-1 break-words font-semibold ${
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
                    className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-medium ${getDateAlertBadgeClass(
                      dateAlert.kind,
                    )}`}
                  >
                    {dateAlert.label}
                  </span>
                </div>

                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-neutral-500">
                      Date
                    </span>

                    <span className="text-left text-neutral-200 sm:text-right">
                      {formatShootDate(
                        plan.date,
                      )}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <span className="shrink-0 text-neutral-500">
                      Location
                    </span>

                    <div className="min-w-0 text-left sm:text-right">
                      <span className="block break-words text-neutral-200">
                        {plan.location}
                      </span>

                      <LocationMapLinks
                        location={
                          plan.location
                        }
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <span className="shrink-0 text-neutral-500">
                      Recommended time
                    </span>

                    <span className="break-words text-left text-neutral-200 sm:text-right">
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
                  <div className="mt-6 grid min-w-0 gap-5 border-t border-neutral-800 pt-6 sm:gap-6 md:grid-cols-2">
                    {isEditing && (
                      <div className="min-w-0 rounded-xl border border-amber-900/60 bg-neutral-900 p-4 sm:p-5 md:col-span-2">
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

                        <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
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

                        <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
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
                      <div className="min-w-0 rounded-xl border border-neutral-800 bg-neutral-900 p-4 sm:p-5 md:col-span-2">
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

                        <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
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
                                className="flex min-w-0 w-full items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-left transition hover:border-neutral-700"
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
                                      ? "break-words text-neutral-500 line-through"
                                      : "break-words text-neutral-200"
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