"use client";

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

import {
  deleteShootPlan,
  loadShootPlans,
  updateShootPlan,
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
   * Load locally saved shoot plans when
   * the page first opens.
   */
  useEffect(() => {
    const savedPlans = loadShootPlans();

    setShootPlans(savedPlans);
    setShootPlansLoaded(true);
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

      const shootPlanTool =
        createShootPlanTool(
          (updatedPlans) => {
            setShootPlans(updatedPlans);
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
          shootWeatherTool,
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

Do not claim that you checked live maps, access,
parking, opening times or drone restrictions unless
an appropriate tool provided that information.

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

          If the user does not provide a location, ask for it.

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

    const updatedPlans =
      updateShootPlan(updatedPlan);

    setShootPlans(updatedPlans);
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

    const updatedPlans =
      updateShootPlan(updatedPlan);

    setShootPlans(updatedPlans);
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

    const updatedPlans =
      updateShootPlan(updatedPlan);

    setShootPlans(updatedPlans);
  }

  function handleUpdateShoot(
    updatedPlan: ShootPlan,
  ) {
    const updatedPlans =
      updateShootPlan(updatedPlan);

    setShootPlans(updatedPlans);
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

      const updatedPlans =
        updateShootPlan(updatedPlan);

      setShootPlans(updatedPlans);

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

  function handleDeleteShoot(
    shootId: string,
  ) {
    const shouldDelete = window.confirm(
      "Delete this shoot plan?",
    );

    if (!shouldDelete) {
      return;
    }

    const updatedPlans =
      deleteShootPlan(shootId);

    setShootPlans(updatedPlans);
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
    <main className="min-h-screen bg-neutral-950 px-5 py-10 text-white">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[360px_1fr]">
        {/* Assistant controls */}
        <section className="h-fit rounded-3xl border border-neutral-800 bg-neutral-900 p-7 shadow-2xl">
          <div className="mb-8">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-neutral-400">
              Voice-first AI assistant
            </p>

            <h1 className="text-4xl font-bold tracking-tight">
              Kay Assistant
            </h1>

            <p className="mt-4 leading-7 text-neutral-400">
              Your photography, videography, drone
              and productivity assistant.
            </p>
          </div>

          <div className="rounded-2xl bg-neutral-800 p-5">
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
                disabled={status === "connecting"}
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
                  {isMuted ? "Unmute" : "Mute"}
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
              calculate golden hour and save shoot plans.
            </p>
          </div>

          <p className="mt-5 text-center text-xs text-neutral-500">
            Your microphone is active only during
            a voice conversation.
          </p>

          <ShootWeatherCard
            forecast={latestForecast}
          />
        </section>

        {/* Conversation transcript */}
        <section className="flex h-[600px] flex-col rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-5">
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
            className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6"
          >
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[440px] items-center justify-center">
                <div className="max-w-sm text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-800 text-2xl">
                    🎙️
                  </div>

                  <p className="font-medium text-neutral-300">
                    No conversation yet
                  </p>

                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    Ask about shoot weather or tell Kay
                    to create and save a new shoot plan.
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
                    className={`max-w-[85%] rounded-2xl px-5 py-4 ${
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

                    <p className="whitespace-pre-wrap leading-7">
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
            className="border-t border-neutral-800 p-5"
          >
            <div className="flex gap-3">
              <input
                type="text"
                value={textInput}
                onChange={(event) =>
                  setTextInput(event.target.value)
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
                className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
            </div>

            <p className="mt-3 text-xs text-neutral-500">
              Try: “Create and save a drone shoot
              plan for Brighton tomorrow evening.”
            </p>
          </form>
        </section>

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
  onRefreshWeather={
    handleRefreshShootWeather
  }
  onDelete={handleDeleteShoot}
/>
      </div>
    </main>
  );
}