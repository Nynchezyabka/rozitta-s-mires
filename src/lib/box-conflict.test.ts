import { expect, it } from "vitest";
import { BoxConflictError, requireRevision } from "./box-conflict";

it("requires the opened revision for any existing chest save", () => {
  expect(requireRevision("box", false, 3)).toBe(3);
  expect(() => requireRevision("box", false, undefined)).toThrow(BoxConflictError);
});
it("new chests and additive backup restores need no existing revision", () => {
  expect(requireRevision(undefined, false, undefined)).toBeNull();
  expect(requireRevision("box", true, undefined)).toBeNull();
});