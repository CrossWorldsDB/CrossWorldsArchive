(function () {
  "use strict";

  var allAssets = [];
  var filtered = [];

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
            var data = JSON.parse(xhr.responseText);
            allAssets = data.assets || data;
            callback();
          } catch (e) {
            showError("Failed to parse assets.json: " + e.message);
          }
        } else {
          // fallback: try loading from same dir (for local file:// testing)
          showError("Could not load data/assets.json (HTTP " + xhr.status + "). Make sure you're running this via a web server or GitHub Pages.");
        }
      }
    };
    xhr.send();
  }

  function showError(msg) {
    var el = document.getElementById("loading-msg") || document.getElementById("asset-grid");
    if (el) {
      el.innerHTML = '<div class="error-msg">' + escHtml(msg) + "</div>";
    }
  }

  // ---- INDEX PAGE ----

  function renderIndex() {
    filtered = allAssets.slice();
    populateVersionFilter();
    updateStats();
    renderGrid();
    bindFilters();
  }

  function populateVersionFilter() {
    var sel = document.getElementById("filter-version");
    if (!sel) return;
    var versions = [];
    allAssets.forEach(function (a) {
      if (a.patch_version && versions.indexOf(a.patch_version) === -1) {
        versions.push(a.patch_version);
      }
    });
    versions.sort(function (a, b) {
      return versionCompare(b, a); // newest first
    });
    versions.forEach(function (v) {
      var opt = document.createElement("option");
      opt.value = v;
      opt.textContent = "v" + v;
      sel.appendChild(opt);
    });
  }

  function updateStats() {
    var texCount = allAssets.filter(function (a) { return a.type === "texture"; }).length;
    var audCount = allAssets.filter(function (a) { return a.type === "audio"; }).length;
    var el = document.getElementById("stats-bar");
    if (el) {
      el.innerHTML =
        "<span>Total Assets: <b>" + allAssets.length + "</b></span>" +
        "<span>Textures: <b>" + texCount + "</b></span>" +
        "<span>Audio: <b>" + audCount + "</b></span>";
    }
  }

  function renderGrid() {
    var grid = document.getElementById("asset-grid");
    var noResults = document.getElementById("no-results");
    var countEl = document.getElementById("result-count");
    if (!grid) return;

    if (countEl) {
      countEl.textContent = filtered.length + " result" + (filtered.length !== 1 ? "s" : "");
    }

    if (filtered.length === 0) {
      grid.innerHTML = "";
      if (noResults) noResults.style.display = "block";
      return;
    }

    if (noResults) noResults.style.display = "none";

    var inner = document.createElement("div");
    inner.className = "asset-grid-inner";

    filtered.forEach(function (asset) {
      var item = document.createElement("div");
      item.className = "asset-item";
      item.setAttribute("title", asset.name);
      item.setAttribute("data-id", asset.id);

      var thumb;
      if (asset.type === "audio") {
        thumb = document.createElement("div");
        thumb.className = "audio-thumb";
        thumb.innerHTML = "&#9834;<br>AUDIO";
      } else {
        thumb = document.createElement("img");
        thumb.src = asset.file;
        thumb.alt = asset.name;
        thumb.onerror = function () {
          this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23cccccc'/%3E%3Ctext x='50%25' y='50%25' font-size='9' fill='%23666' text-anchor='middle' dy='.3em'%3ENO IMG%3C/text%3E%3C/svg%3E";
        };
      }

      var nameEl = document.createElement("div");
      nameEl.className = "asset-name";
      nameEl.textContent = asset.name;

      var badgeEl = document.createElement("div");
      badgeEl.className = "asset-type-badge";
      badgeEl.textContent = (asset.item_type || asset.type || "").toUpperCase();

      item.appendChild(thumb);
      item.appendChild(nameEl);
      item.appendChild(badgeEl);

      item.addEventListener("click", function () {
        window.location.href = "asset.html?id=" + encodeURIComponent(asset.id);
      });

      inner.appendChild(item);
    });

    grid.innerHTML = "";
    grid.appendChild(inner);
  }

  function bindFilters() {
    var ids = ["filter-search", "filter-type", "filter-item-type", "filter-version", "sort-by"];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", applyFilters);
        el.addEventListener("change", applyFilters);
      }
    });

    var resetBtn = document.getElementById("btn-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        document.getElementById("filter-search").value = "";
        document.getElementById("filter-type").value = "";
        document.getElementById("filter-item-type").value = "";
        document.getElementById("filter-version").value = "";
        document.getElementById("sort-by").value = "name-asc";
        applyFilters();
      });
    }
  }

  function applyFilters() {
    var search = (document.getElementById("filter-search").value || "").toLowerCase().trim();
    var type = document.getElementById("filter-type").value;
    var itemType = document.getElementById("filter-item-type").value;
    var version = document.getElementById("filter-version").value;
    var sortBy = document.getElementById("sort-by").value;

    filtered = allAssets.filter(function (a) {
      if (type && a.type !== type) return false;
      if (itemType && a.item_type !== itemType) return false;
      if (version && a.patch_version !== version) return false;
      if (search) {
        var haystack = (a.name + " " + (a.tags || []).join(" ") + " " + (a.description || "")).toLowerCase();
        if (haystack.indexOf(search) === -1) return false;
      }
      return true;
    });

    // Sort
    filtered.sort(function (a, b) {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      if (sortBy === "version-new") return versionCompare(b.patch_version, a.patch_version);
      if (sortBy === "version-old") return versionCompare(a.patch_version, b.patch_version);
      return 0;
    });

    renderGrid();
  }

  function versionCompare(a, b) {
    var pa = (a || "0").split(".").map(Number);
    var pb = (b || "0").split(".").map(Number);
    for (var i = 0; i < 3; i++) {
      var diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  // ---- ASSET VIEWER PAGE ----

  function renderAssetViewer() {
    var params = getQueryParams();
    var id = params["id"];
    if (!id) {
      showError("No asset ID specified.");
      return;
    }

    var asset = null;
    for (var i = 0; i < allAssets.length; i++) {
      if (allAssets[i].id === id) {
        asset = allAssets[i];
        break;
      }
    }

    if (!asset) {
      showError("Asset not found: " + escHtml(id));
      return;
    }

    // Remove loading msg
    var loading = document.getElementById("loading-msg");
    if (loading) loading.style.display = "none";

    var container = document.getElementById("viewer-container");
    if (container) container.style.display = "";

    // Name
    var nameEl = document.getElementById("viewer-asset-name");
    if (nameEl) nameEl.textContent = asset.name;

    // Description
    var descEl = document.getElementById("viewer-description");
    if (descEl) descEl.textContent = asset.description || "(No description)";

    // Media
    var mediaBox = document.getElementById("viewer-media-box");
    if (mediaBox) {
      if (asset.type === "audio") {
        mediaBox.id = "viewer-audio-box";
        mediaBox.innerHTML =
          '<div class="audio-label">&#9834; AUDIO FILE</div>' +
          '<audio controls><source src="' + escAttr(asset.file) + '"><p style="color:#aaaaff;font-size:10px;">Your browser does not support audio.</p></audio>';
      } else {
        mediaBox.id = "viewer-image-box";
        mediaBox.innerHTML =
          '<img id="viewer-img" src="' + escAttr(asset.file) + '" alt="' + escAttr(asset.name) + '" title="Click to view fullscreen">';
        document.getElementById("viewer-img").addEventListener("click", function () {
          openFullscreen(asset.file);
        });
      }
    }

    // Metadata table
    var tbody = document.getElementById("meta-tbody");
    if (tbody) {
      var rows = [
        ["Type", capitalize(asset.type || "")],
        ["Item Type", capitalize(asset.item_type || "")],
        ["Patch Version", asset.patch_version ? "v" + asset.patch_version : ""],
        ["Category", capitalize(asset.category || "")],
        ["Resolution", asset.resolution || (asset.type === "audio" ? "N/A" : "")],
        ["File", asset.file],
        ["Tags", renderTags(asset.tags)]
      ];
      rows.forEach(function (row) {
        var tr = document.createElement("tr");
        tr.innerHTML = "<th>" + escHtml(row[0]) + "</th><td>" + (typeof row[1] === "string" ? escHtml(row[1]) : row[1]) + "</td>";
        tbody.appendChild(tr);
      });
    }

    // Download button
    var dlBtn = document.getElementById("btn-download");
    if (dlBtn) {
      dlBtn.href = asset.file;
      dlBtn.setAttribute("download", asset.file.split("/").pop());
    }

    // Fullscreen button (hide for audio)
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

    // Page title
    document.title = asset.name + " — SRCW Archive";

    // Fullscreen overlay events
    var overlay = document.getElementById("fullscreen-overlay");
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeFullscreen();
      });
    }

    var closeBtn = document.getElementById("fullscreen-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeFullscreen);
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" || e.keyCode === 27) closeFullscreen();
    });
  }

  function renderTags(tags) {
    if (!tags || tags.length === 0) return "(none)";
    return tags.map(function (t) {
      return '<span class="tag">' + escHtml(t) + "</span>";
    }).join(" ");
  }

  function openFullscreen(src) {
    var overlay = document.getElementById("fullscreen-overlay");
    var fsImg = document.getElementById("fullscreen-img");
    if (!overlay || !fsImg) return;
    fsImg.src = src;
    overlay.style.display = "block";
  }

  function closeFullscreen() {
    var overlay = document.getElementById("fullscreen-overlay");
    if (overlay) overlay.style.display = "none";
  }

  // ---- UTILITIES ----

  function getQueryParams() {
    var params = {};
    var search = window.location.search.slice(1);
    if (!search) return params;
    search.split("&").forEach(function (pair) {
      var idx = pair.indexOf("=");
      if (idx > -1) {
        params[decodeURIComponent(pair.slice(0, idx))] = decodeURIComponent(pair.slice(idx + 1));
      }
    });
    return params;
  }

  function escHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escAttr(str) {
    return escHtml(str);
  }

  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ---- RUN ----
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
