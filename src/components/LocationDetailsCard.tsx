import type {
  LocationDetails,
} from "@/lib/locationDetails";

type LocationDetailsCardProps = {
  locations: LocationDetails[];
};

export function LocationDetailsCard({
  locations,
}: LocationDetailsCardProps) {
  if (locations.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Location details
        </p>

        <p className="mt-1 text-sm text-neutral-400">
          Open the recommended places directly
          in your preferred map app.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {locations.map((location) => (
          <article
            key={`${location.query}-${location.latitude}-${location.longitude}`}
            className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-lg">
                📍
              </div>

              <div className="min-w-0">
                <h3 className="font-semibold text-white">
                  {location.name}
                </h3>

                {location.address && (
                  <p className="mt-1 text-sm leading-6 text-neutral-400">
                    {location.address}
                  </p>
                )}

                {location.postcode && (
                  <p className="mt-2 text-sm text-neutral-300">
                    <span className="text-neutral-500">
                      Postcode:
                    </span>{" "}
                    {location.postcode}
                  </p>
                )}

                {!location.resolved && (
                  <p className="mt-2 text-xs leading-5 text-amber-300">
                    An exact postcode was not found.
                    The map buttons will search using
                    the location name.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <a
                href={location.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-blue-900 bg-blue-950/30 px-4 py-2.5 text-center text-sm font-semibold text-blue-300 transition hover:bg-blue-950/60"
              >
                Open Google Maps
              </a>

              <a
                href={location.appleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-neutral-700 px-4 py-2.5 text-center text-sm font-semibold text-neutral-200 transition hover:bg-neutral-800"
              >
                Open Apple Maps
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
