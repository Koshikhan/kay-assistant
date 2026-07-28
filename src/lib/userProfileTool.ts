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