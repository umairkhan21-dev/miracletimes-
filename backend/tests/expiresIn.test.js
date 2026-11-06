const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { parseJwtExpiresInMs } = require("../src/utils/expiresIn");

describe("parseJwtExpiresInMs", () => {
  it("parses unit suffixes", () => {
    assert.equal(parseJwtExpiresInMs("45s"), 45_000);
    assert.equal(parseJwtExpiresInMs("30m"), 30 * 60 * 1000);
    assert.equal(parseJwtExpiresInMs("12h"), 12 * 60 * 60 * 1000);
    assert.equal(parseJwtExpiresInMs("1d"), 24 * 60 * 60 * 1000);
    assert.equal(parseJwtExpiresInMs("1w"), 7 * 24 * 60 * 60 * 1000);
  });

  it("treats digit-only strings and numbers as seconds", () => {
    assert.equal(parseJwtExpiresInMs("3600"), 3600 * 1000);
    assert.equal(parseJwtExpiresInMs(3600), 3600 * 1000);
    assert.equal(parseJwtExpiresInMs("86400"), 86400 * 1000);
  });

  it("parses day phrases", () => {
    assert.equal(parseJwtExpiresInMs("2 days"), 2 * 24 * 60 * 60 * 1000);
    assert.equal(parseJwtExpiresInMs("1 day"), 24 * 60 * 60 * 1000);
  });

  it("rejects empty and invalid values", () => {
    assert.throws(() => parseJwtExpiresInMs(""), /empty/i);
    assert.throws(() => parseJwtExpiresInMs("nope"), /must be seconds/i);
    assert.throws(() => parseJwtExpiresInMs(0), /positive/i);
    assert.throws(() => parseJwtExpiresInMs("-1h"), /must be seconds/i);
  });
});
