const fs = require('fs');

if (!fs.existsSync('./src/blob')) {
  fs.mkdirSync('./src/blob');
}

const {
  FCM_API_KEY,
  FCM_AUTH_DOMAIN,
  FCM_DATABASE_URL,
  FCM_PROJECT_ID,
  FCM_STORAGE_BUCKET,
  FCM_MESSAGING_SENDER_ID,
  FCM_APP_ID,
  IS_DEVELOPMENT,
  GQL_URL,
  GA_PUBLIC_KEY,
  GA_CLIENT_ID,
} = process.env;

fs.writeFileSync('./src/blob/config.js', `
export const config = {
  apiKey: '${FCM_API_KEY}',
  authDomain: '${FCM_AUTH_DOMAIN}',
  databaseURL: '${FCM_DATABASE_URL}',
  projectId: '${FCM_PROJECT_ID}',
  storageBucket: '${FCM_STORAGE_BUCKET}',
  messagingSenderId: '${FCM_MESSAGING_SENDER_ID}',
  appId: '${FCM_APP_ID}',
};

export const publicKey = '${GA_PUBLIC_KEY}';
export const isDevelopment = ${IS_DEVELOPMENT};
export const graphQLUrl = '${GQL_URL}';
export const gauthOption = {
clientId: '${GA_CLIENT_ID}',
  scope: 'profile email',
  prompt: 'select_account',
};
`);
