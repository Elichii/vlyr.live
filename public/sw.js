// VLYR does not use a service worker.
//
// Another app that once ran on the same address (e.g. localhost:3000) may have
// left one installed, and it keeps serving old cached files. Browsers check
// this URL for updates, so this version removes itself, clears its caches and
// reloads open pages so they load fresh files.
self.addEventListener("install", () => self.skipWaiting())

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
      await self.registration.unregister()
      const clients = await self.clients.matchAll({ type: "window" })
      clients.forEach((client) => client.navigate(client.url))
    })(),
  )
})
