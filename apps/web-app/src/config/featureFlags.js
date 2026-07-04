// Build-time feature flags (vue-cli exposes VUE_APP_* env vars).
// XP_PAYWALL_PURCHASE stays off until PayPal (web) + native IAP both land —
// selling app features via PayPal inside the iOS/Android builds would violate
// store policy, so the drawer ships without purchase CTAs in v1.
export const XP_PAYWALL_PURCHASE = process.env.VUE_APP_XP_PAYWALL_PURCHASE === 'true';

export default { XP_PAYWALL_PURCHASE };
