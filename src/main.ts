// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";
import _viteConfig from "../vite.config.js";

// Game Parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 10;
const CACHE_SPAWN_PROBABILITY = 0.1;

//Reference to app div elemnt
const app: HTMLDivElement = document.querySelector<HTMLDivElement>("#app")!;

const enableLocation = createButton("🌐", () => {
  if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition((position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const newLoc: Cell = { i: lat, j: lng };
      tempMarker = leaflet.latLng([newLoc.i, newLoc.j]);
      playerMarker.setLatLng(tempMarker);
      resetView();
      populateArea(
        Math.floor(lat / TILE_DEGREES),
        Math.floor(lng / TILE_DEGREES),
      );
    });
  }
});
app.append(enableLocation);

const resetData = createButton("🚮", () => {
  const sign = prompt("Are you sure you want to reset? Type yes");
  if (sign == "yes") {
    localStorage.clear();
    location.reload();
  }
});
app.append(resetData);

const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
app.append(controlPanelDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
app.append(statusPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
app.append(mapDiv);

// BASE COORDINATES
const _NULL_ISLAND_COORDINATES = {
  lat: 0,
  lng: 0,
};

//Insert latitude and longtitude of location into function.

const CARDSHOP = leaflet.latLng(37.357611933857534, -122.01823257084982);

let tempMarker: leaflet.LatLng = CARDSHOP;

// ORIGINS FROM STARTPOINT

const originLAT = Math.floor(CARDSHOP.lat / TILE_DEGREES);
const originLNG = Math.floor(CARDSHOP.lng / TILE_DEGREES);

const _cacheList: Cache[] = [];
let coinInventory: Coin[] = [];

if (localStorage.getItem("coinInventory")) {
  coinInventory = JSON.parse(localStorage.getItem("coinInventory")!);
}

let momentos: { [key: string]: string } = {};
if (localStorage.getItem("momentos")) {
  momentos = JSON.parse(localStorage.getItem("momentos")!);
  console.log(momentos);
}
// Interfaces for caches and cache components
interface Coin {
  serialized: string;
  cell: Cell;
  description: string;
}

// Cell interface
interface Cell {
  i: number;
  j: number;
}

// Using the flyweight pattern holds objects rather than holding everything in the object
// Using the momento pattern to preserve its state through dissapearance and appearance
interface Cache {
  coins: Coin[];
  cell: Cell;
  toMomento(): string;
  fromMomento(momento: string): void;
}

//event to update cache
const update_cache: Event = new Event("cacheChanged");

// Initializes a cache at position i, j with a randomized
// amouint of unique coins as a list using the interfaces for
// both objects
function createCache(i: number, j: number): Cache {
  const cache: Cache = {
    cell: { i: i, j: j },
    coins: [],
    toMomento() {
      return JSON.stringify(this.coins);
    },
    fromMomento(momento: string) {
      this.coins = JSON.parse(momento);
    },
  };
  const numCoins = Math.floor(luck([i + j].toString()) * 10);

  if ([i, j].toString() in momentos) {
    cache.fromMomento(momentos[[i, j].toString()]);
  } else {
    for (let count = 0; count < numCoins; count++) {
      cache.coins.push({
        serialized: `SerialCoinNum_${i}_${j}_${count}`,
        cell: cache.cell,
        description: `SerialCoinNum_${i}_${j}_${count}`,
      });
    }
  }

  //sets a dictionary pair of the location of a cache and its momento
  momentos[[i, j].toString()] = cache.toMomento();
  localStorage.setItem("momentos", JSON.stringify(momentos));

  return cache;
}

// PopupText handles the text popup representing collecting and depoiting
// Of unique coins at each cache as well as displays each unique coin
// As a vertical list in the popup.
function PopupText(cache: Cache): HTMLElement {
  const popupText = document.createElement("div");
  popupText.innerHTML =
    `<div>There is a cache here at "${cache.cell.i}, ${cache.cell.j}".</div>`;
  const coinsContainer: HTMLElement = document.createElement("div");
  for (const coin of cache.coins) {
    const coins: HTMLElement = document.createElement("li");
    coins.innerHTML = coin.description;
    coinsContainer.append(coins);
  }
  popupText.append(coinsContainer);

  const collectButton = createButton("Collect", () => {
    if (cache.coins.length > 0) {
      coinInventory.push(cache.coins.pop()!);
      localStorage.setItem("coinInventory", JSON.stringify(coinInventory));
      playerPoints++;
      localStorage.setItem("playerPoints", playerPoints.toString());
      statusPanel.innerHTML = `${playerPoints} points accumulated`;
      popupText.dispatchEvent(update_cache);
      momentos[[cache.cell.i, cache.cell.j].toString()] = cache.toMomento();
      localStorage.setItem("momentos", JSON.stringify(momentos));

      coinsContainer.innerHTML = "";
      for (const coin of cache.coins) {
        const coins: HTMLElement = document.createElement("li");
        coins.innerHTML = coin.description;
        coinsContainer.append(coins);
      }
    }
  });

  const depositButton = createButton("Deposit", () => {
    if (coinInventory.length > 0) {
      playerPoints--;
      localStorage.setItem("playerPoints", playerPoints.toString());
      cache.coins.push(coinInventory.pop()!);
      localStorage.setItem("coinInventory", JSON.stringify(coinInventory));
      statusPanel.innerHTML = `${playerPoints} points accumulated`;
      popupText.dispatchEvent(update_cache);
      momentos[[cache.cell.i, cache.cell.j].toString()] = cache.toMomento();
      localStorage.setItem("momentos", JSON.stringify(momentos));

      coinsContainer.innerHTML = "";
      for (const coin of cache.coins) {
        const coins: HTMLElement = document.createElement("li");
        coins.innerHTML = coin.description;
        coinsContainer.append(coins);
      }
    }
  });

  popupText.append(depositButton);
  popupText.append(collectButton);
  return popupText;
}

// Function used to create buttons in the popup
function createButton(
  text: string,
  eventHandler: () => void,
): HTMLButtonElement {
  const tempButton = document.createElement("button");
  tempButton.innerHTML = text;
  tempButton.style.backgroundColor = "powderblue";
  tempButton.addEventListener("click", eventHandler);
  return tempButton;
}

// Map creation using parameters
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

const cacheLayer: leaflet.LayerGroup = leaflet.layerGroup().addTo(map);

//Player marker -- Marks the player's location and creates a tooltip
const playerMarker = leaflet.marker(CARDSHOP);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// movement

// display player points

let playerPoints = parseInt(localStorage.getItem("playerPoints")!) || 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;

if (playerPoints > 0) {
  statusPanel.innerHTML = `${playerPoints} points accumulated`;
} else {
  statusPanel.innerHTML = "No Points Yet...";
}

// Spawns a cache at the desired location and sets up popup interaction
// For each cache that is spawned
function spawnCache(cache: Cache) {
  const rect = leaflet.rectangle([
    [cache.cell.i * TILE_DEGREES, cache.cell.j * TILE_DEGREES],
    [(cache.cell.i + 1) * TILE_DEGREES, (cache.cell.j + 1) * TILE_DEGREES],
  ]);
  rect.addTo(map);

  addEventListener(`cache_changed_${cache.cell.i}_${cache.cell.j}`, () => {
    rect.setPopupContent(PopupText(cache));
  });
  rect.addEventListener("click", () => {
    rect.bindPopup(PopupText(cache)).openPopup();
  });
}

//Goes through the neighbor grid and sees if a tile would spawn based on the tile's luck with the luck module
for (
  let i = originLAT - NEIGHBORHOOD_SIZE;
  i < originLAT + NEIGHBORHOOD_SIZE;
  i++
) {
  for (
    let j = originLNG - NEIGHBORHOOD_SIZE;
    j < originLNG + NEIGHBORHOOD_SIZE;
    j++
  ) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      // If a cache ends up being created it will spawn
      // a created cache at location [i, j]
      spawnCache(createCache(i, j));
    }
  }
}

