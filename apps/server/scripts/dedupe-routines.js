#!/usr/bin/env node
/* eslint-disable no-console, no-await-in-loop */
/**
 * dedupe-routines.js — merge duplicate Routine documents so the unique index
 * on {email, date} can be built.
 *
 * WHY THEY EXIST
 * --------------
 * Two code paths create a day's routine:
 *   - resolvers/routine.js `addRoutine`      — atomic upsert
 *   - resolvers/goal.js  `findTodayandSort`  — was a plain insert
 * On a new day the dashboard runs both concurrently (a goal tick can land
 * before the routine exists), so Mongo stored two documents for one
 * (email, date). `routineDate()` is a `findOne`, so it then returns an
 * arbitrary one of them — and a tick written to the other is invisible:
 * "the check goes green but it isn't saved".
 *
 * Both resolvers are now idempotent, and schema/RoutineSchema.js declares
 * `{email:1, date:1}` unique. That index CANNOT BUILD while duplicates exist,
 * so run this first.
 *
 * MERGE RULE
 * ----------
 * Keep the richest document and fold the others' progress into it, field by
 * field, per task:
 *   - stimuli:  keep the highest `earned` per stimulus name
 *   - ticked / passed / redeemed: logical OR (a true anywhere wins)
 *   - passedPoints: first non-null
 *   - skip: true if true on any duplicate
 * Nothing a user achieved is discarded, whichever document it landed on.
 *
 * USAGE
 *   node scripts/dedupe-routines.js              # dry run, prints the plan
 *   node scripts/dedupe-routines.js --apply      # perform the merge
 *   node scripts/dedupe-routines.js --apply --email someone@example.com
 */

const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const APPLY = process.argv.includes('--apply');
const emailFlag = process.argv.indexOf('--email');
const ONLY_EMAIL = emailFlag !== -1 ? process.argv[emailFlag + 1] : null;

const totalEarned = (doc) => (doc.tasklist || []).reduce(
  (sum, t) => sum + (t.stimuli || []).reduce((a, s) => a + (s.earned || 0), 0),
  0,
);

const richness = (doc) => {
  const tasks = doc.tasklist || [];
  return [
    totalEarned(doc),
    tasks.filter((t) => t.ticked).length,
    tasks.filter((t) => t.redeemed).length,
    tasks.filter((t) => t.passed).length,
    tasks.length,
  ];
};

/** Lexicographic compare of the richness tuple; > 0 means `a` is richer. */
const richer = (a, b) => {
  const ra = richness(a);
  const rb = richness(b);
  for (let i = 0; i < ra.length; i += 1) {
    if (ra[i] !== rb[i]) return ra[i] - rb[i];
  }
  return 0;
};

/** Fold every `others` task's progress into `keep`'s matching task. */
function mergeInto(keep, others) {
  const changes = [];
  const byId = new Map(
    // eslint-disable-next-line no-underscore-dangle
    (keep.tasklist || []).map((t) => [String(t._id), t]),
  );

  others.forEach((other) => {
    (other.tasklist || []).forEach((src) => {
      // eslint-disable-next-line no-underscore-dangle
      const dst = byId.get(String(src._id));
      if (!dst) return;

      (src.stimuli || []).forEach((s) => {
        const target = (dst.stimuli || []).find((x) => x.name === s.name);
        if (target && (s.earned || 0) > (target.earned || 0)) {
          changes.push(`${dst.name}: ${s.name}.earned ${target.earned} -> ${s.earned}`);
          target.earned = s.earned;
        }
      });

      ['ticked', 'passed', 'redeemed'].forEach((flag) => {
        if (src[flag] && !dst[flag]) {
          changes.push(`${dst.name}: ${flag} false -> true`);
          dst[flag] = true;
        }
      });

      if (dst.passedPoints == null && src.passedPoints != null) {
        changes.push(`${dst.name}: passedPoints -> ${src.passedPoints}`);
        dst.passedPoints = src.passedPoints;
      }
    });

    if (other.skip && !keep.skip) {
      changes.push('routine: skip false -> true');
      // eslint-disable-next-line no-param-reassign
      keep.skip = true;
    }
  });

  return changes;
}

(async () => {
  await mongoose.connect(process.env.MONGDO_DB, {
    useNewUrlParser: true, useUnifiedTopology: true,
  });
  const col = mongoose.connection.db.collection('routines');

  const match = ONLY_EMAIL ? [{ $match: { email: ONLY_EMAIL } }] : [];
  const groups = await col.aggregate([
    ...match,
    { $group: { _id: { email: '$email', date: '$date' }, n: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { n: { $gt: 1 } } },
    { $sort: { '_id.email': 1, '_id.date': 1 } },
  ]).toArray();

  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — ${groups.length} duplicated (email, date) group(s)\n`);

  let merged = 0;
  let deleted = 0;

  for (const g of groups) {
    const docs = await col.find({ _id: { $in: g.ids } }).toArray();
    const keep = docs.reduce((best, d) => (richer(d, best) > 0 ? d : best), docs[0]);
    // eslint-disable-next-line no-underscore-dangle
    const others = docs.filter((d) => String(d._id) !== String(keep._id));

    const changes = mergeInto(keep, others);
    console.log(`${g._id.email} / ${g._id.date} — ${docs.length} docs`);
    // eslint-disable-next-line no-underscore-dangle
    console.log(`   keep   ${keep._id}  (earned=${totalEarned(keep)})`);
    // eslint-disable-next-line no-underscore-dangle
    others.forEach((d) => console.log(`   delete ${d._id}  (earned=${totalEarned(d)})`));
    if (changes.length) changes.forEach((c) => console.log(`   merge  ${c}`));
    else console.log('   merge  (nothing to fold in — duplicates carried no progress)');

    if (APPLY) {
      await col.updateOne(
        // eslint-disable-next-line no-underscore-dangle
        { _id: keep._id },
        { $set: { tasklist: keep.tasklist, skip: !!keep.skip } },
      );
      // eslint-disable-next-line no-underscore-dangle
      const res = await col.deleteMany({ _id: { $in: others.map((d) => d._id) } });
      merged += 1;
      deleted += res.deletedCount;
    }
    console.log('');
  }

  if (APPLY) {
    console.log(`merged ${merged} group(s), deleted ${deleted} duplicate document(s)`);
    console.log('\nBuilding the unique index…');
    try {
      await col.createIndex({ email: 1, date: 1 }, { unique: true, name: 'email_1_date_1_unique' });
      console.log('unique index {email:1, date:1} created — duplicates are now impossible.');
    } catch (e) {
      console.error('index build FAILED:', e.message);
      process.exitCode = 1;
    }
  } else if (groups.length) {
    console.log('Re-run with --apply to merge and build the unique index.');
  } else {
    console.log('No duplicates — safe to build the unique index.');
  }

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
