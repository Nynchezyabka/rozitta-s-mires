import { describe, expect, it } from "vitest";
import { stripThinking } from "./ai-key";

describe("stripThinking", () => {
  it("removes a full think block", () => {
    expect(stripThinking('<think>хм, мышь</think>\n{"items":[]}')).toBe('{"items":[]}');
  });
  it("removes reasoning when only the closing tag is present", () => {
    expect(stripThinking('думаю...</think>{"a":1}')).toBe('{"a":1}');
  });
  it("keeps a plain answer", () => {
    expect(stripThinking('{"a":1}')).toBe('{"a":1}');
  });
});
