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
          return JSON.stringify({
            success: false,
            error:
              "error" in data
                ? data.error
                : "The shoot forecast could not be retrieved.",
          });
        }

        const forecast = data as ShootWeatherForecast;

        // Display the forecast inside the React weather card.
        onForecastReceived(forecast);

        // Return the forecast to Kay Assistant.
        return JSON.stringify({
          success: true,
          forecast,
        });
      } catch (error) {
        console.error(
          "Shoot weather tool error:",
          error,
        );

        return JSON.stringify({
          success: false,
          error:
            "The application could not connect to the shoot weather service.",
        });
      }
    },
  });
}