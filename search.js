// search.js: everything about FINDING PLACES while you type.
// It uses Open-Meteo's free Geocoding API:  text goes in, a list of places comes out.

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

// Ask the Geocoding API for places that match some text.
// It gives back a list like:
//   [ { name: "New York", region: "New York, United States", latitude: 40.71, longitude: -74.01 }, ... ]
async function findPlaces(text, count = 5) {
  const url = GEOCODING_URL + "?name=" + encodeURIComponent(text) +
              "&count=" + count + "&language=en&format=json";
  const response = await fetch(url);
  if (!response.ok) throw new Error("Place search failed");

  const data = await response.json();
  const results = data.results || [];     // no matches = the answer has no "results" at all

  return results.map(function (r) {
    return {
      name: r.name,
      region: [r.admin1, r.country].filter(Boolean).join(", "),   // e.g. "Minnesota, United States"
      latitude: r.latitude,
      longitude: r.longitude
    };
  });
}

// Connects a text box to a dropdown list of suggestions.
//   input    = the text box
//   list     = the <ul> that will hold the suggestions
//   handlers = { onPick(place), onSubmit(text) }, two jobs for script.js to do:
//              onPick   = you chose a suggestion
//              onSubmit = you pressed Enter without choosing one
function setupAutocomplete(input, list, handlers) {
  let places = [];       // the suggestions being shown right now
  let activeIndex = -1;  // which suggestion is highlighted (-1 means none)
  let timer = null;      // the "wait until typing stops" timer
  let latest = 0;        // numbers each lookup, so old answers can be ignored

  function close() {
    latest++;            // anything still on its way is now out of date
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    places = [];
    activeIndex = -1;
  }

  function highlight(index) {
    activeIndex = index;
    for (let i = 0; i < list.children.length; i++) {
      list.children[i].classList.toggle("is-active", i === index);
      list.children[i].setAttribute("aria-selected", i === index ? "true" : "false");
    }
  }

  function pick(place) {
    input.value = place.name;
    close();
    handlers.onPick(place);
  }

  function show(found) {
    list.replaceChildren();
    if (found.length === 0) { close(); return; }
    places = found;
    activeIndex = -1;

    found.forEach(function (place, index) {
      const item = document.createElement("li");
      item.setAttribute("role", "option");

      const name = document.createElement("span");
      name.className = "s-name";
      name.textContent = place.name;

      const region = document.createElement("span");
      region.className = "s-region";
      region.textContent = place.region;

      item.append(name, region);

      // "mousedown" (not "click") happens BEFORE the text box loses focus,
      // so the list is still there when we need it.
      item.addEventListener("mousedown", function (event) {
        event.preventDefault();
        pick(place);
      });
      item.addEventListener("mouseenter", function () { highlight(index); });

      list.appendChild(item);
    });

    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  async function lookUp() {
    const text = input.value.trim();
    if (text.length < 3) { close(); return; }   // too short to guess

    const myNumber = ++latest;
    try {
      const found = await findPlaces(text, 5);
      if (myNumber !== latest) return;          // you kept typing, so this answer is out of date
      show(found);
    } catch (error) {
      close();                                  // if something fails, just hide the list
    }
  }

  // Every time you type: restart a 0.3 second timer. When it finishes, look up places.
  input.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(lookUp, 300);
  });

  // Keyboard: arrows move, Enter chooses, Escape closes.
  input.addEventListener("keydown", function (event) {
    if (event.key === "ArrowDown" && places.length > 0) {
      event.preventDefault();
      highlight((activeIndex + 1) % places.length);
    } else if (event.key === "ArrowUp" && places.length > 0) {
      event.preventDefault();
      highlight(activeIndex <= 0 ? places.length - 1 : activeIndex - 1);
    } else if (event.key === "Enter") {
      clearTimeout(timer);
      if (activeIndex >= 0) {
        pick(places[activeIndex]);
      } else {
        close();
        handlers.onSubmit(input.value.trim());
      }
    } else if (event.key === "Escape") {
      close();
    }
  });

  // Clicking somewhere else hides the list.
  input.addEventListener("blur", close);
}
