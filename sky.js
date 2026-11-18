// sky.js: the living sky (the sun and the drifting clouds).
// This code was moved here from script.js without changes.
// script.js calls paintSky(mood) whenever the weather changes.

// ---------- THE LIVING SKY ----------
// This part builds the drifting clouds and dims or brightens the sun.

const sky = document.getElementById("sky");
const cloudLayer = document.getElementById("cloudLayer");

// One row per weather. To add a new weather later, add one row here.
//   clouds = how many clouds     sun   = sun brightness (0 = gone, 1 = full)
//   speed  = how fast they drift (1 = normal, bigger = faster)
const SKY_SETTINGS = {
  sunny:  { clouds: 4,  sun: 1,    speed: 1   },
  cloudy: { clouds: 9,  sun: 0.25, speed: 0.8 },
  rainy:  { clouds: 11, sun: 0,    speed: 1.1 },
  stormy: { clouds: 13, sun: 0,    speed: 1.8 },
  snowy:  { clouds: 8,  sun: 0.3,  speed: 0.7 },
  misty:  { clouds: 6,  sun: 0.4,  speed: 0.5 }
};

let currentSkyMood = "";   // remembers which weather the sky is showing

// A little helper: gives a random number between min and max.
function random(min, max) {
  return min + Math.random() * (max - min);
}

// The cloud recipe. Every call bakes ONE new cloud.
function makeCloud(speed) {
  const cloud = document.createElement("div");
  cloud.className = "cloud";

  // Each cloud is 5 soft blobs piled together (the CSS shapes them).
  for (let i = 0; i < 5; i++) {
    const puff = document.createElement("span");
    puff.className = "puff";
    cloud.appendChild(puff);
  }

  // Give this cloud its own random settings. The CSS reads them.
  const trip = random(110, 200) / speed;                   // seconds for one full trip
  cloud.style.setProperty("--y", random(2, 55) + "%");     // how high in the sky
  cloud.style.setProperty("--x", random(0, 80) + "%");     // spot used if animations are turned off
  cloud.style.setProperty("--s", random(0.6, 1.5).toFixed(2));        // size
  cloud.style.setProperty("--flip", Math.random() < 0.5 ? 1 : -1);    // face left or right
  cloud.style.setProperty("--dur", trip.toFixed(0) + "s");
  cloud.style.setProperty("--delay", "-" + random(0, trip).toFixed(0) + "s");  // negative = already part-way across
  cloud.style.setProperty("--o", random(0.65, 1).toFixed(2));         // see-through amount
  return cloud;
}

// Set up the sky for a weather mood ("sunny", "rainy", ...)
function paintSky(mood) {
  const settings = SKY_SETTINGS[mood] || SKY_SETTINGS.sunny;

  // Dim or brighten the sun (the CSS fades it smoothly).
  sky.style.setProperty("--sun-opacity", settings.sun);

  // Same weather as before? Keep the current clouds, don't rebuild.
  if (mood === currentSkyMood) return;
  currentSkyMood = mood;

  cloudLayer.replaceChildren();   // remove the old clouds
  for (let i = 0; i < settings.clouds; i++) {
    cloudLayer.appendChild(makeCloud(settings.speed));
  }
}
