import { describe, expect, it } from "vitest";
import { fingerprint } from "./updates";
describe("fingerprint", () => {
  it("ignores order and duplicates", () => {
    expect(fingerprint('<script src="/assets/a.js"></script><link href="/assets/b.js"><script src="/assets/a.js">')).toBe(fingerprint('<link href="/assets/b.js"><script src="/assets/a.js">'));
  });
});
