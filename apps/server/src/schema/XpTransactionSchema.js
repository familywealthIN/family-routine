const mongoose = require('mongoose');

// Append-only XP ledger. Balance is always derived by aggregating this
// collection (credits: settle/referral/grant, debits: redeem) — there are no
// denormalized totals to drift. The unique {email, type, refKey} index is the
// idempotency guard for every write path (lazy settlement, cron sweeper,
// backfill, redeem retries).
//
// refKey conventions:
//   settle   -> the DD-MM-YYYY day key (backfill also writes type 'settle'
//               with meta.source 'backfill', so a backfilled day can never be
//               re-settled)
//   redeem   -> `${date}:${taskId}`
//   grant    -> 'welcome'
//   referral -> `ref:${inviteeEmail}` (inviter side), 'ref-bonus' (invitee)
const XpTransactionSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  type: {
    type: String,
    required: true,
    enum: ['settle', 'redeem', 'referral', 'grant'],
  },
  date: String, // DD-MM-YYYY day key the transaction applies to (user tz)
  amount: { type: Number, required: true }, // always >= 0; sign implied by type
  taskId: String, // redeem only
  refKey: { type: String, required: true },
  meta: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});

XpTransactionSchema.index({ email: 1, type: 1, refKey: 1 }, { unique: true });

const XpTransactionModel = mongoose.model('xpTransaction', XpTransactionSchema);

module.exports = { XpTransactionSchema, XpTransactionModel };
