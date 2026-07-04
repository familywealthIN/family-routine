const mongoose = require('mongoose');

// One lifetime referral per invitee (unique inviteeEmail) — guards re-invites
// and group-hopping. Reward is gated on the invitee reaching 3 settled days
// with nonzero earnings (see xpLedger.maybeRewardReferral); the inviter has a
// lifetime cap of 10 rewarded invites, after which referrals end as 'capped'.
const ReferralSchema = new mongoose.Schema({
  inviterEmail: { type: String, required: true, index: true },
  inviteeEmail: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['pending', 'rewarded', 'capped'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
  rewardedAt: Date,
});

const ReferralModel = mongoose.model('referral', ReferralSchema);

module.exports = { ReferralSchema, ReferralModel };
