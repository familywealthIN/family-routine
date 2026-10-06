const JsdomEnvironment = require('jest-environment-jsdom').default;

/**
 * jsdom environment pinned to Europe/London.
 *
 * The week maths in DateSelector reads local-midnight Date objects, so it only
 * misbehaves in a timezone that observes DST. Assigning process.env.TZ from
 * inside a test file has no effect — jest hands the sandbox a copy of `process`
 * — so it has to happen out here, before the environment is built.
 */
class LondonTimezoneEnvironment extends JsdomEnvironment {
  constructor(config, context) {
    const previousTimezone = process.env.TZ;
    process.env.TZ = 'Europe/London';
    super(config, context);
    this.previousTimezone = previousTimezone;
  }

  async teardown() {
    // Workers are reused, so hand the next test file the timezone it expected.
    if (this.previousTimezone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = this.previousTimezone;
    }
    await super.teardown();
  }
}

module.exports = LondonTimezoneEnvironment;
