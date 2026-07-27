export type ShootType =
  | "photography"
  | "videography"
  | "drone";

export type ShootStatus =
  | "planned"
  | "completed";

export type ShootWeatherSummary = {
    minimumTemperature: number | null;
    maximumTemperature: number | null;
    rainProbability: number | null;
    maximumWindSpeed: number | null;
    maximumWindGusts: number | null;
    goldenHourStart: string | null;
    goldenHourEnd: string | null;
  
    temperatureUnit?: string;
    rainProbabilityUnit?: string;
    windSpeedUnit?: string;
  };

export type ShootPlan = {
  id: string;
  title: string;
  shootType: ShootType;
  location: string;
  date: string;
  recommendedTime: string;
  status: ShootStatus;
  shotList: string[];
  equipment: string[];

  // Items the user has completed or packed.
  completedShots?: string[];
  packedEquipment?: string[];

  notes: string;
  weather: ShootWeatherSummary | null;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY =
  "kay-assistant-shoot-plans";

/**
 * Confirms that the code is currently
 * running inside the browser.
 */
function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Performs a basic check before accepting
 * data read from localStorage.
 */
function isShootPlan(
  value: unknown,
): value is ShootPlan {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const plan = value as Partial<ShootPlan>;

  return (
    typeof plan.id === "string" &&
    typeof plan.title === "string" &&
    typeof plan.shootType === "string" &&
    typeof plan.location === "string" &&
    typeof plan.date === "string" &&
    typeof plan.recommendedTime === "string" &&
    typeof plan.status === "string" &&
    Array.isArray(plan.shotList) &&
    Array.isArray(plan.equipment)
  );
}

/**
 * Load all saved shoot plans.
 *
 * Older saved shoots may not contain
 * completedShots or packedEquipment,
 * so empty arrays are added automatically.
 */
export function loadShootPlans(): ShootPlan[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const savedData =
      window.localStorage.getItem(STORAGE_KEY);

    if (!savedData) {
      return [];
    }

    const parsedData: unknown =
      JSON.parse(savedData);

    if (!Array.isArray(parsedData)) {
      return [];
    }

    return parsedData
      .filter(isShootPlan)
      .map((plan) => ({
        ...plan,

        completedShots: Array.isArray(
          plan.completedShots,
        )
          ? plan.completedShots
          : [],

        packedEquipment: Array.isArray(
          plan.packedEquipment,
        )
          ? plan.packedEquipment
          : [],
      }));
  } catch (error) {
    console.error(
      "Could not load shoot plans:",
      error,
    );

    return [];
  }
}

/**
 * Save the complete shoot-plan list.
 */
export function saveShootPlans(
  plans: ShootPlan[],
): void {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(plans),
    );
  } catch (error) {
    console.error(
      "Could not save shoot plans:",
      error,
    );
  }
}

/**
 * Create a unique ID for a new shoot.
 */
export function createShootId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return [
    "shoot",
    Date.now(),
    Math.random().toString(36).slice(2),
  ].join("-");
}

/**
 * Add one new shoot plan.
 */
export function addShootPlan(
  plan: ShootPlan,
): ShootPlan[] {
  const currentPlans = loadShootPlans();

  const normalisedPlan: ShootPlan = {
    ...plan,
    completedShots:
      plan.completedShots ?? [],
    packedEquipment:
      plan.packedEquipment ?? [],
  };

  const updatedPlans = [
    ...currentPlans,
    normalisedPlan,
  ];

  saveShootPlans(updatedPlans);

  return updatedPlans;
}

/**
 * Replace an existing shoot plan.
 */
export function updateShootPlan(
  updatedPlan: ShootPlan,
): ShootPlan[] {
  const currentPlans = loadShootPlans();

  const updatedPlans = currentPlans.map(
    (plan) =>
      plan.id === updatedPlan.id
        ? {
            ...updatedPlan,

            completedShots:
              updatedPlan.completedShots ?? [],

            packedEquipment:
              updatedPlan.packedEquipment ?? [],

            updatedAt:
              new Date().toISOString(),
          }
        : plan,
  );

  saveShootPlans(updatedPlans);

  return updatedPlans;
}

/**
 * Delete one saved shoot.
 */
export function deleteShootPlan(
  shootId: string,
): ShootPlan[] {
  const currentPlans = loadShootPlans();

  const updatedPlans = currentPlans.filter(
    (plan) => plan.id !== shootId,
  );

  saveShootPlans(updatedPlans);

  return updatedPlans;
}