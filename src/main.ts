// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

import { Board, Cell } from "./board.ts";
import { Player } from "./player.ts";

// Location of our classroom (as identified on Google Maps)
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);
const NULL_ISLAND = leaflet.latLng(0, 0);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
export const CACHE_SPAWN_PROBABILITY = 0.1;

// Global values.
// let playerCoins = 0; // deprecated. use player.coins.length instead.
// const cacheValues = new Map<string, number>(); // deprecated. replace with board object.
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

// ------------------------------------------------
// UI ELEMENTS
// ------------------------------------------------
// grab main div from html.
const app = document.getElementById("app")!;

// control panel DIV.
const controlPanel = document.createElement("div");
app.appendChild(controlPanel);
controlPanel.style.width = "100%";
controlPanel.style.height = "50px";
controlPanel.style.position = "absolute";
controlPanel.style.top = "0";
controlPanel.style.left = "0";
controlPanel.style.backgroundColor = "rgba(0,0,0,0.2)";

// map panel div.
const mapPanel = document.createElement("div");
app.appendChild(mapPanel);
mapPanel.style.width = "100%";
mapPanel.style.height = "calc(100% - 100px)";
mapPanel.style.position = "absolute";
mapPanel.style.top = "50px";
mapPanel.style.left = "0";
mapPanel.id = "map";

// status panel div.
const statusPanel = document.createElement("div");
app.appendChild(statusPanel);
statusPanel.style.width = "100%";
statusPanel.style.height = "50px";
statusPanel.style.position = "absolute";
statusPanel.style.bottom = "0";
statusPanel.style.left = "0";
statusPanel.style.backgroundColor = "rgba(0,0,0,0.2)";
statusPanel.innerHTML = `You don't have any coins! Collect some from caches.`;

// ------------------------------------------------
// GAMEPLAY
// ------------------------------------------------

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(document.getElementById("map")!, {
  center: NULL_ISLAND,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Create the player
const player = new Player(OAKES_CLASSROOM, map);

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

function createCaches() {
  const location = player.getLocation();

  for (const neighbor of board.getCellsNearPoint(location)) {
    if (board.calculateLuckiness(neighbor) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(neighbor); // adds a clickable to map for cache.
    }
  }
}

function updateStatusPanel() {
  statusPanel.innerHTML = `Player has ${player.getCoinCount()} coins.`;
}

// create a map object for player interactivity.
//    should NOT interact with game data.
function spawnCache(cellToSpawn: Cell) {
  if (!(board.calculateLuckiness(cellToSpawn) < CACHE_SPAWN_PROBABILITY)) {
    console.log("attempted to spawnCache() in non-cache cell.");
    return;
  }
  const bounds = board.getCellBounds(cellToSpawn);
  const cache = board.getCacheForCell(cellToSpawn)!;

  // rects are temporary map objects we will spawn and then attach to their respective cache.
  const rect = leaflet.rectangle(bounds, { color: "red", weight: 1 });
  rect.addTo(map);
  rect.bindTooltip(stringifyCell(cellToSpawn));

  rect.bindPopup(() => {
    // setup a div popup at this cache with collect/deposit buttons.
    const popupDiv = document.createElement("div");
    const popupText = document.createElement("div");
    popupText.innerText =
      `You found a cache! ${cache.coins.length} coins here.`;
    popupDiv.appendChild(popupText);

    const withdrawButton = document.createElement("button");
    withdrawButton.innerText = "Collect";
    withdrawButton.style.backgroundColor = "#aaffaa";
    withdrawButton.style.color = "black";
    popupDiv.appendChild(withdrawButton);

    const depositButton = document.createElement("button");
    depositButton.innerText = "Deposit";
    depositButton.style.backgroundColor = "#aaaaff";
    depositButton.style.color = "black";
    popupDiv.appendChild(depositButton);

    // add event listeners
    withdrawButton.addEventListener("click", () => {
      if (cache.coins.length > 0) {
        const coin = cache.coins.pop()!; // pointValue--;
        player.addCoin(coin); // playerCoins++;
        // cacheValues.set(key, pointValue);
        popupText.innerText =
          `You found a cache! ${cache.coins.length} coins here.`;
        updateStatusPanel();
      }
    });
    depositButton.addEventListener("click", () => {
      if (player.getCoinCount() > 0) {
        const coin = player.getCoin()!; // playerCoins--;
        cache.coins.push(coin); // pointValue++;
        // cacheValues.set(key, pointValue);
        popupText.innerText =
          `You found a cache! ${cache.coins.length} coins here.`;
        updateStatusPanel();
      }
    });
    return popupDiv;
  });
}

// make some unique string out of the coordinates
export function stringifyCell(cell: Cell): string {
  const { i, j } = cell;
  return `${i}:${j}`;
}

function updateView() {
  const playerLocation = player.getLocation();
  map.setView(playerLocation, GAMEPLAY_ZOOM_LEVEL);
}

updateView();
createCaches();
