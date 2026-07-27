import { tool } from "@openai/agents";
import { z } from "zod";

export type ShootWeatherForecast = {
  location: {
    requestedName: string;
    name: string;
    region: string | null;
    country: string | null;
    countryCode: string | null;
    latitude: number;
    longitude: number;
    timezone: string;
  };

  date: string;

  sunlight: {
    dawn: string | null;
    sunrise: string | null;

    morningGoldenHour: {
      start: string | null;
      end: string | null;
    };

    eveningGoldenHour: {
      start: string | null;
      end: string | null;
    };

    sunset: string | null;
    dusk: string | null;
  };

  dailySummary: {
    minimumTemperature: number | null;
    maximumTemperature: number | null;
    maximumRainProbability: number | null;
    maximumWindSpeed: number | null;
    maximumWindGusts: number | null;

    units: {
      temperature: string;
      rainProbability: string;
      windSpeed: string;
    };
  };

  hourlyForecast: Array<{
    time: string;
    temperature: number | null;
    rainProbability: number | null;
    cloudCover: number | null;
    windSpeed: number | null;
    windGusts: number | null;
    visibilityKm: number | null;
  }>;
};

type ShootWeatherError = {
  error: string;
};

type WeatherToolCallback = (
  forecast: ShootWeatherForecast,
) => void;

/**
 * Retrieve shoot weather from the application's
 * weather API.
 *
 * This function can be used by both:
 * - Kay Assistant's weather tool
 * - The Refresh weather button
 */
export async function fetchShootWeather(
  location: string,
  date: string,
): Promise<ShootWeatherForecast> {
  const searchParams = new URLSearchParams({
    location,
    date,
  });

  const response = await fetch(
    `/api/shoot-weather?${searchParams.toString()}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  const data = (await response.json()) as
    | ShootWeatherForecast
    | ShootWeatherError;

  if (!response.ok || "error" in data) {
    throw new Error(
      "error" in data
        ? data.error
        : "The shoot forecast could not be retrieved.",
    );
  }

  return data;
}

export function createShootWeatherTool(
  onForecastReceived: WeatherToolCallback,
) {
  return tool({
    name: "get_shoot_weather",

    description: `
      Retrieve real weather and sunlight information for
      planning photography, videography or drone shoots.

      Use this tool whenever the user asks about:
      - Weather for a shoot
      - Golden hour
      - Sunrise or sunset
      - Temperature
      - Rain probability
      - Cloud cover
      - Visibility
      - Wind speed
      - Wind gusts
      - The best time for a photography or drone shoot

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
    `,

    parameters: z.object({
      location: z
        .string()
        .min(2)
        .describe(
          "The city, town or location, such as Brighton, London or Richmond Park.",
        ),

      date: z
        .string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
          "The date must be in YYYY-MM-DD format.",
        )
        .describe(
          "The shoot date in YYYY-MM-DD format.",
        ),
    }),

    async execute({ location, date }) {
      try {
        const forecast =
          await fetchShootWeather(
            location,
            date,
          );

        // Display the forecast inside the React weather card.
        onForecastReceived(forecast);

        // Return the forecast to Kay Assistant.
        return JSON.stringify({
          success: true,
          forecast,
        });
      } catch (error) {
        console.warn(
          "Shoot weather tool error:",
          error,
        );

        return JSON.stringify({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "The application could not connect to the shoot weather service.",
        });
      }
    },
  });
}