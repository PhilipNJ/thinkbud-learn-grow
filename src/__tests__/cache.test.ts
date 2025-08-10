import { describe, it, expect } from "vitest";
import { getCache, setCache } from "@/lib/dailyMix";

describe("cache helpers", () => {
  it("stores and retrieves values by key", () => {
    const key = "test:key:1";
    const value = { a: 1, b: "x" };
    setCache(key, value);
    const out = getCache<typeof value>(key);
    expect(out).toEqual(value);
  });
});
