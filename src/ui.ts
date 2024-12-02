// Import necessary helpers (e.g., `initButton`) from your codebase
import { initButton, initControlPanel } from "./controlPanel.ts";
import {
  initCloseButtonContainerDiv,
  initCoinButton,
  initCoinContainerDiv,
  initInventoryPanel,
} from "./inventoryPanel.ts"; // Adjust paths as needed
import { decodeCoin } from "./main.ts"; // Assuming decodeCoin is still in main.ts
import { moveClickListener } from "./main.ts";
import { resetGame } from "./main.ts";
import { player } from "./main.ts";
import { toggleGeolocation } from "./main.ts";
import { panCameraToCoinHome } from "./main.ts";

/**
 * Initializes the Control Panel UI (Movement buttons, geolocation toggle, reset).
 */
export function initializeControlPanel() {
  const controlPanel = initControlPanel();

  // Movement Buttons
  const upButton = initButton("⬆️");
  const leftButton = initButton("⬅️");
  const downButton = initButton("⬇️");
  const rightButton = initButton("➡️");

  // Add event listeners (directly attach gameplay logic here for now)
  upButton.addEventListener("click", () => {
    moveClickListener(() => player.moveUp()); // Assumes player and moveClickListener exist as globals
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

  // Geolocation Toggle Button
  const geoButton = initButton("🌐");
  geoButton.addEventListener("click", () => {
    // Show/hide movement buttons based on geolocation state
    upButton.hidden = !upButton.hidden;
    leftButton.hidden = !leftButton.hidden;
    downButton.hidden = !downButton.hidden;
    rightButton.hidden = !rightButton.hidden;

    // Toggle geolocation state
    toggleGeolocation();
    // console.log("geolocationActivated: ", geolocationActivated);
  });

  // Reset Button
  const resetButton = initButton("🚮");
  resetButton.addEventListener("click", () => {
    const userResponse = prompt(
      "Are you sure you want to reset your game? Type 'yes' to confirm.",
    );
    if (userResponse?.toLowerCase() === "yes") {
      resetGame(); // Assumes resetGame() exists as a global function
    } else {
      console.log("Reset cancelled.");
    }
  });

  // Append buttons to the control panel
  controlPanel.append(
    geoButton,
    upButton,
    leftButton,
    downButton,
    rightButton,
    resetButton,
  );
  return controlPanel;
}

/**
 * Initializes the Inventory Button and its event behavior.
 */
export function initializeInventoryButton() {
  const inventoryButton = initButton("Inventory");

  inventoryButton.addEventListener("click", () => {
    console.log("inventory opened");

    // Fetch and display player's inventory
    const inventory = player.getInventory(); // Assumes player is a global variable
    const popupDiv = initInventoryPanel();
    const coinContainerDiv = initCoinContainerDiv();
    const closeButtonContainerDiv = initCloseButtonContainerDiv();
    popupDiv.append(coinContainerDiv, closeButtonContainerDiv);

    // Add inventory coins as buttons
    for (const coin of inventory) {
      const coinButton = initCoinButton(decodeCoin(coin));
      coinButton.addEventListener("click", () => {
        panCameraToCoinHome(coin); // Assumes panCameraToCoinHome() is globally defined
        document.body.removeChild(popupDiv); // Remove popup when a coin is clicked
      });
      coinContainerDiv.appendChild(coinButton);
    }

    // Add Close Button
    const closeButton = document.createElement("button");
    closeButton.innerText = "Close";
    closeButton.style.backgroundColor = "#666666";
    closeButton.style.color = "black";
    closeButton.addEventListener("click", () => {
      document.body.removeChild(popupDiv);
    });
    closeButtonContainerDiv.appendChild(closeButton);

    document.body.appendChild(popupDiv);
  });

  return inventoryButton;
}

/**
 * Initializes the Status Panel (shows gameplay updates or messages to the player).
 */
export function initializeStatusPanel(initialMessage: string) {
  const statusPanel = document.createElement("div");
  statusPanel.style.width = "100%";
  statusPanel.style.height = "50px";
  statusPanel.style.position = "absolute";
  statusPanel.style.bottom = "0";
  statusPanel.style.left = "0";
  statusPanel.style.backgroundColor = "rgba(0,0,0,0.2)";
  statusPanel.innerHTML = initialMessage;

  return statusPanel;
}

/**
 * Updates the status message in the status panel.
 */
export function updateStatusMessage(statusPanel: HTMLElement, message: string) {
  statusPanel.innerHTML = message;
}
