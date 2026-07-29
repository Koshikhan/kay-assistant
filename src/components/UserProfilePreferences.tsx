"use client";

import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  loadUserProfileFromDatabase,
  saveUserProfileToDatabase,
  type DefaultShootType,
  type ExperienceLevel,
  type PreferredShootTime,
  type UserProfileInput,
} from "@/lib/userProfileDatabase";

const DEFAULT_PROFILE: UserProfileInput = {
  displayName: "",
  experienceLevel: "beginner",
  defaultShootType: "mixed",
  preferredStyles: [],
  homeLocation: "",
  preferredShootTime: "any",
  planningNotes: "",
};

const STYLE_SUGGESTIONS = [
  "Cinematic",
  "Portrait",
  "Landscape",
  "Street",
  "Documentary",
  "Fashion",
  "Product",
  "Travel",
  "Nature",
  "Event",
];

function convertStylesToText(
  styles: string[],
): string {
  return styles.join(", ");
}

function convertTextToStyles(
  value: string,
): string[] {
  const uniqueStyles = new Map<
    string,
    string
  >();

  for (const part of value.split(",")) {
    const style = part.trim();

    if (!style) {
      continue;
    }

    uniqueStyles.set(
      style.toLowerCase(),
      style,
    );
  }

  return Array.from(
    uniqueStyles.values(),
  );
}

