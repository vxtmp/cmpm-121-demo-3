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

export function initUpButton(): HTMLButtonElement {
  const upButton = document.createElement("button");
  upButton.innerText = "⬆️";
  upButton.style.fontSize = "15px";
  upButton.style.backgroundColor = "#00A6ED";
  upButton.style.color = "black";
  return upButton;
}

export function initLeftButton(): HTMLButtonElement {
  const leftButton = document.createElement("button");
  leftButton.innerText = "⬅️";
  leftButton.style.fontSize = "15px";
  leftButton.style.backgroundColor = "#00A6ED";
  leftButton.style.color = "black";
  return leftButton;
}

export function initDownButton(): HTMLButtonElement {
  const downButton = document.createElement("button");
  downButton.innerText = "⬇️";
  downButton.style.fontSize = "15px";
  downButton.style.backgroundColor = "#00A6ED";
  downButton.style.color = "black";
  return downButton;
}

export function initRightButton(): HTMLButtonElement {
  const rightButton = document.createElement("button");
  rightButton.innerText = "➡️";
  rightButton.style.fontSize = "15px";
  rightButton.style.backgroundColor = "#00A6ED";
  rightButton.style.color = "black";
  return rightButton;
}
