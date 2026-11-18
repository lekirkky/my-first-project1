// JavaScript = the BRAIN. It makes the page DO things.

// Step 1: grab the pieces of the page we want to change.
// Think of it like putting name tags on things so we can find them later.
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const cityName = document.getElementById("cityName");
const icon = document.getElementById("icon");
const temp = document.getElementById("temp");
const description = document.getElementById("description");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");

// Step 2: the weather service gives us a NUMBER (a "code") for the weather.
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

// Step 3: the main job. "async" means "this might take a moment,
// because we have to wait for the internet to answer."
async function getWeather() {
  const city = cityInput.value.trim();
  if (city === "") {
    cityName.textContent = "Please type a city name.";
    return;
  }
  cityName.textContent = "Loading...";

  try {
    // 3a. Ask: "Where on Earth is this city?" (we get its latitude and longitude)
    const placeUrl = "https://geocoding-api.open-meteo.com/v1/search?count=1&name=" + encodeURIComponent(city);
    const placeResponse = await fetch(placeUrl);
    const placeData = await placeResponse.json();

    if (!placeData.results) {
      cityName.textContent = "I couldn't find that city. Check the spelling.";
      return;
    }
    const place = placeData.results[0];

    // 3b. Ask: "What's the weather at that spot right now?"
    const weatherUrl =
      "https://api.open-meteo.com/v1/forecast?latitude=" + place.latitude +
      "&longitude=" + place.longitude +
      "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code" +
      "&timezone=auto";
    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();
    const now = weatherData.current;

    // 3c. Put the answers onto the page.
    const look = describeWeather(now.weather_code);
    cityName.textContent = place.name + ", " + place.country;
    icon.textContent = look.emoji;
    temp.textContent = Math.round(now.temperature_2m) + "°C";
    description.textContent = look.text;
    humidity.textContent = now.relative_humidity_2m + "%";
    wind.textContent = now.wind_speed_10m + " km/h";

    // 3d. Change the sky color to match the weather.
    document.body.className = look.mood;

  } catch (error) {
    // If anything goes wrong (like no internet), we land here.
    cityName.textContent = "Something went wrong. Are you online?";
  }
}

// Step 4: tell the page WHEN to run our job.
searchBtn.addEventListener("click", getWeather);          // when the button is clicked
cityInput.addEventListener("keydown", function (event) {  // or when Enter is pressed
  if (event.key === "Enter") getWeather();
});

// Also run it once when the page first opens.
getWeather();
