import { useEffect, useState } from "react";
import { palette } from "../../theme/tokens.js";

function format(date, timeZone, locale) {
  return date.toLocaleTimeString(locale || "en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone,
  });
}

function weatherMark(weather) {
  const code = weather?.weathercode;
  if (code == null) return "";
  if (code === 0) return "☀️";
  if (code === 1) return "🌤️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 95) return "⚡️";
  return "⛅";
}

function place(flag, time, weather) {
  const temp = weather?.temperature != null ? `${weatherMark(weather)} ${weather.temperature}°C` : "";
  return `${flag} ${time} ${temp}`.trim();
}

export function WorldClock({ secondCountry, homeWeather, awayWeather, isDark }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const c = palette(isDark);
  return (
    <div style={{ display: "flex", gap: 14, justifyContent: "flex-end", fontSize: 12, color: c.text, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
      <span>{place("🇺🇸", format(now, "America/New_York", "en-US"), homeWeather)}</span>
      <span>{place(secondCountry?.flag || "", format(now, secondCountry?.tz || "Asia/Kolkata", secondCountry?.locale), awayWeather)}</span>
    </div>
  );
}
