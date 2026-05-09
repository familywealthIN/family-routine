const fs = require('fs');
const path = require('path');

const blobDir = path.resolve(__dirname, '..', 'src', 'blob');
if (!fs.existsSync(blobDir)) {
  fs.mkdirSync(blobDir, { recursive: true });
}

const {
  FCM_API_KEY,
  FCM_AUTH_DOMAIN,
  FCM_DATABASE_URL,
  FCM_PROJECT_ID,
  FCM_STORAGE_BUCKET,
  FCM_MESSAGING_SENDER_ID,
  FCM_APP_ID,
  FCM_MEASUREMENT_ID,
  IS_DEVELOPMENT,
  NETLIFY,
  GQL_URL,
  GA_PUBLIC_KEY,
  GA_CLIENT_ID,
  GA_SERVER_CLIENT_ID,
  GA_ANDROID_CLIENT_ID,
  GA_IOS_CLIENT_ID,
} = process.env;

fs.writeFileSync(path.join(blobDir, 'config.js'), `
export const config = {
  apiKey: '${FCM_API_KEY}',
  authDomain: '${FCM_AUTH_DOMAIN}',
  databaseURL: '${FCM_DATABASE_URL}',
  projectId: '${FCM_PROJECT_ID}',
  storageBucket: '${FCM_STORAGE_BUCKET}',
  messagingSenderId: '${FCM_MESSAGING_SENDER_ID}',
  appId: '${FCM_APP_ID}',
  measurementId: '${FCM_MEASUREMENT_ID || ''}',
};

export const publicKey = '${GA_PUBLIC_KEY}';
export const isDevelopment = ${IS_DEVELOPMENT || false};
export const netlify = ${NETLIFY || false};
export const graphQLUrl = '${GQL_URL}';
export const gauthOption = {
  clientId: '${GA_CLIENT_ID}',
  serverClientId: '${GA_SERVER_CLIENT_ID || GA_CLIENT_ID}',
  androidClientId: '${GA_ANDROID_CLIENT_ID || ''}',
  iosClientId: '${GA_IOS_CLIENT_ID || ''}',
  scope: 'profile email',
  prompt: 'select_account',
};
`);
