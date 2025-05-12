/////////////////////////////////////////////////////////Preventing from watching inspect
// Disable right click
document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});
document.addEventListener("keydown", function (e) {
  // Disable F12
  if (e.key === "F12") {
    e.preventDefault();
  }
  // Disable Ctrl+Shift+I or Cmd+Option+I (Mac)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "I") {
    e.preventDefault();
  }
  // Disable Ctrl+Shift+C or Cmd+Option+C (Mac)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "C") {
    e.preventDefault();
  }
  // Disable Ctrl+U (View Source)
  if ((e.ctrlKey || e.metaKey) && e.key === "u") {
    e.preventDefault();
  }
});
////////////////////////////////////////////////////////////Preventing from watching inspect

// Prevent right-click
document.addEventListener("contextmenu", (e) => e.preventDefault());

// Prevent keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Prevent F12
  if (e.key === "F12") {
    e.preventDefault();
  }
  // Prevent Ctrl+Shift+I (Windows/Linux) or Cmd+Option+I (Mac)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "I") {
    e.preventDefault();
  }
  // Prevent Ctrl+Shift+J (Windows/Linux) or Cmd+Option+J (Mac)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "J") {
    e.preventDefault();
  }
  // Prevent Ctrl+Shift+C (Windows/Linux) or Cmd+Option+C (Mac)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "C") {
    e.preventDefault();
  }
  // Prevent Ctrl+U (View Source)
  if ((e.ctrlKey || e.metaKey) && e.key === "u") {
    e.preventDefault();
  }
});

// Prevent DevTools from opening
let devtools = function () {};
devtools.toString = function () {
  this.opened = true;
  return "";
};

// Check if DevTools is open
setInterval(() => {
  const widthThreshold = window.outerWidth - window.innerWidth > 160;
  const heightThreshold = window.outerHeight - window.innerHeight > 160;

  if (widthThreshold || heightThreshold) {
    document.body.innerHTML = "Developer tools are not allowed on this page.";
  }
}, 1000);

// Prevent console.log
console.log = function () {};
