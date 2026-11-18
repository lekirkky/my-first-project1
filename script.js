// script.js: the main BRAIN of the page.
// It asks the weather service for data and puts the answers on the page.
//
// This project has three JavaScript files (index.html loads them in this order):
//   sky.js     = the sun and the drifting clouds
//   search.js  = typing in the search box + the suggestion dropdown
//   script.js  = this file: loads the weather and shows it


// ---------- 1. NAME TAGS ----------
// Like putting name tags on things so we can find them later.
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const suggestionList = document.getElementById("suggestions");

const cityName = document.getElementById("cityName");
const region = document.getElementById("region");
const icon = document.getElementById("icon");
const temp = document.getElementById("temp");
const description = document.getElementById("description");
const highLow = document.getElementById("highLow");

const tilesBox = document.getElementById("tiles");
const hourlyBox = document.getElementById("hourly");
const dailyBox = document.getElementById("daily");


// ---------- 2. WEATHER CODES ----------
// The weather service gives us a NUMBER (a "code") for the weather.
// This list turns each number into words and a picture.
function describeWeather(code) {
  if (code === 0) return { text: "Clear sky", emoji: "☀️", mood: "sunny" };
  if (code <= 3) return { text: "Partly cloudy", emoji: "⛅", mood: "cloudy" };
  if (code <= 48) return { text: "Foggy", emoji: "🌫️", mood: "misty" };
  if (code <= 67) return { text: "Rain", emoji: "🌧️", mood: "rainy" };
  if (code <= 77) return { text: "Snow", emoji: "❄️", mood: "snowy" };
  if (code <= 82) return { text: "Rain showers", emoji: "🌦️", mood: "rainy" };
  return { text: "Thunderstorm", emoji: "⛈️", mood: "stormy" };
}

// A sun looks silly at night, so at night we swap it for a moon (clear) or a plain cloud.
function iconFor(code, isDay) {
  if (isDay === 0) {
    if (code === 0) return "🌙";
    if (code <= 3) return "☁️";
  }
  return describeWeather(code).emoji;
}


// ---------- 3. SMALL HELPERS ----------

// Builds a page element: makeEl("p", "temp", "31") makes <p class="temp">31</p>
function makeEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

// Some values can be missing (null). This checks if we really have one.
function has(value) {
  return value !== null && value !== undefined;
}

// Wind direction comes as degrees (0 to 360). This turns it into N, NE, SW...
const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                 "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
function compassName(degrees) {
  return COMPASS[Math.round(degrees / 22.5) % 16];
}

// UV index to words (this is the scale the World Health Organization uses).
function uvLevel(uv) {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very high";
  return "Extreme";
}

// "2026-11-18T05:42" -> "05:42"
function clockTime(isoText) {
  return isoText.slice(11, 16);
}

// "2026-11-19" -> "Thu" (the first day is called "Today")
function dayName(dateText, index) {
  if (index === 0) return "Today";
  const parts = dateText.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("en-US", { weekday: "short" });
}


// ---------- 4. ASK THE FORECAST API ----------
// One request brings back everything. We list the pieces we want:
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const CURRENT_VARS = ["temperature_2m", "apparent_temperature", "relative_humidity_2m",
                      "pressure_msl", "wind_speed_10m", "wind_direction_10m",
                      "weather_code", "is_day"];
const HOURLY_VARS  = ["temperature_2m", "weather_code", "is_day",
                      "precipitation_probability", "uv_index", "visibility"];
const DAILY_VARS   = ["weather_code", "temperature_2m_max", "temperature_2m_min",
                      "precipitation_probability_max", "sunrise", "sunset"];

async function fetchForecast(place) {
  const url = FORECAST_URL +
    "?latitude=" + place.latitude +
    "&longitude=" + place.longitude +
    "&current=" + CURRENT_VARS.join(",") +
    "&hourly=" + HOURLY_VARS.join(",") +
    "&daily=" + DAILY_VARS.join(",") +
    "&timezone=auto&forecast_days=5";

  const response = await fetch(url);
  if (!response.ok) throw new Error("Forecast request failed");
  return await response.json();
}

