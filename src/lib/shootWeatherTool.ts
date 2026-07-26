import { tool } from "@openai/agents/realtime";
import { z } from "zod";

type ShootWeatherError = {
  error?: string;
};

export const shootWeatherTool = tool({
  name: "get_shoot_weather",

  description: `
    Get real weather, wind, rain probability, cloud cover,
    visibility, sunrise, sunset and golden-hour information
    for planning a photography or drone shoot.

    Use this whenever the user asks about:
    - Weather for a shoot
    - Best photography time
    - Golden hour
    - Sunrise or sunset
    - Wind conditions
    - Drone filming conditions
  `,

  parameters: z.object({
    location: z
      .string()
      .min(2)
      .describe(
        "The city, town or location, for example Brighton or London.",
      ),

    date: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "The date must use YYYY-MM-DD format.",
      )
      .describe(
        "The shoot date in YYYY-MM-DD format.",
      ),
  }),

  async execute({ location, date }) {
    const query = new URLSearchParams({
      location,
      date,
    });

    const response = await fetch(
      `/api/shoot-weather?${query.toString()}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    const data =
      (await response.json()) as ShootWeatherError &
        Record<string, unknown>;

    if (!response.ok) {
      return {
        success: false,
        error:
          data.error ??
          "The shoot forecast could not be retrieved.",
      };
    }

    return {
      success: true,
      forecast: data,
    };
  },
});