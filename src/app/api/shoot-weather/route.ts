import { NextRequest, NextResponse } from "next/server";
import * as SunCalc from "suncalc";

type GeocodingLocation = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
};

type GeocodingResponse = {
  results?: GeocodingLocation[];
  error?: boolean;
  reason?: string;
};

type ForecastResponse = {
  timezone?: string;

  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation_probability?: number[];
    cloud_cover?: number[];
    wind_speed_10m?: number[];
    wind_gusts_10m?: number[];
    visibility?: number[];
  };

  hourly_units?: {
    temperature_2m?: string;
    precipitation_probability?: string;
    cloud_cover?: string;
    wind_speed_10m?: string;
    wind_gusts_10m?: string;
    visibility?: string;
  };

  daily?: {
    time?: string[];
    sunrise?: string[];
    sunset?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    wind_speed_10m_max?: number[];
    wind_gusts_10m_max?: number[];
  };

  daily_units?: {
    temperature_2m_max?: string;
    temperature_2m_min?: string;
    precipitation_probability_max?: string;
    wind_speed_10m_max?: string;
    wind_gusts_10m_max?: string;
  };

  error?: boolean;
  reason?: string;
};

function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsedDate = new Date(`${date}T00:00:00Z`);

  return !Number.isNaN(parsedDate.getTime());
}

