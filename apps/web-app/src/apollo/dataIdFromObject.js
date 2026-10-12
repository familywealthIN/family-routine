/**
 * dataIdFromObject — how this app normalizes an entity into the Apollo store.
 *
 * Apollo's `defaultDataIdFromObject` keys a record as `${__typename}:${id}` and
 * treats a NULL id as a real one, so `{ __typename: 'StepItem', id: null }`
 * normalizes to the literal key `StepItem:null`. Every id-less object of that
 * type then shares ONE store record: `routineItems { steps { id name } }` wrote
 * every routine item's steps into `StepItem:null`, and each item read back as
 * N copies of whichever step landed there first — one routine's steps showing
 * under another, repeated once per entry in the list.
 *
 * An id that is null is not an identity. Leave those objects un-normalized and
 * Apollo stores them inline under their parent, where they belong.
 *
 * A progress card's id is the same kind of non-identity: `getProgress` labels
 * its cards 'efficiency', 'radar-chart' and so on, and those labels are slots
 * in the report, not entities — the same slot holds a different number for
 * every period and every date range asked for. Normalizing them puts /progress
 * on 'month' and /history's week card into the single record
 * `ProgressItem:efficiency`, where whichever query resolved last wins and the
 * other screen silently repaints with a figure for a period it never asked
 * about. That is the D-13 symptom (two Routine Efficiency numbers at the same
 * instant) arriving by a second route.
 *
 * `routineTiming` is the same again: a slot or routine row carries the routine's
 * id, but its counts belong to the date range asked for, so the drawer's two
 * weeks and the Progress page's year must not share one record.
 */
import { defaultDataIdFromObject } from 'apollo-cache-inmemory';

const UNNORMALIZED_TYPES = [
  'ProgressItem', 'ProgressItemValues', 'RoutineTimingSlot', 'RoutineTimingRoutine',
];

export default function dataIdFromObject(object) {
  if (object && object.id === null) return null;
  if (object && UNNORMALIZED_TYPES.includes(object.__typename)) return null;
  return defaultDataIdFromObject(object);
}
