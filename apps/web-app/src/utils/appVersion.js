/**
 * The app's version, for About's hero line.
 *
 * The design prints "Version 2.0 · beta 3", which `docs/redesign/chassis.md`
 * lists among the placeholders ("Point rates and the About version label are
 * placeholders"). There is no build stamp in this repo: no `VUE_APP_VERSION` in
 * any env file, no DefinePlugin, no release channel anywhere. The one real
 * version is `apps/web-app/package.json`.
 *
 * So that is what is read — and nothing else is invented. `VUE_APP_VERSION`
 * takes precedence if a build ever starts setting it (Vue CLI inlines any
 * `VUE_APP_*` var), and when neither exists the string is empty so About renders
 * no version line at all rather than "Version undefined · beta 3".
 */
import pkg from '../../package.json';

const fromEnv = (typeof process !== 'undefined' && process.env && process.env.VUE_APP_VERSION) || '';

export const APP_VERSION = String(fromEnv || (pkg && pkg.version) || '');

export default APP_VERSION;
