// public/sw.js

// 1. Listen for the "Share Target" POST request from Android
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Check if the incoming request is the share target POST
  if (url.pathname === '/share-target/' && event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        try {
          // Extract the form data sent by the OS share menu
          const formData = await event.request.formData();
          const file = formData.get('file');

          if (file) {
            // Open a temporary cache to store the file
            const cache = await caches.open('shared-files-cache');
            
            // Save the file into the cache
            await cache.put('shared-file', new Response(file));
            
            console.log('✅ File intercepted by Service Worker and cached');
          }

          // Redirect the user to the app with a flag so React knows a file is waiting
          return Response.redirect('/?shared=true', 303);
          
        } catch (error) {
          console.error('❌ Error handling shared file:', error);
          // If something fails, just redirect normally
          return Response.redirect('/?shared=error', 303);
        }
      })()
    );
  }
});

// 2. Standard PWA Installation (Required for the app to be installable)
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force the new service worker to take over immediately
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim()); // Take control of all open pages
});
