import {
  GC_AUTH_TOKEN, GC_PICTURE, GC_USER_EMAIL, GC_USER_NAME,GC_NOTIFICATION_TOKEN
} from './constants/settings';

const CACHE_NAME = 'routine-notes-precache-v2-https://routine.familywealth.in';
const DATA_KEY = 'routine-token';

// Function to save data to Cache Storage
export async function saveData(data) {
  const {
    name, email, picture, token, notificationId
  } = data;
  localStorage.setItem(GC_USER_NAME, name);
  localStorage.setItem(GC_USER_EMAIL, email);
  localStorage.setItem(GC_PICTURE, picture);
  localStorage.setItem(GC_AUTH_TOKEN, token);
  localStorage.setItem(GC_NOTIFICATION_TOKEN,notificationId);
  const cache = await caches.open(CACHE_NAME);
  await cache.put(DATA_KEY, new Response(JSON.stringify(data)));
  window.userData = data;
}

export const getSessionItem = (key) => {
  if (window.userData) {
    return window.userData[key];
  }

  return localStorage.getItem(key);
};

// Function to load data from Cache Storage
export async function loadData() {
  const tokenExists = getSessionItem(GC_AUTH_TOKEN);
  if (!tokenExists) {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(DATA_KEY);
    if (response) {
      const userData = JSON.parse(await response.text());
      window.userData = userData;
      const {
        name, email, picture, token, notificationId
      } = userData;

      localStorage.setItem(GC_USER_NAME, name);
      localStorage.setItem(GC_USER_EMAIL, email);
      localStorage.setItem(GC_PICTURE, picture);
      localStorage.setItem(GC_AUTH_TOKEN, token);
      localStorage.setItem(GC_NOTIFICATION_TOKEN,notificationId);
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
  window.userData = null;
}

export function isRunningStandalone() {
  return window.navigator.standalone || (window.matchMedia('(display-mode: standalone)').matches);
}
