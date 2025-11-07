import { describe, expect, test } from "vitest";
import { computeBackoffDelay } from "../src/lib/queue";

describe("computeBackoffDelay", () => {
  test("uses base delay for first attempt", () => {
    expect(computeBackoffDelay(1, 2000, 10000)).toBe(2000);
  });

  test("doubles delay for subsequent attempts", () => {
    expect(computeBackoffDelay(3, 1000, 10000)).toBe(4000);
  });

  test("caps delay at provided maximum", () => {
    expect(computeBackoffDelay(5, 500, 4000)).toBe(4000);
  });
});
