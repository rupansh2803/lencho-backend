(function markLenchoScriptsReady() {
  window.__lenchoScriptsReady = true;
  document.documentElement.dataset.lenchoScriptsReady = 'true';
  window.dispatchEvent(new Event('lencho-scripts-ready'));
})();
