import { tool } from "@openai/agents";
import { z } from "zod";

import {
  addShootPlan,
  createShootId,
  type ShootPlan,
  type ShootWeatherSummary,
} from "@/lib/shootStorage";

type ShootCreatedCallback = (
  plans: ShootPlan[],
  newPlan: ShootPlan,
) => void;

type GetWeatherSummaryCallback = (
    recommendedTime: string,
  ) => ShootWeatherSummary | null;

export function createShootPlanTool(
  onShootCreated: ShootCreatedCallback,
  getWeatherSummary:
    GetWeatherSummaryCallback = () => null,
) {
  return tool({
    name: "create_shoot_plan",

    description: `
      Create and save a photography, videography or drone
      shoot plan.

      Use this tool only after the user clearly asks to create,
      save or schedule a shoot plan.

      Before using the tool, confirm the important information:
      location, date and shoot type.
    `,

    parameters: z.object({
      title: z
        .string()
        .min(3)
        .describe(
          "A short title, such as Brighton Beach Drone Shoot.",
        ),

      shootType: z
        .enum([
          "photography",
          "videography",
          "drone",
        ])
        .describe("The type of shoot."),

      location: z
        .string()
        .min(2)
        .describe("The location of the shoot."),

      date: z
        .string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
          "The date must use YYYY-MM-DD format.",
        )
        .describe(
          "The shoot date in YYYY-MM-DD format.",
        ),

      recommendedTime: z
        .string()
        .min(1)
        .describe(
          "The recommended time or time range for the shoot.",
        ),

      shotList: z
        .array(z.string().min(2))
        .min(1)
        .max(12)
        .describe(
          "A practical list of shots to capture.",
        ),

      equipment: z
        .array(z.string().min(2))
        .min(1)
        .max(15)
        .describe(
          "A checklist of equipment required for the shoot.",
        ),

      notes: z
        .string()
        .default("")
        .describe(
          "Optional preparation notes or creative guidance.",
        ),
    }),

    async execute({
      title,
      shootType,
      location,
      date,
      recommendedTime,
      shotList,
      equipment,
      notes,
    }) {
      try {
        const now = new Date().toISOString();

        /*
         * Retrieve the latest weather summary that
         * was received before this plan was created.
         */
        const weatherSummary =
  getWeatherSummary(recommendedTime);

        const newPlan: ShootPlan = {
          id: createShootId(),
          title,
          shootType,
          location,
          date,
          recommendedTime,
          status: "planned",
          shotList,
          equipment,

          completedShots: [],
          packedEquipment: [],

          notes,
          weather: weatherSummary,
          createdAt: now,
          updatedAt: now,
        };

        const updatedPlans =
          addShootPlan(newPlan);

        onShootCreated(
          updatedPlans,
          newPlan,
        );

        return JSON.stringify({
          success: true,
          message: weatherSummary
            ? "The shoot plan and weather details were saved."
            : "The shoot plan was saved.",

          shootPlan: newPlan,
        });
      } catch (error) {
        console.error(
          "Create shoot plan tool error:",
          error,
        );

        return JSON.stringify({
          success: false,
          error:
            "The shoot plan could not be saved.",
        });
      }
    },
  });
}