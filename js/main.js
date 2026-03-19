(function () {
  "use strict";

  var allAssets = [];
  var filtered  = [];

  // ---- INIT ----

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
    var el = document.getElementById("loading-msg") || document.getElementById("asset-grid");
    if (el) el.innerHTML = '<div class="error-msg">' + escHtml(msg) + "</div>";
  }

  // Derive a readable name from the filename
  // "UI_Billboard_LCD_Cover.png" -> "UI Billboard LCD Cover"
  function nameFromFile(filepath) {
    var filename = filepath.split("/").pop();
    var noExt = filename.replace(/\.[^.]+$/, "");
    return noExt.replace(/_/g, " ");
  }

  // Get the immediate subfolder under category (e.g. "Common" from .../UI/Common/...)
  // filepath: assets/01_Union/UI/Common/file.png
  // parts[0]=assets, parts[1]=patch, parts[2]=category, parts[3]=subcat
  function getSubcategory(filepath) {
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
    // Patches
    var patches = [];
    allAssets.forEach(function (a) {
      if (patches.indexOf(a.patch) === -1) patches.push(a.patch);
    });
    patches.sort();
    var patchSel = document.getElementById("filter-patch");
    if (patchSel) {
      patches.forEach(function (p) {
        var opt = document.createElement("option");
        opt.value = p;
        opt.textContent = p;
        patchSel.appendChild(opt);
      });
    }

    // Subcategories (folders under category, e.g. "Common", "Garage")
    var subcats = [];
    allAssets.forEach(function (a) {
      var sub = getSubcategory(a.file);
      if (sub && subcats.indexOf(sub) === -1) subcats.push(sub);
    });
    subcats.sort();
    var subcatSel = document.getElementById("filter-subcat");
    if (subcatSel) {
      subcats.forEach(function (s) {
        var opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s;
        subcatSel.appendChild(opt);
      });
    }
  }

  function updateStats() {
    var texCount = allAssets.filter(function (a) { return a.type === "texture"; }).length;
    var audCount = allAssets.filter(function (a) { return a.type === "audio"; }).length;
    var el = document.getElementById("stats-bar");
    if (el) {
      el.innerHTML =
        "<span>Total: <b>" + allAssets.length + "</b></span>" +
        "<span>Textures: <b>" + texCount + "</b></span>" +
        "<span>Audio: <b>" + audCount + "</b></span>";
    }
  }

  function renderGrid() {
    var grid    = document.getElementById("asset-grid");
    var noRes   = document.getElementById("no-results");
    var countEl = document.getElementById("result-count");
    if (!grid) return;

    if (countEl) countEl.textContent = filtered.length + " result" + (filtered.length !== 1 ? "s" : "");

    if (filtered.length === 0) {
      grid.innerHTML = "";
      if (noRes) noRes.style.display = "block";
      return;
    }
    if (noRes) noRes.style.display = "none";

    var inner = document.createElement("div");
    inner.className = "asset-grid-inner";

    filtered.forEach(function (asset) {
      var idx  = allAssets.indexOf(asset);
      var name = nameFromFile(asset.file);
      var sub  = getSubcategory(asset.file);

      var item = document.createElement("div");
      item.className = "asset-item";
      item.title = name;

      if (asset.type === "audio") {
        var thumb = document.createElement("div");
        thumb.className = "audio-thumb";
        thumb.innerHTML = "&#9834;<br>AUDIO";
        item.appendChild(thumb);
      } else {
        var img = document.createElement("img");
        img.src = asset.file;
        img.alt = name;
        img.onerror = function () {
          this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23cccccc'/%3E%3Ctext x='50%25' y='50%25' font-size='9' fill='%23666' text-anchor='middle' dy='.3em'%3ENO IMG%3C/text%3E%3C/svg%3E";
        };
        item.appendChild(img);
      }

      var nameEl = document.createElement("div");
      nameEl.className = "asset-name";
      nameEl.textContent = name;
      item.appendChild(nameEl);

      if (sub) {
        var badge = document.createElement("div");
        badge.className = "asset-type-badge";
        badge.textContent = sub;
        item.appendChild(badge);
      }

      item.addEventListener("click", function () {
        window.location.href = "asset.html?i=" + idx;
      });

      inner.appendChild(item);
    });

    grid.innerHTML = "";
    grid.appendChild(inner);
  }

  function bindFilters() {
    ["filter-search", "filter-type", "filter-patch", "filter-subcat"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener("input",  applyFilters);
        el.addEventListener("change", applyFilters);
      }
    });

    var resetBtn = document.getElementById("btn-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        document.getElementById("filter-search").value = "";
        document.getElementById("filter-type").value   = "";
        document.getElementById("filter-patch").value  = "";
        document.getElementById("filter-subcat").value = "";
        applyFilters();
      });
    }
  }

  function applyFilters() {
    var search = (document.getElementById("filter-search").value || "").toLowerCase().trim();
    var type   =  document.getElementById("filter-type").value;
    var patch  =  document.getElementById("filter-patch").value;
    var subcat =  document.getElementById("filter-subcat").value;

    filtered = allAssets.filter(function (a) {
      if (type   && a.type  !== type)  return false;
      if (patch  && a.patch !== patch) return false;
      if (subcat && getSubcategory(a.file) !== subcat) return false;
      if (search && a.file.toLowerCase().indexOf(search) === -1) return false;
      return true;
    });

    renderGrid();
  }

  // ---- ASSET VIEWER PAGE ----

  function renderAssetViewer() {
    var params = getQueryParams();
    var idx    = parseInt(params["i"], 10);

    if (isNaN(idx) || idx < 0 || idx >= allAssets.length) {
      showError("Asset not found.");
      return;
    }

    var asset = allAssets[idx];
    var name  = nameFromFile(asset.file);
    var sub   = getSubcategory(asset.file);

    document.getElementById("loading-msg").style.display = "none";
    document.getElementById("viewer-container").style.display = "";

    document.getElementById("viewer-asset-name").textContent = name;
    document.title = name + " — CrossWorlds Archive";

    // Media
    var mediaBox = document.getElementById("viewer-media-box");
    if (asset.type === "audio") {
      mediaBox.innerHTML =
        '<div class="audio-label">&#9834; AUDIO FILE</div>' +
        '<audio controls><source src="' + escAttr(asset.file) + '"></audio>';
    } else {
      mediaBox.innerHTML =
        '<img id="viewer-img" src="' + escAttr(asset.file) + '" alt="' + escAttr(name) + '" title="Click for fullscreen">';
      document.getElementById("viewer-img").addEventListener("click", function () {
        openFullscreen(asset.file);
      });
    }

    // Metadata table
    var tbody = document.getElementById("meta-tbody");
    var rows = [
      ["File",     asset.file],
      ["Type",     asset.type],
      ["Patch",    asset.patch],
      ["Category", asset.category],
      ["Folder",   sub || ""]
    ];
    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<th>" + escHtml(row[0]) + "</th><td>" + escHtml(row[1]) + "</td>";
      tbody.appendChild(tr);
    });

    // Download
    var dlBtn = document.getElementById("btn-download");
    if (dlBtn) {
      dlBtn.href = asset.file;
      dlBtn.setAttribute("download", asset.file.split("/").pop());
    }

    // Fullscreen button
    var fsBtn = document.getElementById("btn-fullscreen");
    if (fsBtn) {
      if (asset.type === "audio") {
        fsBtn.style.display = "none";
      } else {
        fsBtn.addEventListener("click", function (e) {
          e.preventDefault();
          openFullscreen(asset.file);
        });
      }
    }

    // Fullscreen overlay
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

  // ---- UTILITIES ----

  function getQueryParams() {
    var params = {};
    window.location.search.slice(1).split("&").forEach(function (pair) {
      var i = pair.indexOf("=");
      if (i > -1) params[decodeURIComponent(pair.slice(0, i))] = decodeURIComponent(pair.slice(i + 1));
    });
    return params;
  }

  function escHtml(str) {
    return String(str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function escAttr(str) { return escHtml(str); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
