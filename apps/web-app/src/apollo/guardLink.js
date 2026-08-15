/**
 * guardLink — installs the pending-entity guard into the Apollo link chain.
 *
 * Sits outermost, so it is the last thing to touch a response before
 * QueryManager normalizes it into the cache. That placement is the point: the
 * guard edits the payload rather than filtering what a component sees, so a
 * stale value never enters the store (and so never reaches IndexedDB either).
 *
 *   query    -> hold guarded fields at their locally-known value
 *   mutation -> confirm every entity it returns, invalidating older responses
 *
 * See utils/cacheGuard.js for the race this closes.
 */
import { ApolloLink, Observable } from 'apollo-link';
import {
  beginOperation,
  endOperation,
  applyGuards,
  captureFromResult,
} from '../utils/cacheGuard';

const isMutation = (operation) => {
  const query = operation && operation.query;
  const definitions = (query && query.definitions) || [];
  const def = definitions.find((d) => d.kind === 'OperationDefinition');
  return !!def && def.operation === 'mutation';
};

export function createGuardLink({ onHold } = {}) {
  return new ApolloLink((operation, forward) => {
    const mutating = isMutation(operation);
    const seq = beginOperation();

    return new Observable((observer) => {
      const subscription = forward(operation).subscribe({
        next: (result) => {
          // A guard failure must never break the request. Worst case we fall
          // back to the previous behaviour: the response wins.
          try {
            if (result && result.data) {
              if (mutating) {
                captureFromResult(result.data);
              } else {
                const held = applyGuards(result.data, seq);
                if (held && typeof onHold === 'function') {
                  onHold({ operationName: operation.operationName, held });
                }
              }
            }
          } catch (e) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn('[guardLink] guard skipped:', e && e.message);
            }
          }
          observer.next(result);
        },
        error: (error) => {
          endOperation(seq);
          observer.error(error);
        },
        complete: () => {
          endOperation(seq);
          observer.complete();
        },
      });

      return () => {
        // Unsubscribe before completion (component torn down, query
        // superseded): the request is abandoned, so stop counting it as
        // in-flight or it would pin every guard until the TTL.
        endOperation(seq);
        subscription.unsubscribe();
      };
    });
  });
}

export default createGuardLink;