// The hourly list starts at midnight today. This finds the entry for the current hour.
function findHourIndex(data) {
  const hourText = data.current.time.slice(0, 13);          // like "2026-11-18T14"
  const index = data.hourly.time.findIndex(function (t) { return t.startsWith(hourText); });
  return index === -1 ? 0 : index;
}


// ---------- 5. SHOW THE DATA (one small function per area of the page) ----------

// The big card at the top.
function renderCurrent(place, data) {
  const now = data.current;
  const look = describeWeather(now.weather_code);

  cityName.textContent = place.name;
  region.textContent = place.region;
  icon.textContent = iconFor(now.weather_code, now.is_day);
  temp.textContent = Math.round(now.temperature_2m) + "°C";
  description.textContent = look.text;
  highLow.textContent = "High " + Math.round(data.daily.temperature_2m_max[0]) + "°  /  Low " +
                        Math.round(data.daily.temperature_2m_min[0]) + "°";

  document.body.className = look.mood;   // switches the painting colors
  paintSky(look.mood);                   // sun and clouds (from sky.js)
}

// The 9 detail tiles. First we make a LIST of what each tile says...
function buildTiles(data, i) {
  const now = data.current;
  const hour = data.hourly;
  const today = data.daily;

  const feelsGap = now.apparent_temperature - now.temperature_2m;
  const feelsNote = feelsGap >= 2 ? "Feels warmer than it is"
                  : feelsGap <= -2 ? "Feels cooler than it is"
                  : "About the same as the air";

  const uv = hour.uv_index[i];
  const rain = hour.precipitation_probability[i];
  const rainPeak = today.precipitation_probability_max[0];

  const humidity = now.relative_humidity_2m;
  const humidityNote = humidity < 30 ? "Dry" : humidity <= 60 ? "Comfortable" : humidity <= 80 ? "Humid" : "Very humid";

  const pressure = now.pressure_msl;
  const pressureNote = pressure < 1009 ? "Low pressure" : pressure > 1022 ? "High pressure" : "Normal";

  const km = has(hour.visibility[i]) ? hour.visibility[i] / 1000 : null;
  const kmText = km === null ? "–" : (km >= 10 ? Math.round(km) : km.toFixed(1)) + " km";
  const kmNote = km === null ? "" : km >= 10 ? "Clear view" : km >= 4 ? "Hazy" : "Poor";

  return [
    { label: "Feels like",     value: Math.round(now.apparent_temperature) + "°", note: feelsNote },
    { label: "UV index",       value: has(uv) ? Math.round(uv) : "–",             note: has(uv) ? uvLevel(uv) : "" },
    { label: "Chance of rain", value: has(rain) ? rain + "%" : "–",               note: has(rainPeak) ? "Today's peak: " + rainPeak + "%" : "" },
    { label: "Wind",           value: Math.round(now.wind_speed_10m) + " km/h",   note: "From " + compassName(now.wind_direction_10m) },
    { label: "Humidity",       value: humidity + "%",                             note: humidityNote },
    { label: "Pressure",       value: Math.round(pressure) + " hPa",              note: pressureNote },
    { label: "Visibility",     value: kmText,                                     note: kmNote },
    { label: "Sunrise",        value: clockTime(today.sunrise[0]),                note: "Local time" },
    { label: "Sunset",         value: clockTime(today.sunset[0]),                 note: "Local time" }
  ];
}

// ...then ONE reusable function turns any list like that into tiles on the page.
// (To add a new tile later, add one line to the list above. Nothing else.)
function renderTiles(list) {
  tilesBox.replaceChildren();
  list.forEach(function (item) {
    const tile = makeEl("div", "tile");
    tile.append(
      makeEl("p", "tile-label", item.label),
      makeEl("p", "tile-value", item.value),
      makeEl("p", "tile-note", item.note)
    );
    tilesBox.appendChild(tile);
  });
}

