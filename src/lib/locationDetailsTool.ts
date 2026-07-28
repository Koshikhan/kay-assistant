import { tool } from "@openai/agents";
import { z } from "zod";

import {
  fetchLocationDetails,
  type LocationDetails,
} from "@/lib/locationDetails";

type LocationDetailsCallback = (
  locations: LocationDetails[],
) => void | Promise<void>;

export function createLocationDetailsTool(
  onLocationsResolved:
    LocationDetailsCallback,
) {
  return tool({
    name: "get_location_details",

    description: `
      Find map-ready details for one to five specific
      named locations.

      Use this tool when:
      - The user asks where a place is
      - The user asks for a postcode or address
      - The user asks for Google Maps or Apple Maps
      - You recommend specific shoot locations
      - A shoot plan uses a specific location

      The tool returns a Google Maps link and Apple Maps
      link for every location. It also returns coordinates,
      an address and a postcode when the geocoding lookup
      provides them.

      Do not use this tool for a broad region without first
      naming specific places inside it.
    `,

    parameters: z.object({
      locations: z
        .array(
          z.string().min(2),
        )
        .min(1)
        .max(5)
        .describe(
          "One to five specific named places, landmarks, beaches, studios or addresses.",
        ),
    }),

    async execute({ locations }) {
      try {
        const uniqueLocations = Array.from(
          new Map(
            locations.map((location) => [
              location
                .trim()
                .toLowerCase(),
              location.trim(),
            ]),
          ).values(),
        );

        const resolvedLocations =
          await Promise.all(
            uniqueLocations.map(
              fetchLocationDetails,
            ),
          );

        await onLocationsResolved(
          resolvedLocations,
        );

        return JSON.stringify({
          success: true,
          locations:
            resolvedLocations.map(
              (location) => ({
                name: location.name,
                address:
                  location.address ||
                  "Exact address was not returned.",
                postcode:
                  location.postcode ||
                  "Postcode was not returned.",
                latitude:
                  location.latitude,
                longitude:
                  location.longitude,
                googleMapsUrl:
                  location.googleMapsUrl,
                appleMapsUrl:
                  location.appleMapsUrl,
                resolved:
                  location.resolved,
              }),
            ),
          instruction:
            "Tell the user that clickable Google Maps and Apple Maps buttons are displayed in the location card. Do not read the full URLs aloud.",
        });
      } catch (error) {
        console.error(
          "Location details tool error:",
          error,
        );

        return JSON.stringify({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "The location details could not be loaded.",
        });
      }
    },
  });
}