function populateArea(lat: number, lng: number) {
  for (
    let i = lat - NEIGHBORHOOD_SIZE;
    i < lat + NEIGHBORHOOD_SIZE;
    i++
  ) {
    for (
      let j = lng - NEIGHBORHOOD_SIZE;
      j < lng + NEIGHBORHOOD_SIZE;
      j++
    ) {
      if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
        // If a cache ends up being created it will spawn
        // a created cache at location [i, j]
        spawnCache(createCache(i, j));
      }
    }
  }
}

function _visibleCaches(cache: Cache) {
  const rect = leaflet.rectangle([[
    cache.cell.i * TILE_DEGREES,
    cache.cell.j * TILE_DEGREES,
  ], [(cache.cell.i + 1) * TILE_DEGREES, (cache.cell.j + 1) * TILE_DEGREES]]);
  rect.addTo(map);
  cacheLayer.addLayer(rect);

  addEventListener(`cache_changed_${cache.cell.i}_${cache.cell.j}`, () => {
    rect.setPopupContent(PopupText(cache));
  });
  rect.addEventListener("click", () => {
    rect.bindPopup(PopupText(cache)).openPopup();
  });
}

const tempDiv: HTMLElement = document.createElement("div");
const tempDiv2: HTMLElement = document.createElement("div");