function formatTime(
    date: Date | null | undefined,
    timeZone: string,
  ): string | null {
    if (!date || Number.isNaN(date.getTime())) {
      return null;
    }
  
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

export async function GET(request: NextRequest) {
  try {
    const searchParams =
      request.nextUrl.searchParams;

    const locationQuery =
      searchParams.get("location")?.trim();

    const date = searchParams.get("date")?.trim();

    if (!locationQuery) {
      return NextResponse.json(
        {
          error:
            "A location is required. Example: ?location=Brighton&date=2026-07-27",
        },
        { status: 400 },
      );
    }

    if (!date || !isValidDate(date)) {
      return NextResponse.json(
        {
          error:
            "A valid date is required in YYYY-MM-DD format.",
        },
        { status: 400 },
      );
    }

    /*
     * Step 1:
     * Convert the location name into coordinates.
     */
    const geocodingUrl = new URL(
      "https://geocoding-api.open-meteo.com/v1/search",
    );

    geocodingUrl.searchParams.set(
      "name",
      locationQuery,
    );

    geocodingUrl.searchParams.set("count", "1");
    geocodingUrl.searchParams.set("language", "en");
    geocodingUrl.searchParams.set("format", "json");

    const geocodingResponse = await fetch(
      geocodingUrl,
      {
        cache: "no-store",
      },
    );

    const geocodingData =
      (await geocodingResponse.json()) as GeocodingResponse;

    if (
      !geocodingResponse.ok ||
      geocodingData.error
    ) {
      return NextResponse.json(
        {
          error:
            geocodingData.reason ??
            "The location search failed.",
        },
        { status: 502 },
      );
    }

    const location = geocodingData.results?.[0];

    if (!location) {
      return NextResponse.json(
        {
          error: `No location was found for "${locationQuery}".`,
        },
        { status: 404 },
      );
    }

    /*
     * Step 2:
     * Retrieve weather for the selected date.
     */
    const weatherUrl = new URL(
      "https://api.open-meteo.com/v1/forecast",
    );

    weatherUrl.searchParams.set(
      "latitude",
      String(location.latitude),
    );

    weatherUrl.searchParams.set(
      "longitude",
      String(location.longitude),
    );

    weatherUrl.searchParams.set(
      "hourly",
      [
        "temperature_2m",
        "precipitation_probability",
        "cloud_cover",
        "wind_speed_10m",
        "wind_gusts_10m",
        "visibility",
      ].join(","),
    );

    weatherUrl.searchParams.set(
      "daily",
      [
        "sunrise",
        "sunset",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max",
        "wind_speed_10m_max",
        "wind_gusts_10m_max",
      ].join(","),
    );

    weatherUrl.searchParams.set(
      "start_date",
      date,
    );

    weatherUrl.searchParams.set(
      "end_date",
      date,
    );

    weatherUrl.searchParams.set(
      "timezone",
      "auto",
    );

    weatherUrl.searchParams.set(
      "wind_speed_unit",
      "mph",
    );

    const weatherResponse = await fetch(weatherUrl, {
      cache: "no-store",
    });

    const weatherData =
      (await weatherResponse.json()) as ForecastResponse;

    if (
      !weatherResponse.ok ||
      weatherData.error
    ) {
      return NextResponse.json(
        {
          error:
            weatherData.reason ??
            "The weather forecast could not be retrieved.",
        },
        { status: 502 },
      );
    }

    const timeZone = weatherData.timezone ?? "UTC";

    /*
     * Step 3:
     * Calculate photography sunlight times.
     */
    const calculationDate = new Date(
      `${date}T12:00:00Z`,
    );

    const sunTimes = SunCalc.getTimes(
      calculationDate,
      location.latitude,
      location.longitude,
    );

    /*
     * Step 4:
     * Convert the hourly arrays into readable objects.
     */
    const hourlyTimes =
      weatherData.hourly?.time ?? [];

    const hourlyForecast = hourlyTimes.map(
      (time, index) => ({
        time,
        temperature:
          weatherData.hourly?.temperature_2m?.[
            index
          ] ?? null,

        rainProbability:
          weatherData.hourly
            ?.precipitation_probability?.[
            index
          ] ?? null,

        cloudCover:
          weatherData.hourly?.cloud_cover?.[
            index
          ] ?? null,

        windSpeed:
          weatherData.hourly?.wind_speed_10m?.[
            index
          ] ?? null,

        windGusts:
          weatherData.hourly?.wind_gusts_10m?.[
            index
          ] ?? null,

        visibilityKm:
          typeof weatherData.hourly?.visibility?.[
            index
          ] === "number"
            ? Number(
                (
                  weatherData.hourly.visibility[
                    index
                  ] / 1000
                ).toFixed(1),
              )
            : null,
      }),
    );

    return NextResponse.json({
      location: {
        requestedName: locationQuery,
        name: location.name,
        region: location.admin1 ?? null,
        country: location.country ?? null,
        countryCode:
          location.country_code ?? null,
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: timeZone,
      },

      date,

      sunlight: {
        dawn: formatTime(
          sunTimes.dawn,
          timeZone,
        ),

        sunrise: formatTime(
          sunTimes.sunrise,
          timeZone,
        ),

        morningGoldenHour: {
          start: formatTime(
            sunTimes.sunrise,
            timeZone,
          ),

          end: formatTime(
            sunTimes.goldenHourEnd,
            timeZone,
          ),
        },

        eveningGoldenHour: {
          start: formatTime(
            sunTimes.goldenHour,
            timeZone,
          ),

          end: formatTime(
            sunTimes.sunset,
            timeZone,
          ),
        },

        sunset: formatTime(
          sunTimes.sunset,
          timeZone,
        ),

        dusk: formatTime(
          sunTimes.dusk,
          timeZone,
        ),
      },

      dailySummary: {
        minimumTemperature:
          weatherData.daily
            ?.temperature_2m_min?.[0] ?? null,

        maximumTemperature:
          weatherData.daily
            ?.temperature_2m_max?.[0] ?? null,

        maximumRainProbability:
          weatherData.daily
            ?.precipitation_probability_max?.[
            0
          ] ?? null,

        maximumWindSpeed:
          weatherData.daily
            ?.wind_speed_10m_max?.[0] ?? null,

        maximumWindGusts:
          weatherData.daily
            ?.wind_gusts_10m_max?.[0] ?? null,

        units: {
          temperature:
            weatherData.daily_units
              ?.temperature_2m_max ?? "°C",

          rainProbability:
            weatherData.daily_units
              ?.precipitation_probability_max ??
            "%",

          windSpeed:
            weatherData.daily_units
              ?.wind_speed_10m_max ?? "mph",
        },
      },

      hourlyForecast,
    });
  } catch (error) {
    console.error(
      "Shoot weather endpoint error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while preparing the shoot forecast.",
      },
      { status: 500 },
    );
  }
}