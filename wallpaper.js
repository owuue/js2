jQuery.fx.off = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const id = new URLSearchParams(window.location.search).get("id");
let photo = null;

function getPhotoMeta(nasaId) {
  const deferred = $.Deferred();
  const cached = sessionStorage.getItem("nasa_wallpaper_" + nasaId);

  if (cached) {
    deferred.resolve(JSON.parse(cached));
    return deferred.promise();
  }

  $.getJSON("https://images-api.nasa.gov/search?nasa_id=" + encodeURIComponent(nasaId))
    .done(function (response) {
      const item = response && response.collection && response.collection.items && response.collection.items[0];
      const meta = item && item.data && item.data[0];
      if (!meta) {
        deferred.reject();
        return;
      }
      deferred.resolve({
        id: meta.nasa_id,
        title: meta.title || meta.nasa_id,
        author: meta.photographer || meta.secondary_creator || (meta.center ? "NASA / " + meta.center : "NASA")
      });
    })
    .fail(function () {
      deferred.reject();
    });

  return deferred.promise();
}

function extractImageUrls(assetResponse) {
  const items = (assetResponse && assetResponse.collection && assetResponse.collection.items) || [];
  const imageUrls = [];

  $.each(items, function (_, item) {
    if (item.href && /\.(jpe?g|png)$/i.test(item.href)) {
      imageUrls.push(item.href.replace(/^http:\/\//i, "https://"));
    }
  });

  const origUrl = imageUrls.find(function (url) { return /~orig\./i.test(url); });
  const largeUrl = imageUrls.find(function (url) { return /~large\./i.test(url); });
  const mediumUrl = imageUrls.find(function (url) { return /~medium\./i.test(url); });

  return {
    previewUrl: largeUrl || mediumUrl || origUrl || imageUrls[0] || "",
    downloadUrl: origUrl || largeUrl || imageUrls[0] || ""
  };
}

function showPhoto(meta, urls) {
  photo = {
    id: meta.id,
    title: meta.title,
    author: meta.author,
    downloadUrl: urls.downloadUrl
  };

  $("#loader").remove();
  $("title").text(meta.title);
  $("#res").text("Loading…");
  $("#author").text(meta.author);

  const img = $("<img>")
    .hide()
    .on("load", function () {
      $("#res").text(this.naturalWidth + " × " + this.naturalHeight);
      $(this).fadeIn(500);
    })
    .attr({
      src: urls.previewUrl,
      alt: meta.title
    });
  $("#preview").append(img);

  $("#info").css({ visibility: "visible", opacity: 0 }).animate({ opacity: 1 }, 400);
}

function notify(text) {
  $("#message").text(text).stop(true, true).fadeIn(200).delay(3000).fadeOut(400);
}

function downloadPhoto() {
  const btn = $("#download").prop("disabled", true).text("Downloading…");
  const ext = /\.png$/i.test(photo.downloadUrl) ? ".png" : ".jpg";

  $.ajax({ url: photo.downloadUrl, method: "GET", xhrFields: { responseType: "blob" } })
    .done(function (blob) {
      const url = URL.createObjectURL(blob);
      const link = $("<a></a>").attr({ href: url, download: "nasa-" + photo.id + ext }).appendTo("body");
      link[0].click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      notify("Download started");
    })
    .fail(function () {
      window.open(photo.downloadUrl, "_blank");
      notify("Opened in a new tab. Save the image from there.");
    })
    .always(function () {
      btn.prop("disabled", false).text("Download");
    });
}

$(function () {
  if (!/^[a-z0-9._-]+$/i.test(id || "")) {
    $("#loader").text("Wallpaper not found. Go back to the catalog.");
    return;
  }

  $.when(
    getPhotoMeta(id),
    $.getJSON("https://images-api.nasa.gov/asset/" + encodeURIComponent(id))
  )
    .done(function (meta, assetArgs) {
      const urls = extractImageUrls(assetArgs[0]);
      if (!urls.previewUrl) {
        $("#loader").text("Image file not found for this NASA item.");
        return;
      }
      showPhoto(meta, urls);
    })
    .fail(function () {
      $("#loader").text("Could not load this wallpaper. Check your internet connection and reload the page.");
    });

  $("#download").on("click", downloadPhoto);
});
