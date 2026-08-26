/* ASCEND Journal v1.10.0 — static application-shell cache only. */
'use strict';

const CACHE_NAME = 'ASCEND_STATIC_v1_10_0';
const STATIC_ASSETS = new Set([
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
]);

function isSupabaseRequest(request) {
  try {
    return new URL(request.url).hostname === 'stldczwjifswmaahfhjl.supabase.co';
  } catch (_) {
    return true;
  }
}

function isExplicitStaticRequest(request) {
  if (request.method !== 'GET' || isSupabaseRequest(request)) return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return [...STATIC_ASSETS].some((asset) => new URL(asset, self.registration.scope).toString() === url.toString());
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll([...STATIC_ASSETS].map((asset) => new URL(asset, self.registration.scope).toString())))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('ASCEND_STATIC_') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!isExplicitStaticRequest(request)) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error())),
  );
});

