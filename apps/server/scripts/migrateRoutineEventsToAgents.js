/* eslint-disable no-console */
/*
 * One-shot migration: copy startEvent / endEvent from routineItem docs into
 * the new Agent collection. Idempotent — re-running skips routines that
 * already have an Agent for the same (email, taskRef).
 *
 * Manual invocation only — do NOT auto-run from the deploy pipeline.
 *
 *   ENCRYPTION_KEY=... MONGDO_DB=... node apps/server/scripts/migrateRoutineEventsToAgents.js
 */
const mongoose = require('mongoose');

require('dotenv').config();

const dbConnect = require('../src/db');
const { RoutineItemModel } = require('../src/schema/RoutineItemSchema');
const { AgentModel } = require('../src/schema/AgentSchema');

const inferKind = (raw) => {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase().startsWith('curl ')) return 'curl';
  if (/^https?:\/\//i.test(trimmed)) return 'url';
  if (trimmed.toLowerCase().startsWith('notify:')) return 'notify';
  if (trimmed.toLowerCase().startsWith('log:')) return 'log';
  return null;
};

const buildEvent = (raw) => {
  const kind = inferKind(raw);
  if (!kind) return null;
  return { kind, value: raw };
};

const run = async () => {
  await dbConnect();

  const cursor = await RoutineItemModel.find({
    $or: [
      { startEvent: { $exists: true, $ne: null, $ne: '' } },
      { endEvent: { $exists: true, $ne: null, $ne: '' } },
    ],
  }).cursor();

  let scanned = 0;
  let created = 0;
  let skippedNoStart = 0;
  let skippedExisting = 0;
  let failed = 0;

  // eslint-disable-next-line no-restricted-syntax
  for await (const item of cursor) {
    scanned += 1;
    const startEvent = buildEvent(item.startEvent);
    const endEvent = buildEvent(item.endEvent);

    // Agents require a startEvent — routines that only had an endEvent are
    // skipped (the user can manually add a start event later).
    if (!startEvent) {
      skippedNoStart += 1;
      continue;
    }

    const existing = await AgentModel.findOne({
      email: item.email,
      taskRef: String(item._id),
    }).exec();

    if (existing) {
      skippedExisting += 1;
      continue;
    }

    try {
      const agent = new AgentModel({
        name: `Agent for ${item.name || 'routine'}`,
        email: item.email,
        taskRef: String(item._id),
        startEvent,
        endEvent: endEvent || null,
      });
      await agent.save();
      created += 1;
    } catch (err) {
      failed += 1;
      console.error(`[migrate] Failed for routine ${item._id}:`, err.message);
    }
  }

  console.log('[migrate] Done');
  console.log(`  scanned:         ${scanned}`);
  console.log(`  agents created:  ${created}`);
  console.log(`  skipped (existing): ${skippedExisting}`);
  console.log(`  skipped (no start event): ${skippedNoStart}`);
  console.log(`  failed:          ${failed}`);

  await mongoose.connection.close();
};

run().catch((err) => {
  console.error('[migrate] Fatal:', err);
  process.exit(1);
});
