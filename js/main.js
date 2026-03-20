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
    var loading = document.getElementById("loading-msg");
    if (loading) {
      loading.innerHTML = '<div class="error-msg">' + escHtml(msg) + "</div>";
    }
  }

  function nameFromFile(filepath) {
    return filepath.split("/").pop().replace(/\.[^.]+$/, "").replace(/_/g, " ");
  }

  function filenameFromPath(filepath) {
    return filepath.split("/").pop();
  }

  function getSubfolder(filepath) {
    var parts = filepath.split("/");
    return parts[3] || null;
  }


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
      opt.value = p; opt.textContent = p;
      patchSel.appendChild(opt);
    });

    var subcatSel = document.getElementById("filter-subcat");
    subcats.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s; opt.textContent = s;
      subcatSel.appendChild(opt);
    });
  }

  function updateStats() {
    var counts = {};
    allAssets.forEach(function (a) {
      counts[a.type] = (counts[a.type] || 0) + 1;
    });
    var el = document.getElementById("stats-bar");
    if (el) {
      var parts = ["Total files: <b>" + allAssets.length + "</b>"];
      ["texture","mesh","animation","audio"].forEach(function (t) {
        if (counts[t]) parts.push(capitalize(t) + "s: <b>" + counts[t] + "</b>");
      });
      el.innerHTML = parts.join(" &nbsp;&mdash;&nbsp; ");
    }
  }
  function buildDisplayList(assets) {
    var display    = [];
    var seenGroups = {};

    assets.forEach(function (a) {
      if (!a.group) {
        display.push({ rep: a, grouped: false });
      } else {
        if (!seenGroups[a.group]) {
          seenGroups[a.group] = true;
          var groupMembers = allAssets.filter(function (x) { return x.group === a.group; });
          var thumb = null;
          for (var i = 0; i < groupMembers.length; i++) {
            if (groupMembers[i].type === "texture") { thumb = groupMembers[i]; break; }
          }
          if (!thumb) thumb = groupMembers[0];
          display.push({ rep: thumb, grouped: true, group: a.group, count: groupMembers.length });
        }
      }
    });

    return display;
  }

  function renderGrid() {
    var grid    = document.getElementById("asset-grid");
    var noRes   = document.getElementById("no-results");
    var countEl = document.getElementById("result-count");
    var loading = document.getElementById("loading-msg");

    if (loading) loading.style.display = "none";

    var displayList = buildDisplayList(filtered);

    if (countEl) countEl.textContent = "Showing " + displayList.length + " item" + (displayList.length !== 1 ? "s" : "");

    grid.querySelectorAll(".asset-card").forEach(function (c) { c.parentNode.removeChild(c); });

    if (displayList.length === 0) {
      if (noRes) noRes.style.display = "block";
      return;
    }
    if (noRes) noRes.style.display = "none";

    displayList.forEach(function (entry) {
      var asset     = entry.rep;
      var idx       = allAssets.indexOf(asset);
      var subfolder = getSubfolder(asset.file);

      var name;
      if (entry.grouped) {
        var gparts = entry.group.split("::");
        name = gparts[gparts.length - 1].replace(/_/g, " ");
      } else {
        name = nameFromFile(asset.file);
      }

      var card = document.createElement("div");
      card.className = "asset-card";

      var thumb = document.createElement("div");
      thumb.className = "asset-card-thumb";

      if (asset.type === "texture") {
        var img = document.createElement("img");
        img.src = asset.file;
        img.alt = name;
        img.loading = "lazy";
        img.onerror = function () {
          this.style.display = "none";
          thumb.style.background = "#dddddd";
        };
        thumb.appendChild(img);
      } else {
        thumb.classList.add("file-thumb");
        thumb.setAttribute("data-type", asset.type);
        var icon = typeIcon(asset.type);
        thumb.innerHTML = '<div class="file-thumb-icon">' + icon + '</div><div class="file-thumb-label">' + asset.type.toUpperCase() + '</div>';
      }

      var body = document.createElement("div");
      body.className = "asset-card-body";

      var nameEl = document.createElement("div");
      nameEl.className = "asset-card-name";
      nameEl.textContent = name;
      nameEl.title = name;

      var folderEl = document.createElement("div");
      folderEl.className = "asset-card-folder";
      folderEl.textContent = (asset.subfolder || subfolder || asset.category || "") + " / " + asset.patch;

      var badge = document.createElement("span");
      if (entry.grouped) {
        badge.className = "asset-card-badge badge-group";
        badge.textContent = entry.count + " files";
      } else {
        badge.className = "asset-card-badge badge-" + asset.type;
        badge.textContent = asset.type;
      }

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

  function typeIcon(type) {
    if (type === "mesh")      return "&#9713;";
    if (type === "animation") return "&#9654;";
    if (type === "audio")     return "&#9834;";
    return "&#9723;";
  }

  function bindFilters() {
    ["filter-search","filter-type","filter-patch","filter-subcat"].forEach(function (id) {
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


  function renderAssetViewer() {
    var params = getQueryParams();
    var idx    = parseInt(params["i"], 10);
    var loading = document.getElementById("loading-msg");

    if (isNaN(idx) || idx < 0 || idx >= allAssets.length) {
      if (loading) loading.textContent = "Asset not found.";
      return;
    }

    var asset = allAssets[idx];

    if (loading) loading.style.display = "none";
    document.getElementById("viewer-container").style.display = "";

    var name = nameFromFile(asset.file);
    document.getElementById("viewer-asset-name").textContent = name;
    document.title = name + " — CrossWorlds Archive";

    if (asset.group) {
      renderGroupedViewer(asset);
    } else {
      renderSimpleViewer(asset);
    }

    document.getElementById("fullscreen-overlay").addEventListener("click", function (e) {
      if (e.target === this) closeFullscreen();
    });
    document.getElementById("fullscreen-close").addEventListener("click", closeFullscreen);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeFullscreen();
    });
  }


  function renderSimpleViewer(asset) {
    document.getElementById("viewer-simple").style.display = "";

    var mediaBox = document.getElementById("viewer-media-box");

    if (asset.type === "audio") {
      mediaBox.classList.add("audio-box");
      mediaBox.innerHTML =
        '<div class="audio-label">&#9834; Audio file</div>' +
        '<audio controls style="width:100%;"><source src="' + escAttr(asset.file) + '"></audio>';
    } else if (asset.type === "texture") {
      mediaBox.innerHTML =
        '<img id="viewer-img" src="' + escAttr(asset.file) + '" alt="" title="Click for fullscreen">';
      document.getElementById("viewer-img").addEventListener("click", function () {
        openFullscreen(asset.file);
      });
    } else {
      mediaBox.classList.add("file-box");
      mediaBox.innerHTML =
        '<div class="file-box-icon">' + typeIcon(asset.type) + '</div>' +
        '<div class="file-box-label">' + asset.type.toUpperCase() + ' FILE</div>' +
        '<div class="file-box-name">' + escHtml(filenameFromPath(asset.file)) + '</div>';
    }

    var tbody = document.getElementById("meta-tbody");
    [
      ["File",     asset.file],
      ["Type",     asset.type],
      ["Patch",    asset.patch],
      ["Category", asset.category],
      ["Folder",   asset.subfolder || getSubfolder(asset.file) || "—"]
    ].forEach(function (row) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<th>" + escHtml(row[0]) + "</th><td>" + escHtml(row[1]) + "</td>";
      tbody.appendChild(tr);
    });

    var dlBtn = document.getElementById("btn-download");
    dlBtn.href = asset.file;
    dlBtn.setAttribute("download", filenameFromPath(asset.file));

    var fsBtn = document.getElementById("btn-fullscreen");
    if (asset.type !== "texture") {
      fsBtn.style.display = "none";
    } else {
      fsBtn.addEventListener("click", function (e) {
        e.preventDefault();
        openFullscreen(asset.file);
      });
    }
  }


  function renderGroupedViewer(asset) {
    document.getElementById("viewer-grouped").style.display = "";

    var groupAssets = allAssets.filter(function (a) {
      return a.group === asset.group;
    });

    var textures   = groupAssets.filter(function (a) { return a.type === "texture"; });
    var meshes     = groupAssets.filter(function (a) { return a.type === "mesh"; });
    var animations = groupAssets.filter(function (a) { return a.type === "animation"; });

    var groupParts  = asset.group.split("::");
    var entityName  = groupParts[3] || groupParts[groupParts.length - 1] || asset.group;

    var tbody = document.getElementById("grouped-meta-tbody");
    [
      ["Name",      entityName],
      ["Patch",     asset.patch],
      ["Category",  asset.category],
      ["Type",      asset.subfolder || ""],
      ["Textures",  textures.length],
      ["Meshes",    meshes.length],
      ["Animations",animations.length]
    ].forEach(function (row) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<th>" + escHtml(row[0]) + "</th><td>" + escHtml(String(row[1])) + "</td>";
      tbody.appendChild(tr);
    });

    var totalFiles = groupAssets.length;
    document.getElementById("zip-info").textContent =
      totalFiles + " file" + (totalFiles !== 1 ? "s" : "") + " total — " +
      textures.length + " texture" + (textures.length !== 1 ? "s" : "") + ", " +
      meshes.length + " mesh" + (meshes.length !== 1 ? "es" : "") + ", " +
      animations.length + " animation" + (animations.length !== 1 ? "s" : "");

    document.getElementById("btn-zip").addEventListener("click", function () {
      buildZip(groupAssets, entityName);
    });

    setTabCount("textures",   textures.length);
    setTabCount("meshes",     meshes.length);
    setTabCount("animations", animations.length);

    renderTextureGrid(textures);

    renderFileList(document.getElementById("mesh-list"), meshes, "mesh");

    renderFileList(document.getElementById("anim-list"), animations, "animation");

    document.querySelectorAll(".tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tab = this.getAttribute("data-tab");
        document.querySelectorAll(".tab-btn").forEach(function (b) { b.classList.remove("active"); });
        document.querySelectorAll(".tab-panel").forEach(function (p) { p.style.display = "none"; });
        this.classList.add("active");
        document.getElementById("tab-" + tab).style.display = "";
      });
    });
  }

  function setTabCount(tab, count) {
    var btn = document.querySelector('.tab-btn[data-tab="' + tab + '"]');
    if (btn) btn.textContent = capitalize(tab) + " (" + count + ")";
  }

  function renderTextureGrid(textures) {
    var grid = document.getElementById("texture-grid");
    if (textures.length === 0) {
      grid.innerHTML = '<div class="empty-tab">No textures found.</div>';
      return;
    }
    textures.forEach(function (asset) {
      var name = filenameFromPath(asset.file);

      var item = document.createElement("div");
      item.className = "texture-item";

      var img = document.createElement("img");
      img.src = asset.file;
      img.alt = name;
      img.loading = "lazy";
      img.title = "Click to view fullscreen";
      img.onerror = function () {
        this.style.display = "none";
        item.style.background = "#dddddd";
      };
      img.addEventListener("click", function () { openFullscreen(asset.file); });

      var label = document.createElement("div");
      label.className = "texture-item-name";
      label.textContent = name;
      label.title = name;

      var dl = document.createElement("a");
      dl.className = "viewer-btn dl-btn";
      dl.href = asset.file;
      dl.setAttribute("download", name);
      dl.textContent = "Download";

      item.appendChild(img);
      item.appendChild(label);
      item.appendChild(dl);
      grid.appendChild(item);
    });
  }

  function renderFileList(container, assets, type) {
    if (assets.length === 0) {
      container.innerHTML = '<div class="empty-tab">No ' + type + ' files found.</div>';
      return;
    }
    assets.forEach(function (asset) {
      var name = filenameFromPath(asset.file);

      var row = document.createElement("div");
      row.className = "file-row";

      var icon = document.createElement("span");
      icon.className = "file-row-icon";
      icon.innerHTML = typeIcon(type);

      var info = document.createElement("div");
      info.className = "file-row-info";

      var nameEl = document.createElement("div");
      nameEl.className = "file-row-name";
      nameEl.textContent = name;
      nameEl.title = name;

      var pathEl = document.createElement("div");
      pathEl.className = "file-row-path";
      pathEl.textContent = asset.file;

      info.appendChild(nameEl);
      info.appendChild(pathEl);

      var dl = document.createElement("a");
      dl.className = "viewer-btn dl-btn";
      dl.href = asset.file;
      dl.setAttribute("download", name);
      dl.textContent = "Download";

      row.appendChild(icon);
      row.appendChild(info);
      row.appendChild(dl);
      container.appendChild(row);
    });
  }


  function buildZip(assets, entityName) {
    var statusEl = document.getElementById("zip-status");
    var btnEl    = document.getElementById("btn-zip");

    if (typeof JSZip === "undefined") {
      statusEl.textContent = "Error: JSZip failed to load.";
      return;
    }

    btnEl.disabled = true;
    btnEl.textContent = "Building zip...";
    statusEl.textContent = "Fetching files (0 / " + assets.length + ")...";

    var zip      = new JSZip();
    var done     = 0;
    var failed   = 0;
    var promises = assets.map(function (asset) {
      return fetch(asset.file)
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.arrayBuffer();
        })
        .then(function (buf) {
          var zipPath = asset.file.replace(/^assets\//, "");
          zip.file(zipPath, buf);
          done++;
          statusEl.textContent = "Fetching files (" + done + " / " + assets.length + ")...";
        })
        .catch(function () {
          failed++;
          done++;
          statusEl.textContent = "Fetching files (" + done + " / " + assets.length + ")...";
        });
    });

    Promise.all(promises).then(function () {
      statusEl.textContent = "Generating zip...";
      return zip.generateAsync({ type: "blob" });
    }).then(function (blob) {
      var url  = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", entityName + ".zip");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      btnEl.disabled = false;
      btnEl.textContent = "\u2193 Download All as .zip";
      statusEl.textContent = failed > 0
        ? "Done. " + failed + " file(s) could not be fetched."
        : "Done.";
    }).catch(function (e) {
      statusEl.textContent = "Zip error: " + e.message;
      btnEl.disabled = false;
      btnEl.textContent = "\u2193 Download All as .zip";
    });
  }


  function openFullscreen(src) {
    document.getElementById("fullscreen-img").src = src;
    document.getElementById("fullscreen-overlay").style.display = "block";
  }

  function closeFullscreen() {
    document.getElementById("fullscreen-overlay").style.display = "none";
  }


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
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function escAttr(s) { return escHtml(s); }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
