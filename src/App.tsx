import { useEffect, useState } from "react";

const DEFAULT_LATITUDE = 43.6532;
const DEFAULT_LONGITUDE = -79.3832;
const WORLD_CUP_SEASON = 2026;
const SCHEDULE_START_HOUR = 7;
const SCHEDULE_END_HOUR = 23;
const SCHEDULE_SPAN_HOURS = SCHEDULE_END_HOUR - SCHEDULE_START_HOUR;
const SCHEDULE_SPAN_MINUTES = SCHEDULE_SPAN_HOURS * 60;
const MIN_SCHEDULE_BLOCK_MINUTES = 110;

type PageId = "focus" | "today" | "weather" | "worldcup";

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end?: Date;
};

type ScheduleBlock = {
  event: CalendarEvent;
  topPercent: number;
  heightPercent: number;
};

type ForecastPeriod = {
  label: "Morning" | "Afternoon" | "Night";
  temp: number;
  precipitation: number;
  condition: string;
  isDaytime: boolean;
};

type DetailedForecastHour = {
  time: Date;
  temp: number;
  precipitation: number;
  condition: string;
  isDaytime: boolean;
};

type DetailedForecastDay = {
  date: Date;
  label: string;
  high: number;
  low: number;
  condition: string;
  precipitation: number;
  sunrise: Date;
  sunset: Date;
  hours: DetailedForecastHour[];
  periods: ForecastPeriod[];
};

type WorldCupMatch = {
  id: string;
  date: Date;
  state: string;
  statusText: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
};

type StandingRow = {
  team: string;
  rank: number;
  played: number;
  goalDiff: number;
  points: number;
};

type StandingGroup = {
  name: string;
  rows: StandingRow[];
};

const pages: Array<{ id: PageId; label: string }> = [
  { id: "focus", label: "Focus" },
  { id: "today", label: "Today" },
  { id: "weather", label: "Weather" },
  { id: "worldcup", label: "World Cup" },
];

function App() {
  const [activePage, setActivePage] = useState<PageId>("focus");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

      const currentIndex = pages.findIndex((page) => page.id === activePage);
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex =
        (currentIndex + direction + pages.length) % pages.length;
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
            className={
              page.id === activePage ? "nav-button active" : "nav-button"
            }
            type="button"
            onClick={() => setActivePage(page.id)}
          >
            {page.label}
          </button>
        ))}
      </nav>

      {activePage === "focus" ? (
        <FocusTerminal />
      ) : activePage === "today" ? (
        <TodayPanel />
      ) : activePage === "weather" ? (
        <WeatherForecastPanel />
      ) : (
        <WorldCupPanel />
      )}
    </main>
  );
}

function FocusTerminal() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const timeText = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateText = now.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <section className="focus-page" aria-label="Focus">
      <header className="focus-clock">
        <h1>{timeText}</h1>
        <p className="date-line">{dateText}</p>
      </header>
      <TodayPanel />
      <WeatherForecastPanel />
    </section>
  );
}

function TodayPanel() {
  const { events, calendarStatus } = useTodayEvents();

  return (
    <section className="today-panel" aria-label="Today">
      <section className="today-card today-schedule-card">
        <DaySchedule events={events} status={calendarStatus} />
      </section>
    </section>
  );
}

