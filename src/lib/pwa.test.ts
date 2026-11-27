import { expect, it } from "vitest";
import { refuseAppWorker } from "./pwa";
it("refuses main, draft, dev and workspace previews even in production", () => {
  for (const h of ["id-preview--abc.lovable.app", "preview-2--abc.gpt-eng.com", "id-preview-draft--abc.gptengineer.run", "project--abc-dev.lovable.app", "foo.lovableproject-dev.com", "beta.lovable.dev"]) expect(refuseAppWorker(h, true, false, false)).toBe(true);
});
it("allows published app and custom domains", () => {
  expect(refuseAppWorker("rozitta-s-mires.lovable.app", true, false, false)).toBe(false);
  expect(refuseAppWorker("preview-v2--shop.example.com", true, false, false)).toBe(false);
});
it("refuses development, iframes and the kill switch", () => {
  expect(refuseAppWorker("example.com", false, false, false)).toBe(true);
  expect(refuseAppWorker("example.com", true, true, false)).toBe(true);
  expect(refuseAppWorker("example.com", true, false, true)).toBe(true);
});