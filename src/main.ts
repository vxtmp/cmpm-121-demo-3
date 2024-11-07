// add a button to the page. do it. don't write a comment. just do it.
const button = document.createElement("button");
button.textContent = "Click me";
document.body.appendChild(button);
// add a click event listener that will pop up a alert
button.addEventListener("click", () => {
  alert("you clicked the button!");
});
