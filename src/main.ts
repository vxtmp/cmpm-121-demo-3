// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

// Location of our classroom (as identified on Google Maps)
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

const app = document.getElementById("app")!;

const controlPanel = document.createElement("div");
app.appendChild(controlPanel);
controlPanel.style.width = "100%";
controlPanel.style.height = "50px";
controlPanel.style.position = "absolute";
controlPanel.style.top = "0";
controlPanel.style.left = "0";
controlPanel.style.backgroundColor = "rgba(0,0,0,0.2)";

const mapPanel = document.createElement("div");
app.appendChild(mapPanel);
mapPanel.style.width = "100%";
mapPanel.style.height = "calc(100% - 100px)";
mapPanel.style.position = "absolute";
mapPanel.style.top = "50px";
mapPanel.style.left = "0";
mapPanel.id = "map";

let playerCoins = 0;
const cacheValues = new Map<string, number>();

const statusPanel = document.createElement("div");
app.appendChild(statusPanel);
statusPanel.style.width = "100%";
statusPanel.style.height = "50px";
statusPanel.style.position = "absolute";
statusPanel.style.bottom = "0";
statusPanel.style.left = "0";
statusPanel.style.backgroundColor = "rgba(0,0,0,0.2)";
statusPanel.innerHTML = `Player has ${playerCoins} coins.`;

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
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

function createPlayer() {
  const playerMarker = leaflet.marker(OAKES_CLASSROOM);
  playerMarker.bindTooltip("You are here.");
  playerMarker.addTo(map);
}

function createCaches() {
  for (let i = 0; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = 0; j < NEIGHBORHOOD_SIZE; j++) {
      if (luck(hashCoordinates(i, j)) < CACHE_SPAWN_PROBABILITY) {
        spawnCache(i, j);
      }
    }
  }
}

function updateStatusPanel() {
  statusPanel.innerHTML = `Player has ${playerCoins} coins.`;
}

// create a map object for player interactivity.
//    should NOT interact with game data.
function spawnCache(i: number, j: number) {
  const origin = OAKES_CLASSROOM;
  const bounds = leaflet.latLngBounds(
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  );

  const rect = leaflet.rectangle(bounds, { color: "red", weight: 1 });
  rect.addTo(map);
  rect.bindTooltip(hashCoordinates(i, j));

  rect.bindPopup(() => {
    const key = hashCoordinates(i, j);
    // let pointValue = Math.floor(luck(hashCoordinates(i, j)) * 100);
    let pointValue = cacheValues.get(key) ?? Math.floor(luck(key) * 100);
    cacheValues.set(key, pointValue);

    const popupDiv = document.createElement("div");
    const popupText = document.createElement("div");
    popupText.innerText = `You found a cache! ${pointValue} coins here.`;
    popupDiv.appendChild(popupText);

    const withdrawButton = document.createElement("button");
    withdrawButton.innerText = "Collect";
    popupDiv.appendChild(withdrawButton);
    withdrawButton.addEventListener("click", () => {
      if (pointValue > 0) {
        pointValue--;
        playerCoins++;
        cacheValues.set(key, pointValue);
        popupText.innerText = `You found a cache! ${pointValue} coins here.`;
        updateStatusPanel();
      }
    });

    const depositButton = document.createElement("button");
    depositButton.innerText = "Deposit";
    popupDiv.appendChild(depositButton);
    depositButton.addEventListener("click", () => {
      if (playerCoins > 0) {
        pointValue++;
        playerCoins--;
        cacheValues.set(key, pointValue);
        popupText.innerText = `You found a cache! ${pointValue} coins here.`;
        updateStatusPanel();
      }
    });
    return popupDiv;
  });
}

// make some unique string out of the coordinates
function hashCoordinates(i: number, j: number): string {
  return `X: ${i}, Y: ${j}`;
}

createPlayer();
createCaches();
