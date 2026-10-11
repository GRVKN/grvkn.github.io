'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';

const RESOURCES = {"manifest.json": "902f7cad9f1140fe9c97c833647732d3",
"icons/grvkn.svg": "2a7103b579f500a61038c607b03feac2",
"flutter_bootstrap.js": "4ca0a32f7dab6dca678ee9b30d0e4ff9",
"assets/AssetManifest.bin.json": "dc00f57292d728eb4fb87c3050b384e7",
"assets/AssetManifest.json": "a355688472ffd67cf40dde98f0411333",
"assets/assets/demo_videos/electrical_apprenticeship.mp4": "b4f4008f8d399ab093615a6ba026d3f5",
"assets/assets/demo_videos/posters/community_volunteers.jpg": "fa34cd54834060f75d0c279b7870fb79",
"assets/assets/demo_videos/posters/local_evening_event.jpg": "b3176313a1e4a450f152958074b24c79",
"assets/assets/demo_videos/posters/regional_farm_shop.jpg": "64e9453cf2bfa75823849cb4060929fe",
"assets/assets/demo_videos/posters/local_health_studio.jpg": "358c1ae6cf7c2ce89621cfda731f5678",
"assets/assets/demo_videos/posters/electrical_apprenticeship.jpg": "38fcf18331fd17bc86231a2ec14e1894",
"assets/assets/demo_videos/posters/regional_burger.jpg": "02d1551a00dc60116fcf55a7e25438fd",
"assets/assets/demo_videos/posters/carpentry_terrace.jpg": "1a7fd00a1e6fb16a664046c351817a94",
"assets/assets/demo_videos/posters/municipal_information.jpg": "d4336b0ea2f5b3aeba89e4ae006f7db3",
"assets/assets/demo_videos/community_volunteers.mp4": "6e504d5dc15951888ecb09b06cf67d1b",
"assets/assets/demo_videos/municipal_information.mp4": "3dab49a91465a91ce916db46ded2e470",
"assets/assets/demo_videos/local_health_studio.mp4": "1d1c53df4763dec32a9d3e2ac39e399c",
"assets/assets/demo_videos/regional_burger.mp4": "645ed71c1fe5134586c68bb66cbc4ce6",
"assets/assets/demo_videos/regional_farm_shop.mp4": "7de32cfcb4989098abac0cc0ee372e8b",
"assets/assets/demo_videos/carpentry_terrace.mp4": "57c33be551c5eda864d1412f79a3d69c",
"assets/assets/demo_videos/local_evening_event.mp4": "da3b0e43150cb46b36f516ee7bb7903f",
"assets/NOTICES": "2bdc67f48f4c47bd2e65e63c7566afa6",
"assets/AssetManifest.bin": "021a0fe5b91372c5f801a588ad67b32b",
"assets/FontManifest.json": "7b2a36307916a9721811788013e65289",
"assets/shaders/ink_sparkle.frag": "ecc85a2e95f5e9f53123dcaf8cb9b6ce",
"assets/fonts/MaterialIcons-Regular.otf": "8cf60421bba272f7056e7afe570e646a",
"index.html": "c0073c9bf59da19f592d3bea3361a1c3",
"/": "c0073c9bf59da19f592d3bea3361a1c3",
"version.json": "0a49a44cf7d8d5947b92a2c394247411",
"flutter.js": "83d881c1dbb6d6bcd6b42e274605b69c",
"main.dart.js": "f360337712c330c2e9ce34ecaf700a9b",
"canvaskit/chromium/canvaskit.js": "8191e843020c832c9cf8852a4b909d4c",
"canvaskit/chromium/canvaskit.wasm": "f504de372e31c8031018a9ec0a9ef5f0",
"canvaskit/chromium/canvaskit.js.symbols": "b61b5f4673c9698029fa0a746a9ad581",
"canvaskit/canvaskit.js": "728b2d477d9b8c14593d4f9b82b484f3",
"canvaskit/skwasm.js": "ea559890a088fe28b4ddf70e17e60052",
"canvaskit/canvaskit.wasm": "7a3f4ae7d65fc1de6a6e7ddd3224bc93",
"canvaskit/skwasm.wasm": "39dd80367a4e71582d234948adc521c0",
"canvaskit/skwasm.js.symbols": "e72c79950c8a8483d826a7f0560573a1",
"canvaskit/canvaskit.js.symbols": "bdcd3835edf8586b6d6edfce8749fb77"};
// The application shell files that are downloaded before a service worker can
// start.
const CORE = ["main.dart.js",
"index.html",
"flutter_bootstrap.js",
"assets/AssetManifest.bin.json",
"assets/FontManifest.json"];

