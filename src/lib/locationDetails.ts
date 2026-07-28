export type LocationDetails = {
  query: string;
  resolved: boolean;
  name: string;
  address: string;
  postcode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string;
  appleMapsUrl: string;
};

type LocationDetailsApiResponse = {
  location?: LocationDetails;
  error?: string;
};

export function buildGoogleMapsUrl(
  location: string,
): string {
  return (
    "https://www.google.com/maps/search/" +
    `?api=1&query=${encodeURIComponent(
      location.trim(),
    )}`
  );
}

export function buildAppleMapsUrl(
  location: string,
): string {
  return (
    "https://maps.apple.com/" +
    `?q=${encodeURIComponent(
      location.trim(),
    )}`
  );
}

export async function fetchLocationDetails(
  location: string,
): Promise<LocationDetails> {
  const trimmedLocation = location.trim();

  if (!trimmedLocation) {
    throw new Error(
      "Enter a location before requesting map details.",
    );
  }

  const response = await fetch(
    "/api/location-details",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        location: trimmedLocation,
      }),
    },
  );

  const data =
    (await response.json()) as LocationDetailsApiResponse;

  if (!response.ok || !data.location) {
    throw new Error(
      data.error ??
        "The location details could not be loaded.",
    );
  }

  return data.location;
}
