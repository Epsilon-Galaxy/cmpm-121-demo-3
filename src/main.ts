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
const NEIGHBORHOOD_SIZE = 25;
const CACHE_SPAWN_PROBABILITY = 0.1;

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

// BASE COORDINATES
const _NULL_ISLAND_COORDINATES = {
  lat: 0,
  lng: 0,
};

//Insert latitude and longtitude of location into function.

const CARDSHOP = leaflet.latLng(37.357611933857534, -122.01823257084982);

// ORIGINS FROM STARTPOINT

const originLAT = Math.floor(CARDSHOP.lat / TILE_DEGREES);
const originLNG = Math.floor(CARDSHOP.lng / TILE_DEGREES);

const _cacheList: Cache[] = [];
const coinInventory: Coin[] = [];

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
interface Cache {
  coins: Coin[];
  cell: Cell;
}

//
const update_cache: Event = new Event("cacheChanged");

function createCache(i: number, j: number): Cache {
  const cache: Cache = {
    cell: { i: i, j: j },
    coins: [],
  };
  const numCoins = Math.floor(luck([i + j].toString()) * 10);

  for (let count = 0; count < numCoins; count++) {
    cache.coins.push({
      serialized: `SerialCoinNum_${i}_${j}_${count}`,
      cell: cache.cell,
      description: `SerialCoinNum_${i}_${j}_${count}`,
    });
  }

  return cache;
}

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
      playerPoints++;
      statusPanel.innerHTML = `${playerPoints} points accumulated`;
      popupText.dispatchEvent(update_cache);

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
      cache.coins.push(coinInventory.pop()!);
      statusPanel.innerHTML = `${playerPoints} points accumulated`;
      popupText.dispatchEvent(update_cache);

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

//Player marker -- Marks the player's location and creates a tooltip
const playerMarker = leaflet.marker(CARDSHOP);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// display player points
let playerPoints = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No Points Yet...";

// Spawns a cache at the desired location
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
      spawnCache(createCache(i, j));
    }
  }
}
