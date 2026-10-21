/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "402b66900e731ca748771b6fc5e7a068"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "0ad719326deb893cc0bf702c11afc3a5"
  }, {
    "url": "pwa-512x512.png",
    "revision": "0ad719326deb893cc0bf702c11afc3a5"
  }, {
    "url": "pwa-192x192.png",
    "revision": "d3bc4998542ef1a640088106727c5bcd"
  }, {
    "url": "index.html",
    "revision": "95c38e1ef1d4afd6a3b2e59c80759c01"
  }, {
    "url": "icon.svg",
    "revision": "2f82369c01d12823449da35ad2424abf"
  }, {
    "url": "favicon.ico",
    "revision": "87a50fbb7419755089662e56712e151a"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "707cc1244c879573f75ac9fe79061b63"
  }, {
    "url": "models/tiny_face_detector_model-weights_manifest.json",
    "revision": "862f9faaeb421d87a569666df52b84d2"
  }, {
    "url": "models/face_recognition_model-weights_manifest.json",
    "revision": "1b056fd5dd4ddc1b83edc726a32c973e"
  }, {
    "url": "models/face_landmark_68_model-weights_manifest.json",
    "revision": "5d083f3f330b61925025ec8d81361db7"
  }, {
    "url": "assets/index-S-XAP0ZZ.js",
    "revision": null
  }, {
    "url": "assets/index-DZ-yFFug.css",
    "revision": null
  }, {
    "url": "models/tiny_face_detector_model-shard1",
    "revision": "2e48b20953b0c59df47459d0319843a0"
  }, {
    "url": "models/face_recognition_model-shard2",
    "revision": "f2091ed03625f6e164a637c2326691c1"
  }, {
    "url": "models/face_recognition_model-shard1",
    "revision": "cb6f0f62e7598d70acf76483185a962b"
  }, {
    "url": "models/face_landmark_68_model-shard1",
    "revision": "124304f06e07fcf928290ff776e96141"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "707cc1244c879573f75ac9fe79061b63"
  }, {
    "url": "favicon.ico",
    "revision": "87a50fbb7419755089662e56712e151a"
  }, {
    "url": "icon.svg",
    "revision": "2f82369c01d12823449da35ad2424abf"
  }, {
    "url": "pwa-192x192.png",
    "revision": "d3bc4998542ef1a640088106727c5bcd"
  }, {
    "url": "pwa-512x512.png",
    "revision": "0ad719326deb893cc0bf702c11afc3a5"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "0ad719326deb893cc0bf702c11afc3a5"
  }, {
    "url": "manifest.webmanifest",
    "revision": "8864919141eb4a2ab1862cc5cdb01cfe"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
