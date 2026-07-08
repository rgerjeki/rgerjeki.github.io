// Adds a "Copy" button to every code block inside the main content area.
// Works with Hugo/Chroma highlighted blocks (.highlight > pre) and plain
// fenced blocks (bare <pre>), which get wrapped so the button can anchor.
(function () {
  "use strict";

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // Fallback for older / insecure-context browsers.
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  function addButton(pre) {
    var container;
    if (pre.parentElement && pre.parentElement.classList.contains("highlight")) {
      container = pre.parentElement;
    } else {
      container = document.createElement("div");
      container.className = "highlight-wrap";
      pre.parentNode.insertBefore(container, pre);
      container.appendChild(pre);
    }
    if (container.querySelector(".copy-code-button")) {
      return;
    }

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-code-button";
    btn.setAttribute("aria-label", "Copy code to clipboard");
    btn.textContent = "Copy";

    btn.addEventListener("click", function () {
      var code = pre.querySelector("code") || pre;
      var text = code.innerText.replace(/\n$/, "");
      copyText(text).then(
        function () {
          btn.textContent = "Copied";
          btn.classList.add("copied");
          setTimeout(function () {
            btn.textContent = "Copy";
            btn.classList.remove("copied");
          }, 2000);
        },
        function () {
          btn.textContent = "Error";
          setTimeout(function () {
            btn.textContent = "Copy";
          }, 2000);
        }
      );
    });

    container.appendChild(btn);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var scope = document.querySelector(".content") || document.body;
    var blocks = scope.querySelectorAll("pre");
    for (var i = 0; i < blocks.length; i++) {
      // Skip line-number gutter <pre> inside Chroma line-table layouts.
      if (blocks[i].closest(".lntd:first-child")) {
        continue;
      }
      addButton(blocks[i]);
    }
  });
})();