export function UserProfilePreferences() {
  const [profile, setProfile] =
    useState<UserProfileInput>(
      DEFAULT_PROFILE,
    );

  const [stylesText, setStylesText] =
    useState("");

  const [isLoaded, setIsLoaded] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState<
      "success" | "error" | ""
    >("");

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      try {
        setMessage("");
        setMessageType("");

        const savedProfile =
          await loadUserProfileFromDatabase();

        if (
          isActive &&
          savedProfile
        ) {
          const loadedProfile: UserProfileInput =
            {
              displayName:
                savedProfile.displayName,

              experienceLevel:
                savedProfile.experienceLevel,

              defaultShootType:
                savedProfile.defaultShootType,

              preferredStyles:
                savedProfile.preferredStyles,

              homeLocation:
                savedProfile.homeLocation,

              preferredShootTime:
                savedProfile.preferredShootTime,

              planningNotes:
                savedProfile.planningNotes,
            };

          setProfile(loadedProfile);

          setStylesText(
            convertStylesToText(
              loadedProfile.preferredStyles,
            ),
          );
        }
      } catch (error) {
        console.warn(
          "Profile loading failed:",
          error,
        );

        if (isActive) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Your profile could not be loaded.",
          );

          setMessageType("error");
        }
      } finally {
        if (isActive) {
          setIsLoaded(true);
        }
      }
    }

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, []);

  function updateField<
    Key extends keyof UserProfileInput,
  >(
    field: Key,
    value: UserProfileInput[Key],
  ) {
    setProfile((currentProfile) => ({
      ...currentProfile,
      [field]: value,
    }));

    if (messageType === "success") {
      setMessage("");
      setMessageType("");
    }
  }

  function addStyleSuggestion(
    style: string,
  ) {
    const currentStyles =
      convertTextToStyles(stylesText);

    const alreadyAdded =
      currentStyles.some(
        (currentStyle) =>
          currentStyle.toLowerCase() ===
          style.toLowerCase(),
      );

    if (alreadyAdded) {
      return;
    }

    const nextStyles = [
      ...currentStyles,
      style,
    ];

    setStylesText(
      convertStylesToText(
        nextStyles,
      ),
    );

    updateField(
      "preferredStyles",
      nextStyles,
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    try {
      setIsSaving(true);
      setMessage("");
      setMessageType("");

      const styles =
        convertTextToStyles(
          stylesText,
        );

      const savedProfile =
        await saveUserProfileToDatabase({
          ...profile,
          preferredStyles: styles,
        });

      setProfile({
        displayName:
          savedProfile.displayName,

        experienceLevel:
          savedProfile.experienceLevel,

        defaultShootType:
          savedProfile.defaultShootType,

        preferredStyles:
          savedProfile.preferredStyles,

        homeLocation:
          savedProfile.homeLocation,

        preferredShootTime:
          savedProfile.preferredShootTime,

        planningNotes:
          savedProfile.planningNotes,
      });

      setStylesText(
        convertStylesToText(
          savedProfile.preferredStyles,
        ),
      );

      setMessage(
        "Your profile and preferences were saved.",
      );

      setMessageType("success");
    } catch (error) {
      console.warn(
        "Profile saving failed:",
        error,
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Your profile could not be saved.",
      );

      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isLoaded) {
    return (
      <section className="h-64 min-w-0 animate-pulse rounded-3xl border border-neutral-800 bg-neutral-900 sm:h-72 lg:col-span-2" />
    );
  }

  return (
    <section className="min-w-0 rounded-3xl border border-neutral-800 bg-neutral-900 p-4 shadow-2xl sm:p-6 lg:col-span-2">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-500 sm:text-sm">
          Personalisation
        </p>

        <h2 className="mt-2 text-xl font-bold sm:text-2xl">
          Profile and Preferences
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
          Save how you normally work. Kay uses these
          preferences to personalise creative advice,
          location ideas and shoot plans.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-5 min-w-0 sm:mt-6"
      >
        <div className="grid min-w-0 gap-4 sm:gap-5 md:grid-cols-2">
          <label className="block min-w-0">
            <span className="text-sm font-medium text-neutral-300">
              Display name
            </span>

            <input
              type="text"
              value={profile.displayName}
              onChange={(event) =>
                updateField(
                  "displayName",
                  event.target.value,
                )
              }
              placeholder="Kay"
              autoComplete="name"
              className="mt-2 w-full min-w-0 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-500"
            />
          </label>

          <label className="block min-w-0">
            <span className="text-sm font-medium text-neutral-300">
              Experience level
            </span>

            <select
              value={
                profile.experienceLevel
              }
              onChange={(event) =>
                updateField(
                  "experienceLevel",
                  event.target
                    .value as ExperienceLevel,
                )
              }
              className="mt-2 w-full min-w-0 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-base text-white outline-none transition focus:border-neutral-500"
            >
              <option value="beginner">
                Beginner
              </option>

              <option value="intermediate">
                Intermediate
              </option>

              <option value="advanced">
                Advanced
              </option>

              <option value="professional">
                Professional
              </option>
            </select>
          </label>

          <label className="block min-w-0">
            <span className="text-sm font-medium text-neutral-300">
              Default shoot type
            </span>

            <select
              value={
                profile.defaultShootType
              }
              onChange={(event) =>
                updateField(
                  "defaultShootType",
                  event.target
                    .value as DefaultShootType,
                )
              }
              className="mt-2 w-full min-w-0 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-base text-white outline-none transition focus:border-neutral-500"
            >
              <option value="mixed">
                Mixed
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

          <label className="block min-w-0">
            <span className="text-sm font-medium text-neutral-300">
              Preferred shoot time
            </span>

            <select
              value={
                profile.preferredShootTime
              }
              onChange={(event) =>
                updateField(
                  "preferredShootTime",
                  event.target
                    .value as PreferredShootTime,
                )
              }
              className="mt-2 w-full min-w-0 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-base text-white outline-none transition focus:border-neutral-500"
            >
              <option value="any">
                No preference
              </option>

              <option value="morning">
                Morning
              </option>

              <option value="golden-hour">
                Golden hour
              </option>

              <option value="evening">
                Evening
              </option>

              <option value="night">
                Night
              </option>
            </select>
          </label>

          <label className="block min-w-0 md:col-span-2">
            <span className="text-sm font-medium text-neutral-300">
              Default or home location
            </span>

            <input
              type="text"
              value={profile.homeLocation}
              onChange={(event) =>
                updateField(
                  "homeLocation",
                  event.target.value,
                )
              }
              placeholder="London, UK"
              autoComplete="address-level2"
              className="mt-2 w-full min-w-0 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-500"
            />

            <span className="mt-2 block text-xs leading-5 text-neutral-500">
              Kay can use this as the starting area
              when you ask for nearby ideas without
              naming a place.
            </span>
          </label>

          <div className="min-w-0 md:col-span-2">
            <label className="block min-w-0">
              <span className="text-sm font-medium text-neutral-300">
                Preferred creative styles
              </span>

              <input
                type="text"
                value={stylesText}
                onChange={(event) => {
                  const value =
                    event.target.value;

                  setStylesText(value);

                  updateField(
                    "preferredStyles",
                    convertTextToStyles(
                      value,
                    ),
                  );
                }}
                placeholder="Cinematic, portrait, landscape"
                className="mt-2 w-full min-w-0 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-500"
              />
            </label>

            <p className="mt-2 text-xs leading-5 text-neutral-500">
              Separate custom styles with commas, or
              choose from the suggestions below.
            </p>

            <div className="mt-3 flex min-w-0 flex-wrap gap-2">
              {STYLE_SUGGESTIONS.map(
                (style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() =>
                      addStyleSuggestion(
                        style,
                      )
                    }
                    className="min-h-10 rounded-full border border-neutral-700 px-3 py-2 text-xs text-neutral-300 transition hover:bg-neutral-800 active:bg-neutral-700"
                  >
                    + {style}
                  </button>
                ),
              )}
            </div>
          </div>

          <label className="block min-w-0 md:col-span-2">
            <span className="text-sm font-medium text-neutral-300">
              Personal planning instructions
            </span>

            <textarea
              value={profile.planningNotes}
              onChange={(event) =>
                updateField(
                  "planningNotes",
                  event.target.value,
                )
              }
              rows={5}
              placeholder="For example: Prefer lightweight equipment, avoid very early shoots, and explain technical terms simply."
              className="mt-2 w-full min-w-0 resize-y rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-500"
            />
          </label>
        </div>

        {message && (
          <div
            className={`mt-5 break-words rounded-xl border p-4 text-sm leading-6 ${
              messageType === "success"
                ? "border-green-900 bg-green-950/40 text-green-300"
                : "border-red-900 bg-red-950/40 text-red-300"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mt-6 flex">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-auto sm:w-auto"
          >
            {isSaving
              ? "Saving preferences..."
              : "Save profile and preferences"}
          </button>
        </div>
      </form>
    </section>
  );
}