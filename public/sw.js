// Enhanced Service Worker for SecureVault PWA with GitHub Pages support
const CACHE_VERSION = 'securevault-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Get the base path from the service worker scope
const getBasePath = () => {
  const scope = self.registration.scope;
  const url = new URL(scope);
  return url.pathname.replace(/\/$/, '');
};

const BASE_PATH = getBasePath();

// Static assets to cache immediately
const STATIC_ASSETS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/icon-192.png`,
  `${BASE_PATH}/icon-512.png`
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      try {
        await cache.addAll(STATIC_ASSETS);
        console.log('Static assets cached successfully');
      } catch (error) {
        console.warn('Some static assets failed to cache:', error);
        // Cache what we can
        for (const asset of STATIC_ASSETS) {
          try {
            await cache.add(asset);
          } catch (e) {
            console.warn(`Failed to cache ${asset}:`, e);
          }
        }
      }
      // Skip waiting to activate immediately
      self.skipWaiting();
    })()
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(cacheName => 
            cacheName.includes('securevault') && 
            !cacheName.includes(CACHE_VERSION)
          )
          .map(cacheName => caches.delete(cacheName))
      );
      
      // Claim all clients
      await self.clients.claim();
      console.log('Service Worker activated and claiming clients');
    })()
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension/moz-extension requests
  if (request.method !== 'GET' || 
      url.protocol === 'chrome-extension:' || 
      url.protocol === 'moz-extension:') {
    return;
  }

  // Handle navigation requests (SPA routing)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle static assets (JS, CSS, images)
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // For all other requests, try network first
  event.respondWith(handleOtherRequests(request));
});

// Handle navigation requests with fallback to cached index.html
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    if (response.ok) {
      // Cache successful navigation responses
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
      return response;
    }
    throw new Error('Network response not ok');
  } catch (error) {
    // Fallback to cached index.html for SPA routing
    console.log('Network failed, serving cached index.html for navigation');
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(`${BASE_PATH}/index.html`) || 
                          await cache.match(`${BASE_PATH}/`);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Last resort fallback
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head><title>SecureVault - Offline</title></head>
      <body>
        <h1>SecureVault</h1>
        <p>The application is currently offline. Please check your connection and try again.</p>
      </body>
      </html>`,
      { 
        headers: { 'Content-Type': 'text/html' },
        status: 200
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // If not in cache, fetch from network and cache
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('Failed to fetch static asset:', error);
    // Return a basic response for failed static assets
    return new Response('', { status: 404, statusText: 'Not Found' });
  }
}

// Handle other requests with network-first strategy
async function handleOtherRequests(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If all else fails, return a network error
    throw error;
  }
}

// Check if URL is a static asset
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'];
  const pathname = url.pathname;
  
  return staticExtensions.some(ext => pathname.endsWith(ext)) ||
         pathname.includes('/assets/') ||
         pathname.includes('/static/');
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Cleanup runtime cache periodically
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'CLEANUP_CACHE') {
    try {
      const cache = await caches.open(RUNTIME_CACHE);
      const requests = await cache.keys();
      
      // Keep only the last 50 runtime cache entries
      if (requests.length > 50) {
        const toDelete = requests.slice(0, requests.length - 50);
        await Promise.all(toDelete.map(request => cache.delete(request)));
      }
      
      event.ports[0].postMessage({ success: true });
    } catch (error) {
      event.ports[0].postMessage({ success: false, error: error.message });
    }
  }
});
