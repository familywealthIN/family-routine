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
 */
import { defaultDataIdFromObject } from 'apollo-cache-inmemory';

export default function dataIdFromObject(object) {
  if (object && object.id === null) return null;
  return defaultDataIdFromObject(object);
}
