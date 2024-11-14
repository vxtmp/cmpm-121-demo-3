// write a function to initialize all the style elements of the control panel and return the div element
export function initControlPanel(): HTMLDivElement {
  const controlPanel = document.createElement("div");
  controlPanel.style.width = "100%";
  controlPanel.style.height = "50px";
  controlPanel.style.position = "absolute";
  controlPanel.style.top = "0";
  controlPanel.style.left = "0";
  controlPanel.style.backgroundColor = "rgba(0,0,0,0.2)";
  return controlPanel;
}

export function initButton(innerText: string): HTMLButtonElement {
  const coinButton = document.createElement("button");
  coinButton.innerText = innerText;
  coinButton.style.backgroundColor = "#00A6ED";
  coinButton.style.color = "black";
  return coinButton;
}

// write an initEventListener function that takes a HTMLButtonElement and a function as parameters
