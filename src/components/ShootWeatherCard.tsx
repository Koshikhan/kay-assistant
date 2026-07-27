import type { ShootWeatherForecast } from "@/lib/shootWeatherTool";

type ShootWeatherCardProps = {
  forecast: ShootWeatherForecast | null;
};

function formatValue(
  value: number | null,
  unit: string,
): string {
  if (value === null) {
    return "—";
  }

  return `${value}${unit}`;
}

function formatDate(dateString: string): string {
  const date = new Date(`${dateString}T12:00:00`);

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function ShootWeatherCard({
  forecast,
}: ShootWeatherCardProps) {
  if (!forecast) {
    return null;
  }

  const {
    location,
    date,
    sunlight,
    dailySummary,
  } = forecast;

  const temperatureUnit =
    dailySummary.units.temperature;

  const rainUnit =
    dailySummary.units.rainProbability;

  const windUnit =
    dailySummary.units.windSpeed;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-950/70">
      <div className="border-b border-neutral-800 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Shoot forecast
        </p>

        <h2 className="mt-2 text-xl font-semibold text-white">
          {location.name}
        </h2>

        <p className="mt-1 text-sm text-neutral-400">
          {[location.region, location.country]
            .filter(Boolean)
            .join(", ")}
        </p>

        <p className="mt-1 text-sm text-neutral-500">
          {formatDate(date)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px bg-neutral-800">
        <div className="bg-neutral-900 p-4">
          <p className="text-xs text-neutral-500">
            Temperature
          </p>

          <p className="mt-1 font-semibold text-white">
            {formatValue(
              dailySummary.minimumTemperature,
              temperatureUnit,
            )}
            {" – "}
            {formatValue(
              dailySummary.maximumTemperature,
              temperatureUnit,
            )}
          </p>
        </div>

        <div className="bg-neutral-900 p-4">
          <p className="text-xs text-neutral-500">
            Rain probability
          </p>

          <p className="mt-1 font-semibold text-white">
            {formatValue(
              dailySummary.maximumRainProbability,
              rainUnit,
            )}
          </p>
        </div>

        <div className="bg-neutral-900 p-4">
          <p className="text-xs text-neutral-500">
            Maximum wind
          </p>

          <p className="mt-1 font-semibold text-white">
            {formatValue(
              dailySummary.maximumWindSpeed,
              ` ${windUnit}`,
            )}
          </p>
        </div>

        <div className="bg-neutral-900 p-4">
          <p className="text-xs text-neutral-500">
            Maximum gusts
          </p>

          <p className="mt-1 font-semibold text-white">
            {formatValue(
              dailySummary.maximumWindGusts,
              ` ${windUnit}`,
            )}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <p className="text-xs text-neutral-500">
            Morning golden hour
          </p>

          <p className="mt-1 font-medium text-white">
            {sunlight.morningGoldenHour.start ??
              "Unavailable"}
            {" – "}
            {sunlight.morningGoldenHour.end ??
              "Unavailable"}
          </p>
        </div>

        <div>
          <p className="text-xs text-neutral-500">
            Evening golden hour
          </p>

          <p className="mt-1 font-medium text-white">
            {sunlight.eveningGoldenHour.start ??
              "Unavailable"}
            {" – "}
            {sunlight.eveningGoldenHour.end ??
              "Unavailable"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-neutral-800 pt-4">
          <div>
            <p className="text-xs text-neutral-500">
              Sunrise
            </p>

            <p className="mt-1 text-sm font-medium text-white">
              {sunlight.sunrise ?? "Unavailable"}
            </p>
          </div>

          <div>
            <p className="text-xs text-neutral-500">
              Sunset
            </p>

            <p className="mt-1 text-sm font-medium text-white">
              {sunlight.sunset ?? "Unavailable"}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-800 bg-neutral-900 px-5 py-3">
        <p className="text-xs leading-5 text-neutral-500">
          Weather information is for shoot planning
          and does not confirm that a drone flight is
          safe or legally permitted.
        </p>
      </div>
    </section>
  );
}