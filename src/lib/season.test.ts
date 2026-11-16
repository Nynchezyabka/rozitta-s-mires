import { describe, it, expect } from "vitest";
import { isXmasDate } from "./season";
import { ago } from "./spaces";

describe("новогодний режим", () => {
  it("сам включается именно 15 декабря по местному календарю", () => {
    expect(isXmasDate(new Date(2026, 11, 14, 23, 59))).toBe(false);
    expect(isXmasDate(new Date(2026, 11, 15, 0, 0))).toBe(true);
  });
  it("включён 31 декабря и 10 января", () => {
    expect(isXmasDate(new Date(2026, 11, 31))).toBe(true);
    expect(isXmasDate(new Date(2027, 0, 10))).toBe(true);
  });
  it("выключен в ноябре и 20 января", () => {
    expect(isXmasDate(new Date(2026, 10, 15))).toBe(false);
    expect(isXmasDate(new Date(2027, 0, 20))).toBe(false);
  });
});
describe("когда поливала", () => {
  it("3 дня назад", () => {
    const now = Date.UTC(2026, 10, 15, 12);
    expect(ago(new Date(now - 3 * 86400000).toISOString(), now)).toBe("3 дн. назад");
    expect(ago(null, now)).toBe("ещё не было");
  });
});