// During install, the TEMP cache is populated with the application shell files.
self.addEventListener("install", (event) => {
  self.skipWaiting();
  return event.waitUntil(
    caches.open(TEMP).then((cache) => {
      return cache.addAll(
        CORE.map((value) => new Request(value, {'cache': 'reload'})));
    })
  );
});
// During activate, the cache is populated with the temp files downloaded in
// install. If this service worker is upgrading from one with a saved
// MANIFEST, then use this to retain unchanged resource files.
self.addEventListener("activate", function(event) {
  return event.waitUntil(async function() {
    try {
      var contentCache = await caches.open(CACHE_NAME);
      var tempCache = await caches.open(TEMP);
      var manifestCache = await caches.open(MANIFEST);
      var manifest = await manifestCache.match('manifest');
      // When there is no prior manifest, clear the entire cache.
      if (!manifest) {
        await caches.delete(CACHE_NAME);
        contentCache = await caches.open(CACHE_NAME);
        for (var request of await tempCache.keys()) {
          var response = await tempCache.match(request);
          await contentCache.put(request, response);
        }
        await caches.delete(TEMP);
        // Save the manifest to make future upgrades efficient.
        await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
        // Claim client to enable caching on first launch
        self.clients.claim();
        return;
      }
      var oldManifest = await manifest.json();
      var origin = self.location.origin;
      for (var request of await contentCache.keys()) {
        var key = request.url.substring(origin.length + 1);
        if (key == "") {
          key = "/";
        }
        // If a resource from the old manifest is not in the new cache, or if
        // the MD5 sum has changed, delete it. Otherwise the resource is left
        // in the cache and can be reused by the new service worker.
        if (!RESOURCES[key] || RESOURCES[key] != oldManifest[key]) {
          await contentCache.delete(request);
        }
      }
      // Populate the cache with the app shell TEMP files, potentially overwriting
      // cache files preserved above.
      for (var request of await tempCache.keys()) {
        var response = await tempCache.match(request);
        await contentCache.put(request, response);
      }
      await caches.delete(TEMP);
      // Save the manifest to make future upgrades efficient.
      await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
      // Claim client to enable caching on first launch
      self.clients.claim();
      return;
    } catch (err) {
      // On an unhandled exception the state of the cache cannot be guaranteed.
      console.error('Failed to upgrade service worker: ' + err);
      await caches.delete(CACHE_NAME);
      await caches.delete(TEMP);
      await caches.delete(MANIFEST);
    }
  }());
});
// The fetch handler redirects requests for RESOURCE files to the service
// worker cache.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  var origin = self.location.origin;
  var key = event.request.url.substring(origin.length + 1);
  // Redirect URLs to the index.html
  if (key.indexOf('?v=') != -1) {
    key = key.split('?v=')[0];
  }
  if (event.request.url == origin || event.request.url.startsWith(origin + '/#') || key == '') {
    key = '/';
  }
  // If the URL is not the RESOURCE list then return to signal that the
  // browser should take over.
  if (!RESOURCES[key]) {
    return;
  }
  // If the URL is the index.html, perform an online-first request.
  if (key == '/') {
    return onlineFirst(event);
  }
  event.respondWith(caches.open(CACHE_NAME)
    .then((cache) =>  {
      return cache.match(event.request).then((response) => {
        // Either respond with the cached resource, or perform a fetch and
        // lazily populate the cache only if the resource was successfully fetched.
        return response || fetch(event.request).then((response) => {
          if (response && Boolean(response.ok)) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      })
    })
  );
});
self.addEventListener('message', (event) => {
  // SkipWaiting can be used to immediately activate a waiting service worker.
  // This will also require a page refresh triggered by the main worker.
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }
  if (event.data === 'downloadOffline') {
    downloadOffline();
    return;
  }
});
// Download offline will check the RESOURCES for all files not in the cache
// and populate them.
async function downloadOffline() {
  var resources = [];
  var contentCache = await caches.open(CACHE_NAME);
  var currentContent = {};
  for (var request of await contentCache.keys()) {
    var key = request.url.substring(origin.length + 1);
    if (key == "") {
      key = "/";
    }
    currentContent[key] = true;
  }
  for (var resourceKey of Object.keys(RESOURCES)) {
    if (!currentContent[resourceKey]) {
      resources.push(resourceKey);
    }
  }
  return contentCache.addAll(resources);
}
// Attempt to download the resource online before falling back to
// the offline cache.
function onlineFirst(event) {
  return event.respondWith(
    fetch(event.request).then((response) => {
      return caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, response.clone());
        return response;
      });
    }).catch((error) => {
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response != null) {
            return response;
          }
          throw error;
        });
      });
    })
  );
}