const moveUpButton = createButton("⬆️", () => {
  tempMarker = leaflet.latLng(tempMarker.lat + TILE_DEGREES, tempMarker.lng);
  playerMarker.setLatLng(tempMarker);
  resetView();
  localStorage.setItem("tempMarker", JSON.stringify(tempMarker));
  movement.push(playerMarker.getLatLng());
  updatePolyLine(movement);
  localStorage.setItem("movement", JSON.stringify(movement));
});
app.append(moveUpButton);
app.append(tempDiv);
const moveLeftButton = createButton("⬅️", () => {
  tempMarker = leaflet.latLng(tempMarker.lat, tempMarker.lng - TILE_DEGREES);
  playerMarker.setLatLng(tempMarker);
  resetView();
  localStorage.setItem("tempMarker", JSON.stringify(tempMarker));
  movement.push(playerMarker.getLatLng());
  updatePolyLine(movement);
  localStorage.setItem("movement", JSON.stringify(movement));
});
app.append(moveLeftButton);
const moveRightButton = createButton("➡️", () => {
  tempMarker = leaflet.latLng(tempMarker.lat, tempMarker.lng + TILE_DEGREES);
  playerMarker.setLatLng(tempMarker);
  resetView();
  localStorage.setItem("tempMarker", JSON.stringify(tempMarker));
  movement.push(playerMarker.getLatLng());
  updatePolyLine(movement);
  localStorage.setItem("movement", JSON.stringify(movement));
});
app.append(moveRightButton);
app.append(tempDiv2);
const moveDownButton = createButton("⬇️", () => {
  tempMarker = leaflet.latLng(tempMarker.lat - TILE_DEGREES, tempMarker.lng);
  playerMarker.setLatLng(tempMarker);
  resetView();
  localStorage.setItem("tempMarker", JSON.stringify(tempMarker));
  movement.push(playerMarker.getLatLng());
  updatePolyLine(movement);
  localStorage.setItem("movement", JSON.stringify(movement));
});
app.append(moveDownButton);

function resetView() {
  map.setView(tempMarker, GAMEPLAY_ZOOM_LEVEL);
}

if (localStorage.getItem("tempMarker")) {
  tempMarker = JSON.parse(localStorage.getItem("tempMarker")!);
  playerMarker.setLatLng(tempMarker);
  resetView();
}

let movement: leaflet.LatLng[] = [playerMarker.getLatLng()];
if (localStorage.getItem("movement")) {
  movement = JSON.parse(localStorage.getItem("movement")!);
}

const polyLine = leaflet.polyline(movement, { color: "red" }).addTo(map);
updatePolyLine(movement);
function updatePolyLine(pastMovement: leaflet.LatLng[]) {
  polyLine.setLatLngs(pastMovement);
}
