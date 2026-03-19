
(function () {
  "use strict";

  var allAssets = [];
  var filtered  = [];

  function init() {
    var page = document.body.getAttribute("data-page");
    if (page === "index") {
      loadAssets(renderIndex);
    } else if (page === "asset") {
      loadAssets(renderAssetViewer);
    }
  }

  function loadAssets(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "data/assets.json", true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            allAssets = JSON.parse(xhr.responseText);
            callback();
          } catch (e) {
            showError("Failed to parse assets.json: " + e.message);
          }
        } else {
          showError("Could not load data/assets.json (HTTP " + xhr.status + ")");
        }
      }
    };
    xhr.send();
  }

  function showError(msg) {
    var grid = document.getElementById("asset-grid");
    var loading = document.getElementById("loading-msg");
    if (loading) loading.style.display = "none";
    if (grid) {
      var div = document.createElement("div");
      div.className = "error-msg";
      div.textContent = msg;
      grid.appendChild(div);
    }
  }

  function nameFromFile(filepath) {
    var filename = filepath.split("/").pop();
    return filename.replace(/\.[^.]+$/, "").replace(/_/g, " ");
  }

  function getSubfolder(filepath) {
    // assets/01_Union/UI/Common/file.png → "Common"
    var parts = filepath.split("/");
    return parts[3] || null;
  }

  // ---- INDEX PAGE ----

  function renderIndex() {
    filtered = allAssets.slice();
    populateFilters();
    updateStats();
    renderGrid();
    bindFilters();
  }

  function populateFilters() {
    var patches = [], subcats = [];

    allAssets.forEach(function (a) {
      if (a.patch && patches.indexOf(a.patch) === -1) patches.push(a.patch);
      var sub = getSubfolder(a.file);
      if (sub && subcats.indexOf(sub) === -1) subcats.push(sub);
    });

    patches.sort();
    subcats.sort();

    var patchSel = document.getElementById("filter-patch");
    patches.forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      patchSel.appendChild(opt);
    });

    var subcatSel = document.getElementById("filter-subcat");
    subcats.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      subcatSel.appendChild(opt);
    });
  }

  function updateStats() {
    var tex = allAssets.filter(function (a) { return a.type === "texture"; }).length;
    var aud = allAssets.filter(function (a) { return a.type === "audio"; }).length;
    var el = document.getElementById("stats-bar");
    if (el) {
      el.innerHTML =
        "Total: <b>" + allAssets.length + "</b>" +
        " &nbsp;&mdash;&nbsp; Textures: <b>" + tex + "</b>" +
        " &nbsp;&mdash;&nbsp; Audio: <b>" + aud + "</b>";
    }
  }

  function renderGrid() {
    var grid    = document.getElementById("asset-grid");
    var noRes   = document.getElementById("no-results");
    var countEl = document.getElementById("result-count");
    var loading = document.getElementById("loading-msg");

    if (loading) loading.style.display = "none";
    if (countEl) {
      countEl.textContent = "Showing " + filtered.length + " asset" + (filtered.length !== 1 ? "s" : "");
    }

    // Remove old cards (keep loading/no-results divs)
    var cards = grid.querySelectorAll(".asset-card");
    cards.forEach(function (c) { c.parentNode.removeChild(c); });

    if (filtered.length === 0) {
      if (noRes) noRes.style.display = "block";
      return;
    }
    if (noRes) noRes.style.display = "none";

    filtered.forEach(function (asset) {
      var idx     = allAssets.indexOf(asset);
      var name    = nameFromFile(asset.file);
      var subfolder = getSubfolder(asset.file);

      var card = document.createElement("div");
      card.className = "asset-card";

      // Thumbnail
      var thumb = document.createElement("div");
      thumb.className = "asset-card-thumb";

      if (asset.type === "audio") {
        thumb.classList.add("audio-thumb");
        thumb.innerHTML = '<div class="audio-icon">&#9834;</div><span>AUDIO</span>';
      } else {
        var img = document.createElement("img");
        img.src = asset.file;
        img.alt = name;
        img.loading = "lazy";
        img.onerror = function () {
          this.style.display = "none";
          thumb.style.background = "#dddddd";
        };
        thumb.appendChild(img);
      }

      // Body
      var body = document.createElement("div");
      body.className = "asset-card-body";

      var nameEl = document.createElement("div");
      nameEl.className = "asset-card-name";
      nameEl.textContent = name;
      nameEl.title = name;

      var folderEl = document.createElement("div");
      folderEl.className = "asset-card-folder";
      folderEl.textContent = (subfolder || asset.category || "") + " / " + asset.patch;

      var badge = document.createElement("span");
      badge.className = "asset-card-badge " + (asset.type === "audio" ? "badge-audio" : "badge-texture");
      badge.textContent = asset.type;

      body.appendChild(nameEl);
      body.appendChild(folderEl);
      body.appendChild(badge);

      card.appendChild(thumb);
      card.appendChild(body);

      card.addEventListener("click", function () {
        window.location.href = "asset.html?i=" + idx;
      });

      grid.appendChild(card);
    });
  }

  function bindFilters() {
    ["filter-search", "filter-type", "filter-patch", "filter-subcat"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener("input",  applyFilters);
        el.addEventListener("change", applyFilters);
      }
    });

    document.getElementById("btn-reset").addEventListener("click", function () {
      document.getElementById("filter-search").value  = "";
      document.getElementById("filter-type").value    = "";
      document.getElementById("filter-patch").value   = "";
      document.getElementById("filter-subcat").value  = "";
      applyFilters();
    });
  }

  function applyFilters() {
    var search = (document.getElementById("filter-search").value || "").toLowerCase().trim();
    var type   =  document.getElementById("filter-type").value;
    var patch  =  document.getElementById("filter-patch").value;
    var subcat =  document.getElementById("filter-subcat").value;

    filtered = allAssets.filter(function (a) {
      if (type   && a.type  !== type)  return false;
      if (patch  && a.patch !== patch) return false;
      if (subcat && getSubfolder(a.file) !== subcat) return false;
      if (search && a.file.toLowerCase().indexOf(search) === -1) return false;
      return true;
    });

    renderGrid();
  }

  // ---- ASSET VIEWER PAGE ----

  function renderAssetViewer() {
    var params = getQueryParams();
    var idx    = parseInt(params["i"], 10);
    var loading = document.getElementById("loading-msg");

    if (isNaN(idx) || idx < 0 || idx >= allAssets.length) {
      if (loading) loading.textContent = "Asset not found.";
      return;
    }

    var asset     = allAssets[idx];
    var name      = nameFromFile(asset.file);
    var subfolder = getSubfolder(asset.file);

    if (loading) loading.style.display = "none";
    document.getElementById("viewer-container").style.display = "";
    document.getElementById("viewer-asset-name").textContent  = name;
    document.title = name + " — CrossWorlds Archive";

    // Media
    var mediaBox = document.getElementById("viewer-media-box");
    if (asset.type === "audio") {
      mediaBox.classList.add("audio-box");
      mediaBox.innerHTML =
        '<div class="audio-label">&#9834; Audio file</div>' +
        '<audio controls style="width:100%;"><source src="' + escAttr(asset.file) + '"></audio>';
    } else {
      mediaBox.innerHTML =
        '<img id="viewer-img" src="' + escAttr(asset.file) + '" alt="' + escAttr(name) + '" title="Click for fullscreen">';
      document.getElementById("viewer-img").addEventListener("click", function () {
        openFullscreen(asset.file);
      });
    }

    // Metadata rows
    var tbody = document.getElementById("meta-tbody");
    [
      ["File",     asset.file],
      ["Type",     asset.type],
      ["Patch",    asset.patch],
      ["Category", asset.category],
      ["Folder",   subfolder || "—"]
    ].forEach(function (row) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<th>" + escHtml(row[0]) + "</th><td>" + escHtml(row[1]) + "</td>";
      tbody.appendChild(tr);
    });

    // Download button
    var dlBtn = document.getElementById("btn-download");
    dlBtn.href = asset.file;
    dlBtn.setAttribute("download", asset.file.split("/").pop());

    // Fullscreen button
    var fsBtn = document.getElementById("btn-fullscreen");
    if (asset.type === "audio") {
      fsBtn.style.display = "none";
    } else {
      fsBtn.addEventListener("click", function (e) {
        e.preventDefault();
        openFullscreen(asset.file);
      });
    }

    // Fullscreen overlay events
    document.getElementById("fullscreen-overlay").addEventListener("click", function (e) {
      if (e.target === this) closeFullscreen();
    });
    document.getElementById("fullscreen-close").addEventListener("click", closeFullscreen);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeFullscreen();
    });
  }

  function openFullscreen(src) {
    document.getElementById("fullscreen-img").src = src;
    document.getElementById("fullscreen-overlay").style.display = "block";
  }

  function closeFullscreen() {
    document.getElementById("fullscreen-overlay").style.display = "none";
  }

  // ---- UTILS ----

  function getQueryParams() {
    var params = {};
    window.location.search.slice(1).split("&").forEach(function (pair) {
      var i = pair.indexOf("=");
      if (i > -1) params[decodeURIComponent(pair.slice(0, i))] = decodeURIComponent(pair.slice(i + 1));
    });
    return params;
  }

  function escHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function escAttr(s) { return escHtml(s); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
