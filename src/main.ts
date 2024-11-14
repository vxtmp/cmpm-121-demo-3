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
import {
  initCloseButtonContainerDiv,
  initCoinButton,
  initCoinContainerDiv,
  initInventoryPanel,
} from "./inventoryPanel.ts";

// Location of our classroom (as identified on Google Maps)
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);
const NULL_ISLAND = leaflet.latLng(0, 0);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
export const TILE_DEGREES = 1e-4;
export const NEIGHBORHOOD_SIZE = 8;
const GEOLOCATION_UPDATE_INTERVAL = 1000;
export const CACHE_SPAWN_PROBABILITY = 0.1;

// Global values.
let player: Player;
let board: Board;
let moveLine: leaflet.Polyline;
let moveHistory: leaflet.LatLng[] = [];

// Clicking on a coin will disable auto-panning
// by geolocation updates for a short time.
const PAN_DISABLE_DURATION = 5000;
let canPanMap = true;

let geolocationActivated = false; // toggled with button.

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
// add reset button
const resetButton = initButton("🚮");
resetButton.addEventListener("click", () => {
  const userResponse = prompt(
    "Are you sure you want to reset your game? Type 'yes' to confirm.",
  );
  if (userResponse?.toLowerCase() == "yes") {
    resetGame();
  } else {
    console.log("Reset cancelled.");
  }
});

// add inventory
const inventoryButton = initButton("Inventory");
inventoryButton.addEventListener("click", () => {
  console.log("inventory opened");
  // make a temporary popup window with a list of coins as buttons
  const inventory = player.getInventory();
  const popupDiv = initInventoryPanel();
  const coinContainerDiv = initCoinContainerDiv();
  const closeButtonContainerDiv = initCloseButtonContainerDiv();
  popupDiv.appendChild(coinContainerDiv);
  popupDiv.appendChild(closeButtonContainerDiv);
  for (const coin of inventory) {
    const coinButton = initCoinButton(decodeCoin(coin));
    coinButton.addEventListener("click", () => {
      panCameraToCoinHome(coin);
      app.removeChild(popupDiv);
    });
    coinContainerDiv.appendChild(coinButton);
  }
  const closeButton = document.createElement("button");
  closeButton.innerText = "Close";
  closeButton.style.backgroundColor = "#666666";
  closeButton.style.color = "black";
  closeButtonContainerDiv.appendChild(closeButton);

  app.appendChild(popupDiv);

  // add event listener to close button
  closeButton.addEventListener("click", () => {
    app.removeChild(popupDiv);
  });
});

// pan camera to spawn loc of clicked coin.
function panCameraToCoinHome(coin: Coin) {
  map.setView(board.getCellCenter(coin.spawnLoc), GAMEPLAY_ZOOM_LEVEL);

  // create a marker at this location
  const marker = leaflet.marker(board.getCellCenter(coin.spawnLoc));
  marker.bindTooltip(decodeCoin(coin));
  marker.addTo(map);

  // disables autopanning from geolocation updates
  canPanMap = false;
  // re-enable after a short duration and delete the marker.
  setTimeout(() => {
    canPanMap = true;
    map.removeLayer(marker);
    updateMapView();
  }, PAN_DISABLE_DURATION);
}

// add event listeners
upButton.addEventListener("click", () => {
  moveClickListener(() => player.moveUp());
});
leftButton.addEventListener("click", () => {
  moveClickListener(() => player.moveLeft());
});

downButton.addEventListener("click", () => {
  moveClickListener(() => player.moveDown());
});
rightButton.addEventListener("click", () => {
  moveClickListener(() => player.moveRight());
});

// takes an appropriate move function and moves player.
// compares before and after to conditionally refresh caches
// update draw polyline and move history.
// save game.
function moveClickListener(moveFunction: () => void) {
  const oldLoc = player.getLocation();
  moveFunction();
  const newLoc = player.getLocation();
  if (crossedCellBoundary(oldLoc, newLoc)) {
    refreshCaches();
  }
  updateDrawMoveHistory();
  saveGameState();
}

