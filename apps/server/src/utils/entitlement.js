// Subscription entitlement check. v1 has no purchase flow — subscriptions are
// set admin/DB-side only; PayPal webhooks and native IAP land in a later phase.
function isSubscriptionActive(user) {
  if (!user || !user.subscription) return false;
  const { status, expiresAt } = user.subscription;
  if (status !== 'active') return false;
  if (expiresAt && new Date(expiresAt) <= new Date()) return false;
  return true;
}

module.exports = { isSubscriptionActive };
