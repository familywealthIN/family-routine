#!/usr/bin/env node
/**
 * get-fcm-token.js
 *
 * Generates a short-lived OAuth2 access token for the FCM v1 API
 * using a Google Service Account key file.
 * Zero external dependencies — uses only Node.js built-in modules.
 *
 * Place this file AND serviceAccountKey.json on your n8n server.
 *
 * Usage:
 *   node /path/to/get-fcm-token.js
 *
 * Environment (optional):
 *   GOOGLE_APPLICATION_CREDENTIALS — path to serviceAccountKey.json
 *   (defaults to ./serviceAccountKey.json in the same directory as this script)
 *
 * Output: access token printed to stdout (no newline)
 */

const crypto = require('crypto');
const https = require('https');
const path = require('path');

const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS
    || path.join(__dirname, 'serviceAccountKey.json');

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

const key = require(KEY_PATH);

function base64url(buf) {
    return buf
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function createJWT() {
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(
        Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })),
    );
    const claim = base64url(
        Buffer.from(
            JSON.stringify({
                iss: key.client_email,
                scope: SCOPE,
                aud: key.token_uri,
                iat: now,
                exp: now + 3600,
            }),
        ),
    );

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${header}.${claim}`);
    const signature = base64url(sign.sign(key.private_key));

    return `${header}.${claim}.${signature}`;
}

function getAccessToken() {
    return new Promise((resolve, reject) => {
        const jwt = createJWT();
        const postData = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;

        const url = new URL(key.token_uri);

        const req = https.request(
            {
                hostname: url.hostname,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData),
                },
            },
            (res) => {
                let body = '';
                res.on('data', (chunk) => (body += chunk));
                res.on('end', () => {
                    try {
                        const json = JSON.parse(body);
                        if (json.access_token) resolve(json.access_token);
                        else reject(new Error(body));
                    } catch (e) {
                        reject(new Error(body));
                    }
                });
            },
        );

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

getAccessToken()
    .then((token) => process.stdout.write(token))
    .catch((err) => {
        process.stderr.write(String(err));
        process.exit(1);
    });
