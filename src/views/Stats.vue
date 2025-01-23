<template>
  <div class="stats container">
    <h1>Stats</h1>
    <h2>Cookies:</h2>
    <pre>{{ getCookies() || 'No Storage Found' }}</pre>
    <h2>Local Storage:</h2>
    <pre>{{ getLocalStorage() || 'No Storage Found' }}</pre>
    <h2>Cache Storage:</h2>
    <pre>{{ cacheStorage || 'No Storage Found' }}</pre>
    <h2>Session Storage:</h2>
    <pre>{{ getSessionStorage() || 'No Storage Found' }}</pre>
  </div>
</template>

<script>

export default {
  name: 'login',
  data() {
    return {
      cacheStorage: '',
    };
  },
  mounted() {
    this.getCacheStorage();
  },
  methods: {
    getCookies() {
      let cookies = '';
      document.cookie.split('; ').forEach((cookie) => { cookies += `${cookie}\n`; });
      return cookies;
    },
    getLocalStorage() {
      let localStorage = '';
      Object.entries(window.localStorage).forEach(([key, value]) => { localStorage += `${key} => ${value}\n`; });
      return localStorage;
    },
    getSessionStorage() {
      let sessionStorage = '';
      Object.entries(window.sessionStorage).forEach(([key, value]) => { sessionStorage += `${key} => ${value}\n`; });
      return sessionStorage;
    },
    getCacheStorage() {
      window.caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.open(cacheName).then((cache) => {
            cache.keys().then((requests) => {
              requests.forEach((request) => { this.cacheStorage += `${cacheName} => ${request.url}\n`; });
            });
          });
        });
      });
    },
  },
};
</script>
<style scoped>
.container {
  margin: 0 auto;
  max-width: 800px;
}
</style>
