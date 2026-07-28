"use client";

import {
  buildAppleMapsUrl,
  buildGoogleMapsUrl,
} from "@/lib/locationDetails";

type LocationMapLinksProps = {
  location: string;
};

export function LocationMapLinks({
  location,
}: LocationMapLinksProps) {
  const trimmedLocation =
    location.trim();

  if (!trimmedLocation) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap justify-end gap-2">
      <a
        href={buildGoogleMapsUrl(
          trimmedLocation,
        )}
        target="_blank"
        rel="noreferrer"
        onClick={(event) =>
          event.stopPropagation()
        }
        className="rounded-lg border border-blue-900 px-2.5 py-1.5 text-xs font-medium text-blue-300 transition hover:bg-blue-950/50"
      >
        Google Maps
      </a>

      <a
        href={buildAppleMapsUrl(
          trimmedLocation,
        )}
        target="_blank"
        rel="noreferrer"
        onClick={(event) =>
          event.stopPropagation()
        }
        className="rounded-lg border border-neutral-700 px-2.5 py-1.5 text-xs font-medium text-neutral-300 transition hover:bg-neutral-800"
      >
        Apple Maps
      </a>
    </div>
  );
}
