"use client";
import { LogoutButton } from "@/components/LogoutButton";
import { LocationDetailsCard } from "@/components/LocationDetailsCard";
import { EquipmentLibrary } from "@/components/EquipmentLibrary";
import { UserProfilePreferences } from "@/components/UserProfilePreferences";
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  RealtimeAgent,
  RealtimeSession,
  type RealtimeItem,
} from "@openai/agents/realtime";

import { ShootWeatherCard } from "@/components/ShootWeatherCard";
import { UpcomingShoots } from "@/components/UpcomingShoots";

import { createShootPlanTool } from "@/lib/shootPlanTool";

import { createEquipmentLibraryTool } from "@/lib/equipmentLibraryTool";
import { tool } from "@openai/agents";
import { z } from "zod";

import {
  loadUserProfileFromDatabase,
} from "@/lib/userProfileDatabase";

export function createUserProfileTool() {
  return tool({
    name: "get_user_profile",

    description: `
      Read the currently logged-in user's saved profile
      and creative preferences.

      Use this tool before:
      - Creating or saving a shoot plan
      - Giving personalised photography, video or drone advice
      - Recommending nearby locations
      - Choosing a creative style
      - Choosing a preferred shoot time
      - Answering questions about saved preferences

      The user's current request always overrides
      the saved preferences.

      This tool is read-only.
      It cannot edit the profile.
    `,

    parameters: z.object({}),

    async execute() {
      try {
        const profile =
          await loadUserProfileFromDatabase();

        if (!profile) {
          return JSON.stringify({
            success: true,
            hasProfile: false,
            message:
              "The user has not saved a profile yet.",
          });
        }

        return JSON.stringify({
          success: true,
          hasProfile: true,

          profile: {
            displayName:
              profile.displayName,

            experienceLevel:
              profile.experienceLevel,

            defaultShootType:
              profile.defaultShootType,

            preferredStyles:
              profile.preferredStyles,

            homeLocation:
              profile.homeLocation,

            preferredShootTime:
              profile.preferredShootTime,

            planningNotes:
              profile.planningNotes,
          },

          guidance: {
            explicitRequestWins:
              "The current request overrides saved defaults.",

            experienceLevel:
              "Adjust technical explanations to the user's level.",

            defaultShootType:
              "Use only when the user has not chosen a shoot type.",

            preferredStyles:
              "Use these styles for concepts and shot lists.",

            homeLocation:
              "Use this for nearby recommendations when no location is given.",

            preferredShootTime:
              "Prefer this time when practical.",

            planningNotes:
              "Follow these personal instructions when relevant.",
          },
        });
      } catch (error) {
        console.error(
          "User profile tool error:",
          error,
        );

        return JSON.stringify({
          success: false,

          error:
            error instanceof Error
              ? error.message
              : "The user profile could not be loaded.",
        });
      }
    },
  });
}

import {
  createLocationDetailsTool,
} from "@/lib/locationDetailsTool";

import type {
  LocationDetails,
} from "@/lib/locationDetails";


import {
  createShootPlanInDatabase,
  deleteShootPlanFromDatabase,
  loadShootPlansFromDatabase,
  updateShootPlanInDatabase,
} from "@/lib/shootDatabase";

import {
  type ShootPlan,
  type ShootWeatherSummary,
} from "@/lib/shootStorage";

import {
  createShootWeatherTool,
  fetchShootWeather,
  type ShootWeatherForecast,
} from "@/lib/shootWeatherTool";

type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

type TokenResponse = {
  clientSecret?: string;
  error?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  isComplete: boolean;
};

/**
 * Convert the Realtime SDK history into messages
 * that can be displayed in the interface.
 */
function convertHistoryToMessages(
  history: RealtimeItem[],
): ChatMessage[] {
  return history.flatMap((item) => {
    if (item.type !== "message") {
      return [];
    }

    if (
      item.role !== "user" &&
      item.role !== "assistant"
    ) {
      return [];
    }

    const text = item.content
      .map((part) => {
        if (
          "text" in part &&
          typeof part.text === "string"
        ) {
          return part.text;
        }

        if (
          "transcript" in part &&
          typeof part.transcript === "string"
        ) {
          return part.transcript;
        }

        return "";
      })
      .join("")
      .trim();

    if (!text) {
      return [];
    }

    return [
      {
        id: item.itemId,
        role: item.role,
        text,
        isComplete: item.status === "completed",
      },
    ];
  });
}