// append buttons to control panel.
controlPanel.appendChild(geoButton);
controlPanel.appendChild(leftButton);
controlPanel.appendChild(upButton);
controlPanel.appendChild(downButton);
controlPanel.appendChild(rightButton);
controlPanel.appendChild(resetButton);
controlPanel.appendChild(inventoryButton);

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
// SERIALIZATION
// ------------------------------------------------

function loadGameState() {
  const boardData = localStorage.getItem("board");
  const playerData = localStorage.getItem("player");
  const moveData = localStorage.getItem("moveHistory");

  // if data exists, deserialize it.
  if (boardData && playerData && moveData) {
    board = Board.deserialize(boardData);
    player = Player.deserialize(playerData, map);
    moveHistory = JSON.parse(moveData);
    updateDrawMoveHistory();
    statusMsg = `You have ${player.getCoinCount()} coins.`;
  } else {
    // if no data exists, create new
    board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
    player = new Player(OAKES_CLASSROOM, map);
    moveHistory = [];
  }
  // add observer functions to the player for movement.
  player.addObserver(updateMapView);
  player.addObserver(updateStatusPanel);
}

function saveGameState() {
  // clear the existing data
  localStorage.removeItem("board");
  localStorage.removeItem("player");
  localStorage.removeItem("moveHistory");

  localStorage.setItem("board", board.serialize());
  localStorage.setItem("player", player.serialize());
  localStorage.setItem("moveHistory", JSON.stringify(moveHistory));
}

function resetGame() {
  // remove any player markers on the map
  map.removeLayer(player.getPlayerMarker());
  // remove any polylines on the map
  if (moveLine) {
    map.removeLayer(moveLine);
  }
  // clear the local storage.
  localStorage.removeItem("board");
  localStorage.removeItem("player");
  board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
  player = new Player(OAKES_CLASSROOM, map);
  // add observer functions to the player for movement.
  player.addObserver(updateMapView);
  player.addObserver(updateStatusPanel);
  moveHistory = [];
  statusMsg = "You don't have any coins! Collect some from caches.";
  updateMapView();
  updateStatusPanel();
  refreshCaches();
}

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

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

function updateMapView() {
  if (canPanMap) {
    map.setView(player.getLocation(), GAMEPLAY_ZOOM_LEVEL);
  }
}

// iterate over nearby cells,
// calculate luck, spawn clickables
function createCaches() {
  const location = player.getLocation();
  for (const neighbor of board.getCellsNearPoint(location)) {
    if (board.calculateLuckiness(neighbor) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(neighbor); // adds a clickable to map for cache.
    }
  }
}

// remove existing clickables and spawn new ones.
function refreshCaches() {
  // clear all the rects and then spawn new ones based on new position.
  map.eachLayer((layer) => {
    if (layer instanceof leaflet.Rectangle) {
      map.removeLayer(layer);
    }
  });
  createCaches();
}

// Bool function to check if player entered new cell
// Used to conditionally refresh the displayed caches.
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
        saveGameState();
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
        saveGameState();
      }
      return false; // This supposedly prevents popup from closing on click.
    });
    return popupDiv;
  });
}

function updateDrawMoveHistory() {
  if (sameAsLastLocation()) {
    return;
  }
  moveHistory.push(player.getLocation());
  drawPolyline();
}

function sameAsLastLocation() {
  if (moveHistory.length == 0) {
    return false;
  }
  if (moveHistory[moveHistory.length - 1] == player.getLocation()) {
    return true;
  }
  return false;
}

function drawPolyline() {
  if (moveLine) {
    map.removeLayer(moveLine);
  }
  moveLine = leaflet.polyline(moveHistory, {
    color: "blue",
  }).addTo(map);
}

// create a standardized text string out of the coin object.
export function decodeCoin(coin: Coin): string {
  return `${coin.spawnLoc.i}:${coin.spawnLoc.j}#${coin.serial}`;
}

// make some unique string out of the coordinates
export function stringifyCell(cell: Cell): string {
  const { i, j } = cell;
  return `${i}:${j}`;
}

// update player location based on geolocation.
// recursively calls itself with a timeout.
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
          updateDrawMoveHistory();
          saveGameState();
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

// player = new Player(OAKES_CLASSROOM, map);
loadGameState();
geolocationUpdate();
updateStatusPanel();
updateMapView();
refreshCaches();

globalThis.addEventListener("beforeunload", saveGameState);
