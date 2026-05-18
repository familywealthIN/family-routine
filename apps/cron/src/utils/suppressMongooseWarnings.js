/**
 * Suppress known harmless warnings from Mongoose 5.x internals on Node.js 14+.
 *
 * 1. Circular-dependency warnings ("Accessing non-existent property 'count' …")
 *    come from Mongoose 5.x's own module structure and are completely harmless.
 *    Fixed internally in Mongoose 6+, but upgrading is a breaking change.
 *
 * 2. DEP0170 ("The URL mongodb://… is invalid")
 *    comes from the MongoDB driver 3.x expanding SRV records into individual
 *    shard URLs whose format Node.js 20+ URL parser considers invalid.
 *    The connection still works correctly.
 *
 * Call this ONCE at the very top of every process entry-point (server.js,
 * handler.js, cron scripts, etc.) BEFORE requiring mongoose.
 */
function suppressMongooseWarnings() {
  const originalEmitWarning = process.emitWarning;

  process.emitWarning = function filteredWarning(warning, ...args) {
    const msg = typeof warning === 'string'
      ? warning
      : (warning && warning.message) || '';

    // Suppress Mongoose 5.x circular-dependency property access warnings
    if (
      msg.includes('Accessing non-existent property')
      && msg.includes('circular dependency')
    ) {
      return;
    }

    // Suppress MongoDB driver SRV-expanded URL deprecation (DEP0170)
    if (msg.includes('is invalid. Future versions of Node.js will throw an error')) {
      return;
    }

    return originalEmitWarning.call(process, warning, ...args);
  };
}

module.exports = suppressMongooseWarnings;
