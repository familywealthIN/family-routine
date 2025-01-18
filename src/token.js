import {
  GC_AUTH_TOKEN, GC_PICTURE, GC_USER_EMAIL, GC_USER_NAME,
} from './constants/settings';

const CACHE_NAME = 'routine-notes-cache-v1';
const DATA_KEY = 'routine-token';

// Function to save data to Cache Storage
export async function saveData(data) {
  const {
    name, email, picture, token,
  } = data;
  localStorage.setItem(GC_USER_NAME, name);
  localStorage.setItem(GC_USER_EMAIL, email);
  localStorage.setItem(GC_PICTURE, picture);
  localStorage.setItem(GC_AUTH_TOKEN, token);
  const cache = await caches.open(CACHE_NAME);
  await cache.put(DATA_KEY, new Response(JSON.stringify(data)));
}

// Function to load data from Cache Storage
export async function loadData() {
  const token = localStorage.getItem(GC_AUTH_TOKEN);
  if (!token) {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(DATA_KEY);
    if (response) {
      const userData = JSON.parse(await response.text());
      const {
        name, email, picture, token,
      } = userData;
      console.log('Data from cache', userData);
      localStorage.setItem(GC_USER_NAME, name);
      localStorage.setItem(GC_USER_EMAIL, email);
      localStorage.setItem(GC_PICTURE, picture);
      localStorage.setItem(GC_AUTH_TOKEN, token);
      return userData;
    }
  }
  return null;
}

export async function clearData() {
  localStorage.removeItem(GC_USER_NAME);
  localStorage.removeItem(GC_USER_EMAIL);
  localStorage.removeItem(GC_PICTURE);
  localStorage.removeItem(GC_AUTH_TOKEN);
  const cache = await caches.open(CACHE_NAME);
  await cache.delete(DATA_KEY);
}
