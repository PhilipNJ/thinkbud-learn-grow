import { describe, it, expect } from "vitest";
import { computeDailyMix } from "@/lib/dailyMix";

describe("computeDailyMix", () => {
  it("enforces minimum easy questions", () => {
    const mix = computeDailyMix(10, { easy: 0, moderate: 0.5, difficult: 0.5 });
    expect(mix.easy).toBeGreaterThanOrEqual(2);
    expect(mix.easy + mix.moderate + mix.difficult).toBe(10);
  });

  it("respects ratios while normalizing to total", () => {
    const mix = computeDailyMix(10, { easy: 0.8, moderate: 0.2, difficult: 0 });
    expect(mix.easy).toBeGreaterThanOrEqual(2);
    expect(mix.easy + mix.moderate + mix.difficult).toBe(10);
  });

  it("fills remaining when rounding causes deficit", () => {
    const mix = computeDailyMix(10, { easy: 0.21, moderate: 0.39, difficult: 0.4 });
    expect(mix.easy + mix.moderate + mix.difficult).toBe(10);
  });
});
