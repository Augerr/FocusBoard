import { useEffect, useMemo, useState } from "react";

const DEFAULT_LATITUDE = 43.6532;
const DEFAULT_LONGITUDE = -79.3832;

type PageId = "focus" | "today";

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end?: Date;
};

type ForecastPeriod = {
  label: "Morning" | "Afternoon" | "Night";
  temp: number;
  precipitation: number;
  condition: string;
};

type DayWeather = {
  location: string;
  currentTemp: number;
  condition: string;
  periods: ForecastPeriod[];
};

const pages: Array<{ id: PageId; label: string }> = [
  { id: "focus", label: "Focus" },
  { id: "today", label: "Today" },
];

function App() {
  const [activePage, setActivePage] = useState<PageId>("focus");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

      const currentIndex = pages.findIndex((page) => page.id === activePage);
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (currentIndex + direction + pages.length) % pages.length;
      setActivePage(pages[nextIndex].id);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activePage]);

  return (
    <main className="shell" aria-label="FocusBoard">
      <nav className="page-nav" aria-label="Pages">
        {pages.map((page) => (
          <button
            key={page.id}
            className={page.id === activePage ? "nav-button active" : "nav-button"}
            type="button"
            onClick={() => setActivePage(page.id)}
          >
            {page.label}
          </button>
        ))}
      </nav>

      {activePage === "focus" ? <FocusTerminal /> : <TodayPanel />}
    </main>
  );
}

function FocusTerminal() {
  const [now, setNow] = useState(new Date());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const { events, calendarStatus } = useTodayEvents();
  const { weather, weatherStatus } = useDayWeather();

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isRunning) return undefined;

    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning]);

  const stopwatchText = useMemo(
    () => formatStopwatch(elapsedSeconds),
    [elapsedSeconds],
  );
  const timeText = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateText = now.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startPauseLabel = isRunning ? "Pause" : "Start";

  const startOrPause = () => {
    setIsRunning((current) => !current);
  };

  const reset = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
  };

  return (
    <section className="terminal" aria-label="Focus Terminal">
      <div className="primary-panel">
        <header className="terminal-header">
          <div>
            <p className="eyebrow">Focus Terminal</p>
            <h1>{timeText}</h1>
            <p className="date-line">{dateText}</p>
          </div>
          {weather ? <WeatherCard weather={weather} /> : null}
        </header>

        <div className="timer-block" aria-live="polite">
          <p className="stopwatch-label">Elapsed focus time</p>
          <div className="timer">{stopwatchText}</div>
          <div className={isRunning ? "stopwatch-line running" : "stopwatch-line"} />
        </div>

        <div className="controls">
          <button className="control-button start" type="button" onClick={startOrPause}>
            <span aria-hidden="true">{isRunning ? "II" : ">"}</span>
            {startPauseLabel}
          </button>
          <button className="control-button reset" type="button" onClick={reset}>
            <span aria-hidden="true">R</span>
            Reset
          </button>
        </div>
      </div>

      <aside className="day-panel">
        <section className="day-section" aria-label="Today's events">
          <div className="section-heading">
            <p className="panel-label">Today</p>
            <span>{events.length}</span>
          </div>
          <EventList events={events} status={calendarStatus} />
        </section>

        <section className="day-section weather-section" aria-label="Today's weather">
          <div className="section-heading">
            <p className="panel-label">Forecast</p>
            {weather ? <span>{Math.round(weather.currentTemp)}°C</span> : null}
          </div>
          <ForecastList weather={weather} status={weatherStatus} />
        </section>
      </aside>
    </section>
  );
}

function TodayPanel() {
  const { events, calendarStatus } = useTodayEvents();
  const { weather, weatherStatus } = useDayWeather();

  return (
    <section className="today-panel" aria-label="Today">
      <div>
        <p className="eyebrow">Today</p>
        <h2>Calendar and forecast</h2>
      </div>
      <div className="today-grid">
        <section className="today-card">
          <p className="panel-label">Events</p>
          <EventList events={events} status={calendarStatus} />
        </section>
        <section className="today-card">
          <p className="panel-label">Weather</p>
          <ForecastList weather={weather} status={weatherStatus} />
        </section>
      </div>
    </section>
  );
}

function WeatherCard({ weather }: { weather: DayWeather }) {
  return (
    <aside className="weather-card" aria-label="Weather summary">
      <span>{weather.location}</span>
      <strong>{Math.round(weather.currentTemp)}°C</strong>
      <small>{weather.condition}</small>
    </aside>
  );
}

function EventList({
  events,
  status,
}: {
  events: CalendarEvent[];
  status: string;
}) {
  if (events.length === 0) {
    return <p className="empty-state">{status}</p>;
  }

  return (
    <ol className="event-list">
      {events.slice(0, 4).map((event) => (
        <li key={event.id}>
          <time>{formatEventTime(event.start)}</time>
          <span>{event.title}</span>
        </li>
      ))}
    </ol>
  );
}

function ForecastList({
  weather,
  status,
}: {
  weather: DayWeather | null;
  status: string;
}) {
  if (!weather) {
    return <p className="empty-state">{status}</p>;
  }

  return (
    <div className="forecast-list">
      <p className="forecast-summary">{weather.condition}</p>
      {weather.periods.map((period) => (
        <div key={period.label} className="forecast-row">
          <strong>{period.label}</strong>
          <span>{Math.round(period.temp)}°C</span>
          <small>{period.precipitation}% rain</small>
          <em>{period.condition}</em>
        </div>
      ))}
    </div>
  );
}

function useTodayEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendarStatus, setCalendarStatus] = useState("Loading calendar");

  useEffect(() => {
    const calendarId = import.meta.env.VITE_GOOGLE_CALENDAR_ID as
      | string
      | undefined;
    const apiKey = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY as
      | string
      | undefined;

    if (!calendarId || !apiKey) {
      setCalendarStatus("Calendar setup needed");
      return undefined;
    }

    let isActive = true;

    const loadEvents = async () => {
      try {
        const start = startOfToday();
        const end = endOfToday();
        const params = new URLSearchParams({
          key: apiKey,
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          singleEvents: "true",
          orderBy: "startTime",
          maxResults: "8",
        });
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          calendarId,
        )}/events?${params.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Calendar request failed: ${response.status}`);
        }

        const data = (await response.json()) as GoogleCalendarResponse;
        if (!isActive) return;

        const todayEvents = data.items
          .map((item) => ({
            id: item.id,
            title: item.summary ?? "Busy",
            start: new Date(item.start.dateTime ?? `${item.start.date}T00:00:00`),
            end: item.end
              ? new Date(item.end.dateTime ?? `${item.end.date}T00:00:00`)
              : undefined,
          }))
          .filter((event) => !Number.isNaN(event.start.getTime()));

        setEvents(todayEvents);
        setCalendarStatus(
          todayEvents.length > 0 ? "Calendar synced" : "No events today",
        );
      } catch (error) {
        console.error(error);
        if (isActive) setCalendarStatus("Calendar unavailable");
      }
    };

    void loadEvents();
    const interval = window.setInterval(loadEvents, 15 * 60 * 1000);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, []);

  return { events, calendarStatus };
}

function useDayWeather() {
  const [weather, setWeather] = useState<DayWeather | null>(null);
  const [weatherStatus, setWeatherStatus] = useState("Loading forecast");

  useEffect(() => {
    let isActive = true;

    const latitude = Number(import.meta.env.VITE_WEATHER_LAT ?? DEFAULT_LATITUDE);
    const longitude = Number(
      import.meta.env.VITE_WEATHER_LON ?? DEFAULT_LONGITUDE,
    );
    const location = import.meta.env.VITE_WEATHER_LOCATION ?? "Toronto";

    const loadWeather = async () => {
      try {
        const params = new URLSearchParams({
          latitude: String(latitude),
          longitude: String(longitude),
          current: "temperature_2m,weather_code",
          hourly: "temperature_2m,precipitation_probability,weather_code",
          forecast_days: "1",
          timezone: "auto",
        });
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error(`Weather request failed: ${response.status}`);
        }

        const data = (await response.json()) as OpenMeteoResponse;
        if (!isActive) return;

        setWeather({
          location,
          currentTemp: data.current.temperature_2m,
          condition: describeWeather(data.current.weather_code),
          periods: buildForecastPeriods(data.hourly),
        });
        setWeatherStatus("Forecast synced");
      } catch (error) {
        console.error(error);
        if (isActive) setWeatherStatus("Forecast unavailable");
      }
    };

    void loadWeather();
    const interval = window.setInterval(loadWeather, 30 * 60 * 1000);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, []);

  return { weather, weatherStatus };
}

type GoogleCalendarResponse = {
  items: Array<{
    id: string;
    summary?: string;
    start: {
      date?: string;
      dateTime?: string;
    };
    end?: {
      date?: string;
      dateTime?: string;
    };
  }>;
};

type OpenMeteoResponse = {
  current: {
    temperature_2m: number;
    weather_code: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
  };
};

type PeriodDefinition = {
  label: ForecastPeriod["label"];
  startHour: number;
  endHour: number;
};

const forecastPeriods: PeriodDefinition[] = [
  { label: "Morning", startHour: 6, endHour: 12 },
  { label: "Afternoon", startHour: 12, endHour: 18 },
  { label: "Night", startHour: 18, endHour: 24 },
];

function buildForecastPeriods(hourly: OpenMeteoResponse["hourly"]) {
  return forecastPeriods.map((period) => {
    const rows = hourly.time
      .map((time, index) => ({
        hour: new Date(time).getHours(),
        temp: hourly.temperature_2m[index],
        precipitation: hourly.precipitation_probability[index] ?? 0,
        code: hourly.weather_code[index],
      }))
      .filter(
        (row) => row.hour >= period.startHour && row.hour < period.endHour,
      );

    if (rows.length === 0) {
      return {
        label: period.label,
        temp: 0,
        precipitation: 0,
        condition: "Forecast",
      };
    }

    const temp =
      rows.reduce((total, row) => total + row.temp, 0) / rows.length;
    const precipitation = Math.max(...rows.map((row) => row.precipitation));
    const code = mostCommon(rows.map((row) => row.code));

    return {
      label: period.label,
      temp,
      precipitation,
      condition: describeWeather(code),
    };
  });
}

function mostCommon(values: number[]) {
  const counts = new Map<number, number>();
  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function formatEventTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatStopwatch(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

function describeWeather(code: number) {
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Storms";
  return "Forecast";
}

export default App;
