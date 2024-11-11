// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

import { Board, Cell, Coin } from "./board.ts";
import { Player } from "./player.ts";

import { initButton, initControlPanel } from "./controlPanel.ts";
import { promiseCurrentGeolocation } from "./geolocation.ts";

// Location of our classroom (as identified on Google Maps)
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);
const NULL_ISLAND = leaflet.latLng(0, 0);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const GEOLOCATION_UPDATE_INTERVAL = 1000;
export const CACHE_SPAWN_PROBABILITY = 0.1;

// Global values.
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
let geolocationActivated = false;

// ------------------------------------------------
// UI ELEMENTS
// ------------------------------------------------
// grab main div from html.
const app = document.getElementById("app")!;

// CONTROL PANEL DIV ------------------------------
const controlPanel = initControlPanel();
app.appendChild(controlPanel);
// add up left down right buttons to controlPanel
const upButton = initButton("⬆️");
const leftButton = initButton("⬅️");
const downButton = initButton("⬇️");
const rightButton = initButton("➡️");
// add geo button
const geoButton = initButton("🌐");
geoButton.addEventListener("click", () => {
  // toggle hide up left right down buttons
  upButton.hidden = !upButton.hidden;
  leftButton.hidden = !leftButton.hidden;
  downButton.hidden = !downButton.hidden;
  rightButton.hidden = !rightButton.hidden;

  geolocationActivated = !geolocationActivated;
  console.log("geolocationActivated: ", geolocationActivated);
});
// add event listeners
upButton.addEventListener("click", () => {
  const oldLoc = player.getLocation();
  player.moveUp();
  const newLoc = player.getLocation();
  if (crossedCellBoundary(oldLoc, newLoc)) {
    refreshCaches();
  }
});
leftButton.addEventListener("click", () => {
  const oldLoc = player.getLocation();
  player.moveLeft();
  const newLoc = player.getLocation();
  if (crossedCellBoundary(oldLoc, newLoc)) {
    refreshCaches();
  }
});

downButton.addEventListener("click", () => {
  const oldLoc = player.getLocation();
  player.moveDown();
  const newLoc = player.getLocation();
  if (crossedCellBoundary(oldLoc, newLoc)) {
    refreshCaches();
  }
});
rightButton.addEventListener("click", () => {
  const oldLoc = player.getLocation();
  player.moveRight();
  const newLoc = player.getLocation();
  if (crossedCellBoundary(oldLoc, newLoc)) {
    refreshCaches();
  }
});
// append buttons to control panel.
controlPanel.appendChild(geoButton);
controlPanel.appendChild(leftButton);
controlPanel.appendChild(upButton);
controlPanel.appendChild(downButton);
controlPanel.appendChild(rightButton);

// MAP PANEL DIV ------------------------------
const mapPanel = document.createElement("div");
app.appendChild(mapPanel);
mapPanel.style.width = "100%";
mapPanel.style.height = "calc(100% - 100px)";
mapPanel.style.position = "absolute";
mapPanel.style.top = "50px";
mapPanel.style.left = "0";
mapPanel.id = "map";

// STATUS PANEL DIV ------------------------------
const statusPanel = document.createElement("div");
app.appendChild(statusPanel);
statusPanel.style.width = "100%";
statusPanel.style.height = "50px";
statusPanel.style.position = "absolute";
statusPanel.style.bottom = "0";
statusPanel.style.left = "0";
statusPanel.style.backgroundColor = "rgba(0,0,0,0.2)";
let statusMsg = "You don't have any coins! Collect some from caches.";
statusPanel.innerHTML = statusMsg;

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
player.addObserver(updateMapView);
player.addObserver(updateStatusPanel);

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

function updateMapView() {
  map.setView(player.getLocation(), GAMEPLAY_ZOOM_LEVEL);
}
function refreshCaches() {
  // clear all the rects and then spawn new ones based on new position.
  map.eachLayer((layer) => {
    if (layer instanceof leaflet.Rectangle) {
      map.removeLayer(layer);
    }
  });
  createCaches();
}

function crossedCellBoundary(
  oldLoc: leaflet.LatLng,
  newLoc: leaflet.LatLng,
): boolean {
  const oldCell = board.getCellForPoint(oldLoc);
  const newCell = board.getCellForPoint(newLoc);
  if (oldCell.i !== newCell.i || oldCell.j !== newCell.j) {
    console.log("crossedCellBoundary: ", oldCell, newCell);
    return true;
  }
  return false;
}
function updateStatusPanel() {
  statusPanel.innerHTML = statusMsg;
}

// create a map object for player interactivity.
//    should NOT interact with game data.
function spawnCache(cellToSpawn: Cell) {
  // assert that there should be a cache here.
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
    withdrawButton.addEventListener("click", (event) => {
      event.stopPropagation();

      // if cache has coins.
      if (cache.coins.length > 0) {
        // gamedata. coin exchange.
        const coin = cache.coins.pop()!;
        player.addCoin(coin);

        // re-convert the new cache state to a momento and store it.
        board.setCacheForCell(cellToSpawn, cache);

        // update UI elements.
        statusMsg = `You picked up coin ${
          decodeCoin(coin)
        }.<br>Player has ${player.getCoinCount()} coins.`;
        popupText.innerText =
          `You found a cache! ${cache.coins.length} coins here.`;
        player.notifyObservers();
      }

      return false; // This supposedly prevents popup from closing on click.
    });
    depositButton.addEventListener("click", (event) => {
      event.stopPropagation();

      // if player has coins.
      if (player.getCoinCount() > 0) {
        // game data coin exchange.
        const coin = player.getCoin()!;
        cache.coins.push(coin);

        // re-convert the new cache state to a momento and store it.
        board.setCacheForCell(cellToSpawn, cache);

        // update UI elements.
        statusMsg = `You left behind coin ${
          decodeCoin(coin)
        }.<br>Player has ${player.getCoinCount()} coins.`;
        popupText.innerText =
          `You found a cache! ${cache.coins.length} coins here.`;
        player.notifyObservers();
      }
      return false; // This supposedly prevents popup from closing on click.
    });
    return popupDiv;
  });
}

export function decodeCoin(coin: Coin): string {
  return `${coin.spawnLoc.i}:${coin.spawnLoc.j}#${coin.serial}`;
}

// make some unique string out of the coordinates
export function stringifyCell(cell: Cell): string {
  const { i, j } = cell;
  return `${i}:${j}`;
}

// periodicallyc all this function to update player location.
function geolocationUpdate() {
  if (geolocationActivated) {
    console.log("attempting geolocation update.");

    // Storing prev loc to detect need for cache refresh.
    const oldLoc = player.getLocation();
    promiseCurrentGeolocation()
      .then((newLoc) => {
        if (newLoc) {
          const { latitude, longitude } = newLoc.coords;
          const newLeafletLoc = leaflet.latLng(latitude, longitude);
          player.setLocation(newLeafletLoc);
          if (crossedCellBoundary(oldLoc, newLeafletLoc)) {
            console.log("crossed cell boundary. refreshing caches...");
            refreshCaches();
          }
          player.notifyObservers();
        } else {
          console.log("geolocation returned null.");
        }
      })
      .catch((error) => {
        console.error("Error getting location:", error);
      });
  }
  setTimeout(geolocationUpdate, GEOLOCATION_UPDATE_INTERVAL);
}

updateMapView();
refreshCaches();
geolocationUpdate();
