(function () {
  try {
    var k = "miracle-times-ui-lang";
    var stored = localStorage.getItem(k);
    var lang;
    if (stored === "hi" || stored === "en") {
      lang = stored;
    } else {
      var meta = document.querySelector('meta[name="language"]');
      var m = meta && meta.getAttribute("content");
      lang = m === "en" || m === "hi" ? m : "hi";
    }
    var htmlLang = lang === "hi" ? "hi" : "en";
    document.documentElement.dataset.uiLang = lang;
    document.documentElement.lang = htmlLang;
    var shell =
      document.currentScript && document.currentScript.parentElement;
    if (
      shell &&
      shell.classList &&
      shell.classList.contains("site-shell")
    ) {
      shell.lang = htmlLang;
    }
  } catch (e) {
    document.documentElement.dataset.uiLang = "hi";
  }
})();