// The scrolling strip with the next 24 hours.
function renderHourly(data, start) {
  const h = data.hourly;
  const end = Math.min(start + 24, h.time.length);

  hourlyBox.replaceChildren();
  for (let i = start; i < end; i++) {
    const chance = h.precipitation_probability[i];
    const item = makeEl("div", "hour");
    item.append(
      makeEl("p", "hour-time", i === start ? "Now" : clockTime(h.time[i])),
      makeEl("p", "hour-icon", iconFor(h.weather_code[i], h.is_day[i])),
      makeEl("p", "hour-temp", Math.round(h.temperature_2m[i]) + "°"),
      makeEl("p", "hour-rain", has(chance) && chance >= 10 ? "💧" + chance + "%" : "")
    );
    hourlyBox.appendChild(item);
  }
  hourlyBox.scrollLeft = 0;
}

// The 5 day list. Each row has a little bar showing how warm that day is
// compared with the other days.
function renderDaily(data) {
  const d = data.daily;
  const weekLow = Math.min(...d.temperature_2m_min);
  const weekHigh = Math.max(...d.temperature_2m_max);
  const span = (weekHigh - weekLow) || 1;          // never divide by zero

  dailyBox.replaceChildren();
  for (let i = 0; i < d.time.length; i++) {
    const low = d.temperature_2m_min[i];
    const high = d.temperature_2m_max[i];
    const chance = d.precipitation_probability_max[i];

    // The bar: where it starts, and how long it is (in percent of the track).
    const fill = makeEl("span");
    fill.style.left = Math.min((low - weekLow) / span * 100, 94) + "%";
    fill.style.width = Math.max((high - low) / span * 100, 6) + "%";
    const bar = makeEl("div", "range");
    bar.appendChild(fill);

    const row = makeEl("div", "day");
    row.append(
      makeEl("p", "day-name", dayName(d.time[i], i)),
      makeEl("p", "day-icon", iconFor(d.weather_code[i], 1)),
      makeEl("p", "day-rain", has(chance) && chance >= 10 ? "💧" + chance + "%" : ""),
      makeEl("p", "day-low", Math.round(low) + "°"),
      bar,
      makeEl("p", "day-high", Math.round(high) + "°")
    );
    dailyBox.appendChild(row);
  }
}


// ---------- 6. PUT IT ALL TOGETHER ----------
let loadCounter = 0;   // numbers each load, so a slow old answer can't overwrite a newer one

// Given a place (name + latitude + longitude), load and show its weather.
async function loadWeather(place) {
  const myNumber = ++loadCounter;
  cityName.textContent = "Loading...";
  region.textContent = "";

  try {
    const data = await fetchForecast(place);
    if (myNumber !== loadCounter) return;          // you already searched something newer

    const hourIndex = findHourIndex(data);
    renderCurrent(place, data);
    renderTiles(buildTiles(data, hourIndex));
    renderHourly(data, hourIndex);
    renderDaily(data);
  } catch (error) {
    cityName.textContent = "Something went wrong. Are you online?";
  }
}

// When you press Enter or the Search button without choosing a suggestion:
// find the best match for the text, then load its weather.
async function searchByText(text) {
  if (text === "") {
    cityName.textContent = "Please type a city name.";
    return;
  }
  cityName.textContent = "Searching...";
  region.textContent = "";

  try {
    const places = await findPlaces(text, 1);
    if (places.length === 0) {
      cityName.textContent = "I couldn't find that city. Check the spelling.";
      return;
    }
    cityInput.value = places[0].name;
    loadWeather(places[0]);
  } catch (error) {
    cityName.textContent = "Something went wrong. Are you online?";
  }
}


// ---------- 7. TELL THE PAGE WHEN TO RUN ----------
setupAutocomplete(cityInput, suggestionList, {
  onPick: loadWeather,       // you chose a suggestion
  onSubmit: searchByText     // you pressed Enter with no suggestion chosen
});

searchBtn.addEventListener("click", function () {
  searchByText(cityInput.value.trim());
});

// Run once when the page first opens.
searchByText(cityInput.value.trim());