function WeatherForecastPanel() {
  const { days, chartHours, status } = useDetailedWeather();

  return (
    <section className="weather-panel" aria-label="Weather forecast">
      {days.length === 0 ? (
        <p className="empty-state">{status}</p>
      ) : (
        <div className="weather-grid">
          {days.map((day) => (
            <DailyForecastCard
              key={day.date.toISOString()}
              day={day}
              chartHours={chartHours}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function DailyForecastCard({
  day,
  chartHours,
}: {
  day: DetailedForecastDay;
  chartHours: DetailedForecastHour[];
}) {
  const isToday = day.label === "Today";

  return (
    <section className="weather-day-card">
      <div className="weather-day-heading">
        <p className="panel-label">{day.label}</p>
        <span>
          {day.date.toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      <div className="weather-day-summary">
        <span className="weather-icon weather-icon-lg" aria-hidden="true">
          {weatherIcon(day.condition)}
        </span>
        <strong>
          {Math.round(day.high)}° / {Math.round(day.low)}°
        </strong>
        <span>{day.condition}</span>
        <small>{day.precipitation}% rain</small>
      </div>

      <div className="weather-sun-row">
        <span>Sunrise {formatClockTime(day.sunrise)}</span>
        <span>Sunset {formatClockTime(day.sunset)}</span>
      </div>

      <div className="weather-chart-wrap">
        <TemperatureChart hours={isToday ? chartHours : day.hours} />
      </div>
      <PeriodForecastList periods={day.periods} />
    </section>
  );
}

function TemperatureChart({ hours }: { hours: DetailedForecastHour[] }) {
  const width = 600;
  const height = 220;
  const padding = 28;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  const temps = hours.map((hour) => hour.temp);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const range = maxTemp - minTemp || 1;

  const points = hours.map((hour, index) => ({
    hour,
    x: padding + (index / (hours.length - 1)) * plotWidth,
    y: padding + (1 - (hour.temp - minTemp) / range) * plotHeight,
  }));

  const linePath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`,
    )
    .join(" ");

  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${
    height - padding
  } L${points[0].x.toFixed(1)},${height - padding} Z`;

  return (
    <svg
      className="temp-chart"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Hourly temperature trend"
    >
      {points.map((point) => {
        const barHeight =
          (point.hour.precipitation / 100) * (plotHeight * 0.35);
        return (
          <rect
            key={`precip-${point.hour.time.toISOString()}`}
            className="temp-chart-precip"
            x={point.x - 6}
            y={height - padding - barHeight}
            width={12}
            height={barHeight}
          />
        );
      })}

      <path className="temp-chart-area" d={areaPath} />
      <path className="temp-chart-line" d={linePath} />

      {points.map((point, index) =>
        index % 3 === 0 ? (
          <g key={point.hour.time.toISOString()} className="temp-chart-tick">
            <circle cx={point.x} cy={point.y} r={3.5} />
            <text x={point.x} y={point.y - 10} textAnchor="middle">
              {Math.round(point.hour.temp)}°
            </text>
            <text
              x={point.x}
              y={height - 6}
              textAnchor="middle"
              className="temp-chart-hour"
            >
              {formatChartHour(point.hour.time)}
            </text>
          </g>
        ) : null,
      )}
    </svg>
  );
}

function PeriodForecastList({ periods }: { periods: ForecastPeriod[] }) {
  return (
    <div className="period-list">
      {periods.map((period) => (
        <div key={period.label} className="period-row">
          <span
            className="weather-icon"
            role="img"
            aria-label={period.condition}
          >
            {weatherIcon(period.condition, period.isDaytime)}
          </span>
          <strong>{period.label}</strong>
          <span>{Math.round(period.temp)}°C</span>
          <small>{period.precipitation}% rain</small>
        </div>
      ))}
    </div>
  );
}

function WorldCupPanel() {
  const { results, schedule, standings, worldCupStatus } = useWorldCup();

  return (
    <section className="worldcup-panel" aria-label="World Cup">
      <div>
        <h2>Scores, schedule and standings</h2>
      </div>
      <div className="worldcup-grid">
        <section className="worldcup-card">
          <p className="panel-label">Latest scores</p>
          <MatchList
            matches={results}
            status={worldCupStatus}
            emptyText="No recent matches"
          />
        </section>
        <section className="worldcup-card">
          <p className="panel-label">Schedule</p>
          <MatchList
            matches={schedule}
            status={worldCupStatus}
            emptyText="No upcoming matches"
          />
        </section>
        <section className="worldcup-card standings-card">
          <p className="panel-label">Standings</p>
          <StandingsTable groups={standings} status={worldCupStatus} />
        </section>
      </div>
    </section>
  );
}

function DaySchedule({
  events,
  status,
}: {
  events: CalendarEvent[];
  status: string;
}) {
  if (events.length === 0) {
    return <p className="empty-state">{status}</p>;
  }

  const hours: number[] = [];
  for (let hour = SCHEDULE_START_HOUR; hour <= SCHEDULE_END_HOUR; hour++) {
    hours.push(hour);
  }

  const blocks = events
    .map(toScheduleBlock)
    .filter((block): block is ScheduleBlock => block !== null);

  return (
    <div className="day-schedule">
      {hours.map((hour) => (
        <div
          key={hour}
          className="schedule-hour"
          style={{
            top: `${((hour - SCHEDULE_START_HOUR) / SCHEDULE_SPAN_HOURS) * 100}%`,
          }}
        >
          <span className="schedule-hour-label">
            {formatScheduleHour(hour)}
          </span>
          <span className="schedule-hour-line" />
        </div>
      ))}
      <div className="schedule-events">
        {blocks.map((block) => (
          <div
            key={block.event.id}
            className="schedule-event"
            style={{
              top: `${block.topPercent}%`,
              height: `${block.heightPercent}%`,
            }}
          >
            <strong>{block.event.title}</strong>
            <span>{formatEventTime(block.event.start)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchList({
  matches,
  status,
  emptyText,
}: {
  matches: WorldCupMatch[];
  status: string;
  emptyText: string;
}) {
  if (matches.length === 0) {
    return (
      <p className="empty-state">
        {status === "World Cup synced" ? emptyText : status}
      </p>
    );
  }

  return (
    <ol className="match-list">
      {matches.map((match) => (
        <li key={match.id}>
          <span className="match-teams">
            {match.homeTeam} <strong>{formatMatchScore(match)}</strong>{" "}
            {match.awayTeam}
          </span>
          <time>
            {match.state === "pre"
              ? formatMatchTime(match.date)
              : match.statusText}
          </time>
        </li>
      ))}
    </ol>
  );
}

function StandingsTable({
  groups,
  status,
}: {
  groups: StandingGroup[];
  status: string;
}) {
  if (groups.length === 0) {
    return <p className="empty-state">{status}</p>;
  }

  return (
    <div className="standings-scroll">
      {groups.map((group) => (
        <div key={group.name} className="standings-group">
          <p className="standings-group-name">{group.name}</p>
          <table className="standings-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>P</th>
                <th>GD</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map((row) => (
                <tr key={row.team}>
                  <td>{row.team}</td>
                  <td>{row.played}</td>
                  <td>{row.goalDiff}</td>
                  <td>{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
            start: new Date(
              item.start.dateTime ?? `${item.start.date}T00:00:00`,
            ),
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

function useDetailedWeather() {
  const [days, setDays] = useState<DetailedForecastDay[]>([]);
  const [chartHours, setChartHours] = useState<DetailedForecastHour[]>([]);
  const [status, setStatus] = useState("Loading forecast");

  useEffect(() => {
    let isActive = true;

    const latitude = Number(
      import.meta.env.VITE_WEATHER_LAT ?? DEFAULT_LATITUDE,
    );
    const longitude = Number(
      import.meta.env.VITE_WEATHER_LON ?? DEFAULT_LONGITUDE,
    );

    const loadWeather = async () => {
      try {
        const params = new URLSearchParams({
          latitude: String(latitude),
          longitude: String(longitude),
          hourly:
            "temperature_2m,precipitation_probability,weather_code,is_day",
          daily:
            "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
          forecast_days: "2",
          timezone: "auto",
        });
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error(`Weather request failed: ${response.status}`);
        }

        const data = (await response.json()) as OpenMeteoDailyResponse;
        if (!isActive) return;

        const built = buildDetailedForecastDays(data);
        setDays(built.days);
        setChartHours(built.chartHours);
        setStatus("Forecast synced");
      } catch (error) {
        console.error(error);
        if (isActive) setStatus("Forecast unavailable");
      }
    };

    void loadWeather();
    const interval = window.setInterval(loadWeather, 30 * 60 * 1000);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, []);

  return { days, chartHours, status };
}

function useWorldCup() {
  const [results, setResults] = useState<WorldCupMatch[]>([]);
  const [schedule, setSchedule] = useState<WorldCupMatch[]>([]);
  const [standings, setStandings] = useState<StandingGroup[]>([]);
  const [worldCupStatus, setWorldCupStatus] = useState("Loading World Cup");

  useEffect(() => {
    let isActive = true;

    const loadWorldCup = async () => {
      try {
        const dates = formatEspnDateRange(new Date(), 30);
        const [scoreboardResponse, standingsResponse] = await Promise.all([
          fetch(
            `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dates}`,
          ),
          fetch(
            `https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?season=${WORLD_CUP_SEASON}`,
          ),
        ]);

        if (!scoreboardResponse.ok || !standingsResponse.ok) {
          throw new Error("World Cup request failed");
        }

        const scoreboardData =
          (await scoreboardResponse.json()) as EspnScoreboardResponse;
        const standingsData =
          (await standingsResponse.json()) as EspnStandingsResponse;
        if (!isActive) return;

        const matches = scoreboardData.events.map(toWorldCupMatch);

        const finished = matches
          .filter((match) => match.state === "post")
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 5);

        const upcoming = matches
          .filter((match) => match.state !== "post")
          .sort((a, b) => a.date.getTime() - b.date.getTime())
          .slice(0, 5);

        setResults(finished);
        setSchedule(upcoming);
        setStandings(standingsData.children.map(toStandingGroup));
        setWorldCupStatus("World Cup synced");
      } catch (error) {
        console.error(error);
        if (isActive) setWorldCupStatus("World Cup unavailable");
      }
    };

    void loadWorldCup();
    const interval = window.setInterval(loadWorldCup, 2 * 60 * 1000);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, []);

  return { results, schedule, standings, worldCupStatus };
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

type OpenMeteoDailyResponse = {
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
    is_day: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    sunrise: string[];
    sunset: string[];
  };
};

type EspnScoreboardResponse = {
  events: Array<{
    id: string;
    date: string;
    competitions: Array<{
      competitors: Array<{
        homeAway: "home" | "away";
        score?: string;
        team: { displayName: string };
      }>;
      status: { type: { state: string; shortDetail: string } };
    }>;
  }>;
};

type EspnStandingsResponse = {
  children: Array<{
    name: string;
    standings: {
      entries: Array<{
        team: { displayName: string };
        stats: Array<{ name: string; value: number }>;
      }>;
    };
  }>;
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

const dayLabels = ["Today", "Tomorrow"];

function buildDetailedForecastDays(data: OpenMeteoDailyResponse): {
  days: DetailedForecastDay[];
  chartHours: DetailedForecastHour[];
} {
  const hours = data.hourly.time.map((time, index) => ({
    time: new Date(time),
    temp: data.hourly.temperature_2m[index],
    precipitation: data.hourly.precipitation_probability[index] ?? 0,
    condition: describeWeather(data.hourly.weather_code[index]),
    isDaytime: data.hourly.is_day[index] === 1,
  }));

  const days = data.daily.time.map((dateString, index) => {
    const date = new Date(`${dateString}T00:00:00`);
    const dayHours = hours.filter(
      (hour) => hour.time.getDate() === date.getDate(),
    );

    return {
      date,
      label: dayLabels[index] ?? formatDayLabel(date),
      high: data.daily.temperature_2m_max[index],
      low: data.daily.temperature_2m_min[index],
      condition: describeWeather(data.daily.weather_code[index]),
      precipitation: data.daily.precipitation_probability_max[index] ?? 0,
      sunrise: new Date(data.daily.sunrise[index]),
      sunset: new Date(data.daily.sunset[index]),
      hours: dayHours,
      periods: summarizeDayPeriods(dayHours),
    };
  });

  return { days, chartHours: buildRollingChartHours(hours) };
}

function buildRollingChartHours(
  hours: DetailedForecastHour[],
): DetailedForecastHour[] {
  const now = new Date();
  const currentHourStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
  );
  const startIndex = hours.findIndex(
    (hour) => hour.time.getTime() === currentHourStart.getTime(),
  );

  if (startIndex === -1) return hours.slice(0, 24);
  return hours.slice(startIndex, startIndex + 24);
}

function summarizeDayPeriods(hours: DetailedForecastHour[]): ForecastPeriod[] {
  return forecastPeriods.map((period) => {
    const rows = hours.filter(
      (hour) =>
        hour.time.getHours() >= period.startHour &&
        hour.time.getHours() < period.endHour,
    );

    if (rows.length === 0) {
      return {
        label: period.label,
        temp: 0,
        precipitation: 0,
        condition: "Forecast",
        isDaytime: true,
      };
    }

    const temp = rows.reduce((total, row) => total + row.temp, 0) / rows.length;
    const precipitation = Math.max(...rows.map((row) => row.precipitation));
    const condition = mostCommon(
      rows.map((row) => row.condition),
      "Forecast",
    );
    const isDaytime = rows[Math.floor(rows.length / 2)].isDaytime;

    return { label: period.label, temp, precipitation, condition, isDaytime };
  });
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString([], { weekday: "long" });
}

function mostCommon<T>(values: T[], fallback: T): T {
  const counts = new Map<T, number>();
  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
}

function toWorldCupMatch(
  event: EspnScoreboardResponse["events"][number],
): WorldCupMatch {
  const competition = event.competitions[0];
  const home = competition.competitors.find((c) => c.homeAway === "home");
  const away = competition.competitors.find((c) => c.homeAway === "away");
  const state = competition.status.type.state;
  const hasScore = state !== "pre";

  return {
    id: event.id,
    date: new Date(event.date),
    state,
    statusText: competition.status.type.shortDetail,
    homeTeam: home?.team.displayName ?? "TBD",
    awayTeam: away?.team.displayName ?? "TBD",
    homeScore: hasScore && home?.score != null ? Number(home.score) : null,
    awayScore: hasScore && away?.score != null ? Number(away.score) : null,
  };
}

function toStandingGroup(
  group: EspnStandingsResponse["children"][number],
): StandingGroup {
  const rows = group.standings.entries.map((entry) => {
    const stats = new Map(entry.stats.map((stat) => [stat.name, stat.value]));

    return {
      team: entry.team.displayName,
      rank: stats.get("rank") ?? 0,
      played: stats.get("gamesPlayed") ?? 0,
      goalDiff: stats.get("pointDifferential") ?? 0,
      points: stats.get("points") ?? 0,
    };
  });

  return {
    name: group.name,
    rows: rows.sort((a, b) => a.rank - b.rank),
  };
}

function formatEspnDateRange(center: Date, days: number) {
  const start = new Date(center);
  start.setDate(start.getDate() - days);
  const end = new Date(center);
  end.setDate(end.getDate() + days);
  return `${formatEspnDate(start)}-${formatEspnDate(end)}`;
}

function formatEspnDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatMatchScore(match: WorldCupMatch) {
  if (match.homeScore === null || match.awayScore === null) return "vs";
  return `${match.homeScore} - ${match.awayScore}`;
}

function formatMatchTime(date: Date) {
  return date.toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
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

function minutesFromScheduleStart(date: Date) {
  return (date.getHours() - SCHEDULE_START_HOUR) * 60 + date.getMinutes();
}

function toScheduleBlock(event: CalendarEvent): ScheduleBlock | null {
  const start = minutesFromScheduleStart(event.start);
  const end = event.end ? minutesFromScheduleStart(event.end) : start + 30;

  if (end <= 0 || start >= SCHEDULE_SPAN_MINUTES) return null;

  const clampedStart = Math.max(start, 0);
  const clampedEnd = Math.min(end, SCHEDULE_SPAN_MINUTES);

  const naturalHeightPercent =
    ((clampedEnd - clampedStart) / SCHEDULE_SPAN_MINUTES) * 100;
  const minHeightPercent =
    (MIN_SCHEDULE_BLOCK_MINUTES / SCHEDULE_SPAN_MINUTES) * 100;
  const heightPercent = Math.max(naturalHeightPercent, minHeightPercent);

  const naturalTopPercent = (clampedStart / SCHEDULE_SPAN_MINUTES) * 100;
  const topPercent = Math.min(naturalTopPercent, 100 - heightPercent);

  return { event, topPercent, heightPercent };
}

function formatScheduleHour(hour: number) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric" });
}

function formatClockTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatChartHour(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric" });
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

function weatherIcon(condition: string, isDaytime = true) {
  switch (condition) {
    case "Clear":
      return isDaytime ? "☀️" : "🌙";
    case "Partly cloudy":
      return isDaytime ? "⛅" : "☁️";
    case "Fog":
      return "🌫️";
    case "Drizzle":
      return isDaytime ? "🌦️" : "🌧️";
    case "Rain":
      return "🌧️";
    case "Snow":
      return "❄️";
    case "Storms":
      return "⛈️";
    default:
      return "🌡️";
  }
}

export default App;
