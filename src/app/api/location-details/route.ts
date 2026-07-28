import { NextResponse } from "next/server";

type OpenMeteoPlace = {
  name?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  postcodes?: string[];
};

type OpenMeteoGeocodingResponse = {
  results?: OpenMeteoPlace[];
};

type LocationRequestBody = {
  location?: unknown;
};

function uniqueParts(
  parts: Array<string | undefined>,
): string[] {
  const seen = new Set<string>();

  return parts
    .map((part) => part?.trim() ?? "")
    .filter((part) => {
      if (!part) {
        return false;
      }

      const key = part.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function buildGoogleMapsUrl(
  query: string,
): string {
  return (
    "https://www.google.com/maps/search/" +
    `?api=1&query=${encodeURIComponent(query)}`
  );
}

function buildAppleMapsUrl(
  query: string,
  latitude?: number,
  longitude?: number,
): string {
  const search = new URLSearchParams({
    q: query,
  });

  if (
    typeof latitude === "number" &&
    typeof longitude === "number"
  ) {
    search.set(
      "ll",
      `${latitude},${longitude}`,
    );
  }

  return `https://maps.apple.com/?${search.toString()}`;
}

function createFallbackLocation(
  query: string,
) {
  return {
    query,
    resolved: false,
    name: query,
    address: "",
    postcode: "",
    country: "",
    latitude: null,
    longitude: null,
    googleMapsUrl:
      buildGoogleMapsUrl(query),
    appleMapsUrl:
      buildAppleMapsUrl(query),
  };
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as LocationRequestBody;

    const location =
      typeof body.location === "string"
        ? body.location.trim()
        : "";

    if (location.length < 2) {
      return NextResponse.json(
        {
          error:
            "Enter a more specific location.",
        },
        {
          status: 400,
        },
      );
    }

    const geocodingUrl = new URL(
      "https://geocoding-api.open-meteo.com/v1/search",
    );

    geocodingUrl.searchParams.set(
      "name",
      location,
    );
    geocodingUrl.searchParams.set(
      "count",
      "5",
    );
    geocodingUrl.searchParams.set(
      "language",
      "en",
    );
    geocodingUrl.searchParams.set(
      "format",
      "json",
    );

    const response = await fetch(
      geocodingUrl,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return NextResponse.json({
        location:
          createFallbackLocation(
            location,
          ),
      });
    }

    const data =
      (await response.json()) as OpenMeteoGeocodingResponse;

    const place = data.results?.[0];

    if (
      !place ||
      typeof place.latitude !== "number" ||
      typeof place.longitude !== "number"
    ) {
      return NextResponse.json({
        location:
          createFallbackLocation(
            location,
          ),
      });
    }

    const name =
      place.name?.trim() || location;

    const postcode =
      place.postcodes?.[0]?.trim() ?? "";

    const addressParts = uniqueParts([
      name,
      place.admin3,
      place.admin2,
      place.admin1,
      postcode,
      place.country,
    ]);

    const address =
      addressParts.join(", ");

    const coordinateQuery =
      `${place.latitude},${place.longitude}`;

    return NextResponse.json({
      location: {
        query: location,
        resolved: true,
        name,
        address,
        postcode,
        country:
          place.country?.trim() ?? "",
        latitude: place.latitude,
        longitude: place.longitude,
        googleMapsUrl:
          buildGoogleMapsUrl(
            coordinateQuery,
          ),
        appleMapsUrl:
          buildAppleMapsUrl(
            name,
            place.latitude,
            place.longitude,
          ),
      },
    });
  } catch (error) {
    console.error(
      "Location details route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "The location details could not be loaded.",
      },
      {
        status: 500,
      },
    );
  }
}
