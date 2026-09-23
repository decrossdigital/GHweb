(function () {
  function highlightListen() {
    var links = document.querySelectorAll("#nav a");
    for (var i = 0; i < links.length; i++) links[i].classList.remove("active");
    var listen = document.querySelector('#nav a[href="#discography"]');
    if (listen) listen.classList.add("active");
  }

  function bind() {
    var songLink = document.querySelector('a[href="#songs"]');
    if (songLink) {
      songLink.addEventListener("click", function () {
        window.setTimeout(highlightListen, 150);
      });
    }

    var discLink = document.querySelector('#nav a[href="#discography"]');
    if (discLink) {
      discLink.addEventListener("click", function () {
        window.setTimeout(function () {
          var links = document.querySelectorAll("#nav a");
          for (var i = 0; i < links.length; i++) links[i].classList.remove("active");
          discLink.classList.add("active");
        }, 150);
      });
    }

    var year = document.getElementById("copyright-year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  function load(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error(src)); };
      document.body.appendChild(script);
    });
  }

  function when(nodes, eventName, ready) {
    var pending = nodes.filter(function (node) { return !ready(node); });
    if (!pending.length) return Promise.resolve();
    return Promise.all(pending.map(function (node) {
      return new Promise(function (resolve) {
        node.addEventListener(eventName, function () { resolve(); });
        node.addEventListener("error", function () { resolve(); });
      });
    }));
  }

  function start() {
    if (window.__ghSiteInit || !document.getElementById("main")) return;
    window.__ghSiteInit = true;
    bind();
    load("/js/jquery.min.js").then(function () {
      return load("/js/skel.min.js");
    }).then(function () {
      return load("/js/init.js");
    }).then(function () {
      var links = Array.prototype.slice.call(document.querySelectorAll('link[rel="stylesheet"]')).filter(function (link) {
        var href = link.getAttribute("href") || "";
        return href.indexOf("css/") !== -1;
      });
      return when(links, "load", function (link) { return !!link.sheet; });
    }).then(function () {
      var images = Array.prototype.slice.call(document.querySelectorAll("#main img"));
      return when(images, "load", function (image) { return image.complete; });
    }).then(function () {
      if (document.fonts && document.fonts.ready) return document.fonts.ready;
    }).then(function () {
      if (window.jQuery) window.jQuery(window).trigger("load");
      if (window.location.hash === "#songs") window.setTimeout(highlightListen, 200);
      document.documentElement.setAttribute("data-gh-ready", "1");
    }).catch(function (error) {
      console.error(error);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
