// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

//Reference to app div elemnt
const app: HTMLDivElement = document.querySelector<HTMLDivElement>("#app")!;

const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
app.append(controlPanelDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
app.append(statusPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
app.append(mapDiv);

//Insert latitude and longtitude of location into function.

const CARDSHOP = leaflet.latLng(37.357611933857534, -122.01823257084982);

// Tunable game parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 25;
const CACHE_SPAWN_PROBABILITY = 0.1;

const map = leaflet.map(document.getElementById("map")!, {
  center: CARDSHOP,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

//Player marker
const playerMarker = leaflet.marker(CARDSHOP);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// display player points
let playerPoints = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No Points Yet...";

function spawnCache(i: number, j: number) {
  const origin = CARDSHOP;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  // handing interactions
  rect.bindPopup(() => {
    let pointValue = Math.floor(luck([i, j, "initialValue"].toString()) * 100);

    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${i}, ${j}". It has value <span id="value">${pointValue}</span></div>
                <button id="poke">poke</button>`;

    popupDiv
      .querySelector<HTMLButtonElement>("#poke")!
      .addEventListener("click", () => {
        pointValue--;
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          pointValue.toString();
        playerPoints++;
        statusPanel.innerHTML = `${playerPoints} points accumulated`;
      });

    return popupDiv;
  });
}

//look around the neighborhood for caches to spawn
for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    // If location i,j is lucky enough spawn a cache
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}

const testButton = document.createElement("button");
testButton.innerHTML = "TESTBUTTON";
testButton.style.backgroundColor = "white";
testButton.id = "testbutton";
console.log(testButton.id);
app.append(testButton);

testButton.addEventListener("click", () => {
  alert("button has been clicked");
});
