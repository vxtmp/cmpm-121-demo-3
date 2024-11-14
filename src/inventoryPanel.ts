// write a function to initialize all the style elements of the control panel and return the div element
export function initInventoryPanel(): HTMLDivElement {
  const inventoryPanel = document.createElement("div");
  // pop up the div on the middle of the screen
  inventoryPanel.style.position = "absolute";
  inventoryPanel.style.top = "50%";
  inventoryPanel.style.left = "50%";
  inventoryPanel.style.transform = "translate(-50%, -50%)";
  inventoryPanel.style.backgroundColor = "rgba(0,0,0,0.8)";
  inventoryPanel.style.padding = "10px";
  inventoryPanel.style.borderRadius = "10px";
  inventoryPanel.style.zIndex = "1000";
  inventoryPanel.style.color = "black";
  inventoryPanel.style.backgroundColor = "white";
  inventoryPanel.style.width = "400px";
  inventoryPanel.style.height = "300px";
  inventoryPanel.style.display = "flex";
  inventoryPanel.style.flexDirection = "column";
  inventoryPanel.style.justifyContent = "space-between";
  return inventoryPanel;
}

export function initCoinContainerDiv(): HTMLDivElement {
  const coinContainerDiv = document.createElement("div");
  coinContainerDiv.style.flex = "1";
  coinContainerDiv.style.overflowY = "auto";
  coinContainerDiv.style.marginBottom = "10px";
  return coinContainerDiv;
}

export function initCloseButtonContainerDiv(): HTMLDivElement {
  const closeButtonContainerDiv = document.createElement("div");
  closeButtonContainerDiv.style.display = "flex";
  closeButtonContainerDiv.style.justifyContent = "center";
  return closeButtonContainerDiv;
}

export function initCoinButton(innerText: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.innerText = innerText;
  button.style.fontSize = "15px";
  button.style.backgroundColor = "#00A6ED";
  button.style.color = "black";
  return button;
}

// write an initEventListener function that takes a HTMLButtonElement and a function as parameters
