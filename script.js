jQuery.fx.off = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const NASA_API_SEARCH = "https://images-api.nasa.gov/search";
const DEFAULT_QUERY = "nebula";
let loadedPhotos = [];

function buildSearchUrl(query) {
  const searchTerm = query || DEFAULT_QUERY;
  return NASA_API_SEARCH + "?q=" + encodeURIComponent(searchTerm) + "&media_type=image&page_size=24";
}

function normalizeNasaItems(response) {
  const rawItems = (response && response.collection && response.collection.items) || [];
  const photos = [];

  $.each(rawItems, function (_, item) {
    const meta = item.data && item.data[0];
    const previewLink = item.links && item.links.find(function (link) {
      return link.render === "image" && link.href;
    });

    if (!meta || !meta.nasa_id || !previewLink) return;

    const thumbUrl = previewLink.href.replace(/^http:\/\//i, "https://");
    const year = meta.date_created ? meta.date_created.slice(0, 4) : "";
    const badgeText = meta.center
      ? meta.center + (year ? " • " + year : "")
      : (year || "NASA");

    photos.push({
      id: meta.nasa_id,
      title: meta.title || meta.nasa_id,
      thumb: thumbUrl,
      badge: badgeText,
      author: meta.photographer || meta.secondary_creator || (meta.center ? "NASA / " + meta.center : "NASA")
    });
  });

  return photos;
}

function createCard(photo) {
  const card = $("<button></button>").addClass("card").attr("data-id", photo.id);
  const img = $("<img>").attr({
    src: photo.thumb,
    alt: photo.title,
    loading: "lazy"
  });
  const badge = $("<span></span>").addClass("badge").text(photo.badge);
  return card.append(img, badge);
}

function renderCatalog(photos) {
  loadedPhotos = photos;
  const grid = $("#grid");
  grid.empty();
  $.each(photos, function (i, photo) {
    const card = createCard(photo);
    grid.append(card);
    card.hide().delay(i * 40).fadeIn(400);
  });
  $("#count").text(photos.length);
}

function loadWallpapers(query) {
  $("#grid").empty();
  $("#count").text("0");
  $("#loader").text("Loading…").show();
  $("#page-title").text(query ? "Results for: " + query : "Latest space wallpapers");

  $.ajax({ url: buildSearchUrl(query), method: "GET", dataType: "json" })
    .done(function (response) {
      const photos = normalizeNasaItems(response);
      if (photos.length === 0) {
        $("#loader").text("No wallpapers found for \"" + query + "\".");
        return;
      }
      $("#loader").hide();
      renderCatalog(photos);
    })
    .fail(function () {
      $("#loader").text("Could not load wallpapers. Check your internet connection and reload the page.");
    });
}

$(function () {
  loadWallpapers("");

  $("#search-form").on("submit", function (event) {
    event.preventDefault();
    const query = $("#search-input").val().trim();
    loadWallpapers(query);
  });

  const grid = $("#grid");
  grid.on("click", ".card", function () {
    const clickedId = String($(this).attr("data-id"));
    const selected = loadedPhotos.find(function (item) {
      return String(item.id) === clickedId;
    });

    if (selected) {
      sessionStorage.setItem("nasa_wallpaper_" + clickedId, JSON.stringify(selected));
    }

    window.location.href = "wallpaper.html?id=" + encodeURIComponent(clickedId);
  });

  grid.on("mouseenter", ".card", function () {
    $(this).find(".badge").stop(true).fadeTo(150, 1);
  });
  grid.on("mouseleave", ".card", function () {
    $(this).find(".badge").stop(true).fadeTo(150, 0);
  });
});