/**
 * Return the current date using the user's
 * local timezone rather than UTC.
 */
function getLocalDateString(): string {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(now.getDate()).padStart(
    2,
    "0",
  );

  return `${year}-${month}-${day}`;
}

/**
 * Convert the complete forecast into the smaller
 * weather summary saved with each shoot plan.
 */
function buildWeatherSummary(
  forecast: ShootWeatherForecast,
  recommendedTime: string,
): ShootWeatherSummary {
  const timeDescription =
    recommendedTime.toLowerCase();

  const prefersMorning =
    timeDescription.includes("morning") ||
    timeDescription.includes("sunrise");

  const prefersEvening =
    timeDescription.includes("evening") ||
    timeDescription.includes("sunset");

  const selectedGoldenHour =
    prefersMorning
      ? forecast.sunlight.morningGoldenHour
      : prefersEvening
        ? forecast.sunlight.eveningGoldenHour
        : forecast.sunlight.eveningGoldenHour.start
          ? forecast.sunlight.eveningGoldenHour
          : forecast.sunlight.morningGoldenHour;

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
      forecast.dailySummary.units
        .rainProbability,

    windSpeedUnit:
      forecast.dailySummary.units.windSpeed,
  };
}

export default function Home() {
  const sessionRef =
    useRef<RealtimeSession | null>(null);

  const latestForecastRef =
    useRef<ShootWeatherForecast | null>(null);

  const transcriptContainerRef =
    useRef<HTMLDivElement | null>(null);

  const [status, setStatus] =
    useState<ConnectionStatus>("disconnected");

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [textInput, setTextInput] = useState("");

  const [isMuted, setIsMuted] = useState(false);

  const [
    isAssistantSpeaking,
    setIsAssistantSpeaking,
  ] = useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [latestForecast, setLatestForecast] =
    useState<ShootWeatherForecast | null>(null);

  const [
    latestLocationDetails,
    setLatestLocationDetails,
  ] = useState<LocationDetails[]>([]);

  const [shootPlans, setShootPlans] =
    useState<ShootPlan[]>([]);

  const [shootPlansLoaded, setShootPlansLoaded] =
    useState(false);

  const [
    refreshingShootId,
    setRefreshingShootId,
  ] = useState<string | null>(null);

  /**
   * Scroll to the newest conversation message.
   */
  useEffect(() => {
    const transcriptContainer =
      transcriptContainerRef.current;

    if (!transcriptContainer) {
      return;
    }

    transcriptContainer.scrollTo({
      top: transcriptContainer.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  /**
   * Close the Realtime connection when the
   * user leaves the page.
   */
  useEffect(() => {
    return () => {
      sessionRef.current?.close();
    };
  }, []);

  /**
   * Load the logged-in user's shoot plans from
   * Supabase when the page first opens.
   */
  useEffect(() => {
    let isActive = true;

    async function loadDatabasePlans() {
      try {
        setErrorMessage("");

        const databasePlans =
          await loadShootPlansFromDatabase();

        if (isActive) {
          setShootPlans(databasePlans);
        }
      } catch (error) {
        console.warn(
          "Database shoot loading failed:",
          error,
        );

        if (isActive) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Shoot plans could not be loaded from the database.",
          );
        }
      } finally {
        if (isActive) {
          setShootPlansLoaded(true);
        }
      }
    }

    void loadDatabasePlans();

    return () => {
      isActive = false;
    };
  }, []);

  async function startConversation() {
    if (
      status === "connecting" ||
      status === "connected"
    ) {
      return;
    }

    try {
      setStatus("connecting");
      setErrorMessage("");
      setMessages([]);
      setTextInput("");
      setLatestForecast(null);
      setLatestLocationDetails([]);
      latestForecastRef.current = null;

      const tokenResponse = await fetch(
        "/api/realtime-token",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const tokenData =
        (await tokenResponse.json()) as TokenResponse;

      if (
        !tokenResponse.ok ||
        !tokenData.clientSecret
      ) {
        throw new Error(
          tokenData.error ??
            "The temporary voice token could not be created.",
        );
      }

      const currentDate = getLocalDateString();

      const shootWeatherTool =
        createShootWeatherTool((forecast) => {
          latestForecastRef.current =
            forecast;

          setLatestForecast(forecast);
        });

      const equipmentLibraryTool =
        createEquipmentLibraryTool();

        const userProfileTool =
          createUserProfileTool();

      const locationDetailsTool =
        createLocationDetailsTool(
          (locations) => {
            setLatestLocationDetails(
              locations,
            );
          },
        );

      const shootPlanTool =
        createShootPlanTool(
          (newPlan) => {
            setShootPlans((currentPlans) => [
              ...currentPlans.filter(
                (plan) => plan.id !== newPlan.id,
              ),
              newPlan,
            ]);
          },

          (recommendedTime) => {
            const forecast =
              latestForecastRef.current;

            if (!forecast) {
              return null;
            }

            return buildWeatherSummary(
              forecast,
              recommendedTime,
            );
          },
        );

      const agent = new RealtimeAgent({
        name: "Kay Assistant",

        tools: [
          userProfileTool,
          locationDetailsTool,
          shootWeatherTool,
          equipmentLibraryTool,
          shootPlanTool,
        ],

        instructions: `
          You are Kay Assistant, a friendly personal AI assistant.

          Today's local date is ${currentDate}.

          Your main areas are:
          - Photography
          - Videography
          - Drone filming
          - Content planning
          - Equipment organisation
          - Daily productivity

          Speak naturally and clearly.
          Keep spoken answers reasonably short.
          Ask only one question at a time when clarification
          is required.
          REQUEST CLASSIFICATION RULES

Before calling any tool, identify the user's main request.

There are three separate request types:

1. PLACE RECOMMENDATION
The user wants suggestions for places inside a broad
region, county, city or country.

Examples:
- Find me a nice place in Cornwall.
- Recommend a beach in Devon.
- Where should I take photos in Scotland?
- Find a drone location near London.

For this request type:
- Do not call get_shoot_weather.
- Do not ask for a specific town or landmark.
- Treat the broad area as the search area.
- Recommend 3 to 5 named places within that area.
- Briefly explain what each place is suitable for.
- Ask one preference question only when it would
  meaningfully improve the recommendations.

2. WEATHER REQUEST
The user explicitly asks about weather, rain, wind,
temperature, visibility, sunrise, sunset or golden hour.

For this request type:
- Call get_shoot_weather only when a sufficiently
  specific location is known.
- If only a broad region is provided, ask the user
  to select a specific town, beach or landmark.

3. SHOOT PLAN REQUEST
The user clearly asks to create, save or schedule
a shoot plan.

For this request type:
- Gather the required shoot details.
- Check weather when relevant.
- Then call create_shoot_plan.

Never automatically turn a place-recommendation request
into a weather request.
Never say that you are checking the forecast unless the
user asked about weather, timing or requested a shoot plan.

          PLACE RECOMMENDATION RULES

When the user asks you to find or recommend a place
inside a broad area, such as Cornwall, London,
Scotland or Devon, treat the broad area as a valid
search area.

Do not immediately ask the user to provide a town
or exact location.

Recommend 3 to 5 specific places within the area.
For each place, briefly explain why it is suitable.

When relevant, consider:
- Photography
- Videography
- Drone filming
- Coastlines
- Beaches
- Cliffs
- Villages
- Architecture
- Sunrise or sunset

If the request is too broad, ask only one useful
preference question, such as whether the user wants:
- A beach
- Cliffs
- A village
- A sunset location
- A drone location

You may provide general location recommendations
without using the weather tool.

After the user chooses a specific location:
- Use get_shoot_weather if weather information is needed.
- Use create_shoot_plan only if the user clearly asks
  to save or create a shoot plan.

Do not claim that you checked access, opening times
or drone restrictions unless an appropriate tool
provided that information.

PROFILE AND PREFERENCES RULES

Call get_user_profile before:
- Creating or saving a shoot plan
- Giving personalised creative advice
- Giving personalised equipment advice
- Recommending somewhere nearby or local
- Answering what the user's saved preferences are

Saved preferences are defaults, not commands.

Follow this order:
1. The user's current request
2. Safety, weather and practical limits
3. Saved profile preferences

Apply the profile like this:

- Adjust technical language to the experience level.

- Use the default shoot type only when the user
  has not specified one.

- If the default type is mixed and the type matters,
  ask one clarification question.

- Use preferred styles when creating concepts,
  compositions and shot lists.

- Use home location only when the user asks for
  nearby or local recommendations without naming
  another location.

- Prefer the saved shoot time when practical.

- Follow the personal planning instructions when
  they are relevant.

- Use the display name naturally and sparingly.

Do not claim a preference exists unless
get_user_profile returned it.

If no profile exists, continue normally and ask only
for information required for the current request.

          LOCATION DETAILS RULES

          When you recommend one or more specific named
          locations, call get_location_details before giving
          the final location answer.

          For a list of recommendations, send all specific
          location names in one tool call. The tool supports
          up to five locations.

          Also call get_location_details when the user asks:
          - Where a place is
          - For its address or postcode
          - For a Google Maps link
          - For an Apple Maps link
          - To create a shoot plan at a specific place

          Use the address and postcode returned by the tool.
          Never invent a postcode.

          Tell the user that clickable Google Maps and Apple
          Maps buttons are displayed in the location card.
          Do not read long map URLs aloud.

          When the lookup does not return an exact postcode,
          say that the map buttons will search using the
          location name.

          WEATHER TOOL RULES

          When the user asks about:
          - Weather
          - Golden hour
          - Sunrise or sunset
          - Temperature
          - Rain
          - Cloud cover
          - Visibility
          - Wind speed
          - Wind gusts
          - The best time for a photography or drone shoot

          You must call the get_shoot_weather tool.

          Convert relative dates such as today, tomorrow,
          this Saturday or next Sunday into YYYY-MM-DD format
          before calling the tool.

          Before calling get_shoot_weather, use a location that
a weather geocoder can recognise.

Prefer:
- Town or city
- County or region
- Country
- Postcode
- A complete resolved address

When the user gives only a beach, pier, harbour,
landmark or attraction name, call get_location_details
first.

Use the resolved town, address or postcode returned by
get_location_details when calling get_shoot_weather.

For example:
- Southend Beach → Southend-on-Sea, Essex, UK
- Brighton Palace Pier → Brighton, UK
- Seven Sisters Cliffs → East Sussex, UK

Do not repeatedly call the weather tool using the same
location after it has already returned a location error.

          REQUEST CLASSIFICATION RULES

Before calling any tool, identify the user's main request.

There are three separate request types:

1. PLACE RECOMMENDATION
The user wants suggestions for places inside a broad
region, county, city or country.

Examples:
- Find me a nice place in Cornwall.
- Recommend a beach in Devon.
- Where should I take photos in Scotland?
- Find a drone location near London.

For this request type:
- Do not call get_shoot_weather.
- Do not ask for a specific town or landmark.
- Treat the broad area as the search area.
- Recommend 3 to 5 named places within that area.
- Briefly explain what each place is suitable for.
- Ask one preference question only when it would
  meaningfully improve the recommendations.

2. WEATHER REQUEST
The user explicitly asks about weather, rain, wind,
temperature, visibility, sunrise, sunset or golden hour.

For this request type:
- Call get_shoot_weather only when a sufficiently
  specific location is known.
- If only a broad region is provided, ask the user
  to select a specific town, beach or landmark.

3. SHOOT PLAN REQUEST
The user clearly asks to create, save or schedule
a shoot plan.

For this request type:
- Gather the required shoot details.
- Check weather when relevant.
- Then call create_shoot_plan.

Never automatically turn a place-recommendation request
into a weather request.
Never say that you are checking the forecast unless the
user asked about weather, timing or requested a shoot plan.

          If the user does not provide a date, ask for it unless
          the date can clearly be understood from the message.

          After receiving the forecast, provide:
          - The recommended shoot period
          - Golden-hour times
          - Temperature
          - Rain probability
          - Wind speed and gusts
          - Cloud cover when useful
          - Visibility when useful
          - A short explanation of why the time is recommended

          For drone shoots, pay particular attention to wind
          gusts and rain.

          Weather information is only a planning aid.
          Never claim that a drone flight is legally permitted
          or completely safe based only on weather information.

          EQUIPMENT LIBRARY RULES

          When the user asks:
          - What equipment they own
          - What equipment they should take
          - For equipment recommendations
          - To create or save a shoot plan

          Call get_equipment_library before giving the final
          equipment recommendation or calling create_shoot_plan.

          Use available saved equipment first.

          When using saved equipment:
          - Use the exact label returned by the tool.
          - Treat it as equipment the user owns.
          - Do not describe maintenance or unavailable items
            as ready to use.
          - Do not include maintenance or unavailable items in
            a saved shoot plan unless the user explicitly asks.

          When useful equipment is missing from the user's
          available library, include it using this format:
          - Rent/borrow: equipment name

          Do not claim the user owns an item unless
          get_equipment_library returned it.

          If the equipment library is empty or cannot be loaded,
          provide a sensible general checklist and clearly say
          it is not based on saved equipment.

          SHOOT PLAN TOOL RULES

          When the user clearly asks to create, save, schedule
          or add a shoot plan, use the create_shoot_plan tool.

          Before creating a shoot plan, make sure you know:
          - The shoot type
          - The location
          - The date

          Ask for missing information one question at a time.

          When weather affects the shoot, call the
          get_shoot_weather tool before calling
          create_shoot_plan.

          Create:
          - A clear and useful title
          - A suitable recommended time
          - A practical shot list
          - A relevant equipment checklist
          - Short preparation notes

          For photography shoots, include useful compositions,
          angles and lighting ideas.

          For videography shoots, include a mixture of wide,
          medium, close-up and detail shots.

          For drone shoots, include controlled movements such as
          reveals, orbits, top-down shots and pull-away shots.

          Do not save a shoot when the user only asks for:
          - General ideas
          - Advice
          - Weather information
          - Camera settings

          Only save a plan when the user clearly asks you to
          create or save it.

          After saving the plan, briefly confirm:
          - The shoot title
          - The date
          - The location
          - The recommended time

          Do not pretend that you checked live weather,
          drone restrictions, maps or calendar information
          unless an appropriate tool provided it.
        `,
      });

      const session = new RealtimeSession(agent, {
        model: "gpt-realtime-2.1",

        config: {
          outputModalities: ["audio"],

          audio: {
            input: {
              transcription: {
                model: "gpt-4o-mini-transcribe",
              },

              turnDetection: {
                type: "semantic_vad",
                eagerness: "medium",
                createResponse: true,
                interruptResponse: true,
              },
            },
          },
        },
      });

      session.on("history_updated", (history) => {
        const updatedMessages =
          convertHistoryToMessages(history);

        setMessages(updatedMessages);
      });

      session.on("audio_start", () => {
        setIsAssistantSpeaking(true);
      });

      session.on("audio_stopped", () => {
        setIsAssistantSpeaking(false);
      });

      session.on("audio_interrupted", () => {
        setIsAssistantSpeaking(false);
      });

      session.on("error", (error) => {
        console.error(
          "Realtime session error:",
          error,
        );

        setErrorMessage(
          "The voice session encountered an error.",
        );
      });

      await session.connect({
        apiKey: tokenData.clientSecret,
      });

      sessionRef.current = session;
      setStatus("connected");
    } catch (error) {
      console.error(
        "Voice connection failed:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "The voice connection failed.";

      setErrorMessage(message);
      setStatus("error");
    }
  }

  function sendTypedMessage(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const message = textInput.trim();
    const session = sessionRef.current;

    if (
      !session ||
      status !== "connected" ||
      !message
    ) {
      return;
    }

    try {
      session.sendMessage(message);
      setTextInput("");
    } catch (error) {
      console.error(
        "Typed message failed:",
        error,
      );

      setErrorMessage(
        "Your typed message could not be sent.",
      );
    }
  }

  function toggleMute() {
    const session = sessionRef.current;

    if (!session) {
      return;
    }

    const nextMutedState = !isMuted;

    session.mute(nextMutedState);
    setIsMuted(nextMutedState);
  }

  function stopConversation() {
    sessionRef.current?.close();
    sessionRef.current = null;

    setStatus("disconnected");
    setIsMuted(false);
    setIsAssistantSpeaking(false);
    setErrorMessage("");
    setTextInput("");
  }

  function clearTranscript() {
    setMessages([]);
  }

  async function handleCreateManualShoot(
    newPlan: ShootPlan,
  ) {
    try {
      setErrorMessage("");

      await createShootPlanInDatabase(
        newPlan,
      );

      setShootPlans((currentPlans) => [
        ...currentPlans.filter(
          (plan) => plan.id !== newPlan.id,
        ),
        newPlan,
      ]);
    } catch (error) {
      console.warn(
        "Manual shoot creation failed:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The shoot plan could not be created.",
      );
    }
  }

  async function handleCheckManualWeather(
    location: string,
    date: string,
  ): Promise<ShootWeatherForecast> {
    try {
      setErrorMessage("");

      const forecast = await fetchShootWeather(
        location,
        date,
      );

      latestForecastRef.current =
        forecast;

      setLatestForecast(forecast);

      return forecast;
    } catch (error) {
      console.warn(
        "Manual weather check failed:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "The weather could not be checked.";

      setErrorMessage(message);

      throw error;
    }
  }

  async function persistUpdatedShoot(
    updatedPlan: ShootPlan,
    fallbackMessage: string,
  ): Promise<boolean> {
    const planToSave: ShootPlan = {
      ...updatedPlan,
      updatedAt: new Date().toISOString(),
    };

    try {
      setErrorMessage("");

      await updateShootPlanInDatabase(
        planToSave,
      );

      setShootPlans((currentPlans) =>
        currentPlans.map((plan) =>
          plan.id === planToSave.id
            ? planToSave
            : plan,
        ),
      );

      return true;
    } catch (error) {
      console.warn(
        "Shoot plan update failed:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : fallbackMessage,
      );

      return false;
    }
  }

  function handleToggleShootStatus(
    shootId: string,
  ) {
    const selectedPlan = shootPlans.find(
      (plan) => plan.id === shootId,
    );

    if (!selectedPlan) {
      return;
    }

    const updatedPlan: ShootPlan = {
      ...selectedPlan,

      status:
        selectedPlan.status === "planned"
          ? "completed"
          : "planned",
    };

    void persistUpdatedShoot(
      updatedPlan,
      "The shoot status could not be updated.",
    );
  }

  function handleToggleShot(
    shootId: string,
    shot: string,
  ) {
    const selectedPlan = shootPlans.find(
      (plan) => plan.id === shootId,
    );

    if (!selectedPlan) {
      return;
    }

    const completedShots =
      selectedPlan.completedShots ?? [];

    const updatedCompletedShots =
      completedShots.includes(shot)
        ? completedShots.filter(
            (item) => item !== shot,
          )
        : [...completedShots, shot];

    const updatedPlan: ShootPlan = {
      ...selectedPlan,
      completedShots:
        updatedCompletedShots,
    };

    void persistUpdatedShoot(
      updatedPlan,
      "The shot checklist could not be updated.",
    );
  }

  function handleToggleEquipment(
    shootId: string,
    equipment: string,
  ) {
    const selectedPlan = shootPlans.find(
      (plan) => plan.id === shootId,
    );

    if (!selectedPlan) {
      return;
    }

    const packedEquipment =
      selectedPlan.packedEquipment ?? [];

    const updatedPackedEquipment =
      packedEquipment.includes(equipment)
        ? packedEquipment.filter(
            (item) => item !== equipment,
          )
        : [
            ...packedEquipment,
            equipment,
          ];

    const updatedPlan: ShootPlan = {
      ...selectedPlan,
      packedEquipment:
        updatedPackedEquipment,
    };

    void persistUpdatedShoot(
      updatedPlan,
      "The equipment checklist could not be updated.",
    );
  }

  function handleUpdateShoot(
    updatedPlan: ShootPlan,
  ) {
    void persistUpdatedShoot(
      updatedPlan,
      "The shoot plan could not be updated.",
    );
  }

  async function handleRefreshShootWeather(
    shootId: string,
  ) {
    const selectedPlan = shootPlans.find(
      (plan) => plan.id === shootId,
    );

    if (!selectedPlan) {
      return;
    }

    try {
      setRefreshingShootId(shootId);
      setErrorMessage("");

      const forecast = await fetchShootWeather(
        selectedPlan.location,
        selectedPlan.date,
      );

      const weatherSummary =
        buildWeatherSummary(
          forecast,
          selectedPlan.recommendedTime,
        );

      const updatedPlan: ShootPlan = {
        ...selectedPlan,
        weather: weatherSummary,
      };

      const wasSaved =
        await persistUpdatedShoot(
          updatedPlan,
          "The refreshed weather could not be saved.",
        );

      if (!wasSaved) {
        return;
      }

      latestForecastRef.current =
        forecast;

      setLatestForecast(forecast);
    } catch (error) {
      console.warn(
        "Weather refresh failed:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The shoot weather could not be refreshed.",
      );
    } finally {
      setRefreshingShootId(null);
    }
  }

  async function handleDeleteShoot(
    shootId: string,
  ) {
    const shouldDelete = window.confirm(
      "Delete this shoot plan?",
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setErrorMessage("");

      await deleteShootPlanFromDatabase(
        shootId,
      );

      setShootPlans((currentPlans) =>
        currentPlans.filter(
          (plan) => plan.id !== shootId,
        ),
      );
    } catch (error) {
      console.warn(
        "Shoot deletion failed:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The shoot plan could not be deleted.",
      );
    }
  }

  function getStatusText() {
    if (status === "connecting") {
      return "Connecting to Kay Assistant...";
    }

    if (status === "connected" && isMuted) {
      return "Microphone muted";
    }

    if (
      status === "connected" &&
      isAssistantSpeaking
    ) {
      return "Kay Assistant is speaking...";
    }

    if (status === "connected") {
      return "Listening — speak naturally";
    }

    if (status === "error") {
      return "Connection failed";
    }

    return "Ready to begin";
  }

  const isConnected = status === "connected";

  return (
    <main className="min-h-screen overflow-x-hidden bg-neutral-950 px-3 py-4 text-white sm:px-5 sm:py-8 lg:py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-4 sm:gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Assistant controls */}
        <section className="h-fit rounded-3xl border border-neutral-800 bg-neutral-900 p-4 shadow-2xl sm:p-6 lg:p-7">
          <div className="mb-6 sm:mb-8">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-neutral-400">
              Voice-first AI assistant
            </p>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Kay Assistant
            </h1>

            <p className="mt-4 leading-7 text-neutral-400">
              Your photography, videography, drone
              and productivity assistant.
            </p>
          </div>

          <div className="rounded-2xl bg-neutral-800 p-4 sm:p-5">
            <div className="mb-5 flex items-center gap-3">
              <span
                className={`h-3 w-3 rounded-full ${
                  status === "connected"
                    ? "animate-pulse bg-green-500"
                    : status === "connecting"
                      ? "animate-pulse bg-yellow-500"
                      : status === "error"
                        ? "bg-red-500"
                        : "bg-neutral-500"
                }`}
              />

              <p className="font-medium">
                {getStatusText()}
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-200">
                {errorMessage}
              </div>
            )}

            {!isConnected ? (
              <button
                type="button"
                onClick={startConversation}
                disabled={
                  status === "connecting"
                }
                className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "connecting"
                  ? "Connecting..."
                  : "Start voice conversation"}
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="w-full rounded-xl border border-neutral-600 px-5 py-3 font-semibold transition hover:bg-neutral-700"
                >
                  {isMuted
                    ? "Unmute"
                    : "Mute"}
                </button>

                <button
                  type="button"
                  onClick={stopConversation}
                  className="w-full rounded-xl bg-red-600 px-5 py-3 font-semibold transition hover:bg-red-500"
                >
                  End conversation
                </button>
              </div>
            )}
          </div>

          <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Live capabilities
            </p>

            <p className="mt-2 text-sm text-neutral-400">
              Kay can retrieve live shoot weather,
              calculate golden hour, open locations in
              Google or Apple Maps and save shoot
              plans.
            </p>
          </div>

          <p className="mt-5 text-center text-xs text-neutral-500">
            Your microphone is active only during
            a voice conversation.
          </p>

          <ShootWeatherCard
            forecast={latestForecast}
          />

          <LocationDetailsCard
            locations={
              latestLocationDetails
            }
          />

          <LogoutButton />
        </section>

        {/* Conversation transcript */}
        <section className="flex h-[70svh] min-h-[520px] min-w-0 flex-col rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl sm:h-[650px] lg:h-[700px]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-800 px-4 py-4 sm:px-6 sm:py-5">
            <div>
              <h2 className="text-xl font-semibold">
                Live transcript
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Speak or type during the same
                conversation.
              </p>
            </div>

            {messages.length > 0 &&
              !isConnected && (
                <button
                  type="button"
                  onClick={clearTranscript}
                  className="rounded-lg px-3 py-2 text-sm text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
                >
                  Clear
                </button>
              )}
          </div>

          <div
            ref={transcriptContainerRef}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-5 sm:p-6"
          >
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[320px] items-center justify-center sm:min-h-[440px]">
                <div className="max-w-sm text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-800 text-2xl">
                    🎙️
                  </div>

                  <p className="font-medium text-neutral-300">
                    No conversation yet
                  </p>

                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    Ask about shoot weather or tell
                    Kay to create and save a new shoot
                    plan.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl px-4 py-3 sm:max-w-[85%] sm:px-5 sm:py-4 ${
                      message.role === "user"
                        ? "bg-white text-black"
                        : "bg-neutral-800 text-white"
                    }`}
                  >
                    <p
                      className={`mb-2 text-xs font-semibold uppercase tracking-wide ${
                        message.role === "user"
                          ? "text-neutral-500"
                          : "text-neutral-400"
                      }`}
                    >
                      {message.role === "user"
                        ? "You"
                        : "Kay"}
                    </p>

                    <p className="whitespace-pre-wrap break-words text-sm leading-6 sm:text-base sm:leading-7">
                      {message.text}
                    </p>

                    {!message.isComplete && (
                      <span className="mt-2 inline-block animate-pulse text-xs opacity-50">
                        Transcribing...
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Typed-message form */}
          <form
            onSubmit={sendTypedMessage}
            className="border-t border-neutral-800 p-3 sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={textInput}
                onChange={(event) =>
                  setTextInput(
                    event.target.value,
                  )
                }
                disabled={!isConnected}
                placeholder={
                  isConnected
                    ? "Ask Kay to plan your next shoot..."
                    : "Start a conversation to type"
                }
                className="min-w-0 flex-1 rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-white outline-none transition placeholder:text-neutral-500 focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={
                  !isConnected ||
                  !textInput.trim()
                }
                className="w-full rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                Send
              </button>
            </div>

            <p className="mt-3 text-xs leading-5 text-neutral-500">
              Try: “Create and save a drone shoot
              plan for Brighton tomorrow evening.”
            </p>
          </form>
        </section>

        {/* User profile and preferences */}
        <UserProfilePreferences />

        {/* User equipment library */}
        <EquipmentLibrary />

        {/* Saved shoot plans */}
        <UpcomingShoots
          plans={shootPlans}
          isLoaded={shootPlansLoaded}
          refreshingShootId={
            refreshingShootId
          }
          onToggleStatus={
            handleToggleShootStatus
          }
          onToggleShot={
            handleToggleShot
          }
          onToggleEquipment={
            handleToggleEquipment
          }
          onUpdateShoot={
            handleUpdateShoot
          }
          onCreateShoot={
            handleCreateManualShoot
          }
          onCheckManualWeather={
            handleCheckManualWeather
          }
          onRefreshWeather={
            handleRefreshShootWeather
          }
          onDelete={
            handleDeleteShoot
          }
        />
      </div>
    </main>
  );
}