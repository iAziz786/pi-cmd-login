import { describe, expect, test } from "bun:test";
import {
	costFor,
	DEEPSEEK_PRICING,
	deepseekRates,
	isDeepSeekPeakHours,
} from "./pricing.ts";

// New billing rules effective 2026-08-23 00:00 Beijing time (= 2026-08-22 16:00 UTC):
// weekends (Sat/Sun, Beijing time) are charged at the off-peak rate all day.
// Weekdays keep the existing peak/off-peak tiers.

describe("isDeepSeekPeakHours", () => {
	test("peak: 01:00–03:59 UTC", () => {
		expect(isDeepSeekPeakHours(new Date("2026-08-01T01:00:00Z"))).toBe(true);
		expect(isDeepSeekPeakHours(new Date("2026-08-01T03:59:00Z"))).toBe(true);
	});

	test("peak: 06:00–09:59 UTC", () => {
		expect(isDeepSeekPeakHours(new Date("2026-08-01T06:00:00Z"))).toBe(true);
		expect(isDeepSeekPeakHours(new Date("2026-08-01T09:59:00Z"))).toBe(true);
	});

	test("off-peak: 00:00, 04:00–05:59, 10:00–23:59 UTC", () => {
		expect(isDeepSeekPeakHours(new Date("2026-08-01T00:00:00Z"))).toBe(false);
		expect(isDeepSeekPeakHours(new Date("2026-08-01T04:00:00Z"))).toBe(false);
		expect(isDeepSeekPeakHours(new Date("2026-08-01T05:59:00Z"))).toBe(false);
		expect(isDeepSeekPeakHours(new Date("2026-08-01T10:00:00Z"))).toBe(false);
		expect(isDeepSeekPeakHours(new Date("2026-08-01T23:59:00Z"))).toBe(false);
	});

	test("band edges stay in their band (01:00 starts peak, 04:00 leaves)", () => {
		expect(isDeepSeekPeakHours(new Date("2026-08-01T00:59:00Z"))).toBe(false);
		expect(isDeepSeekPeakHours(new Date("2026-08-01T01:00:00Z"))).toBe(true);
		expect(isDeepSeekPeakHours(new Date("2026-08-01T04:00:00Z"))).toBe(false);
	});
});

describe("deepseekRates", () => {
	test("flash peak vs off-peak rates", () => {
		const peak = deepseekRates("deepseek/deepseek-v4-flash", new Date("2026-08-01T02:00:00Z"));
		expect(peak).toEqual(DEEPSEEK_PRICING["deepseek/deepseek-v4-flash"].peak);
		expect(peak).toEqual({ input: 0.44, output: 1.32, cacheRead: 0.01 });

		const offPeak = deepseekRates("deepseek/deepseek-v4-flash", new Date("2026-08-01T12:00:00Z"));
		expect(offPeak).toEqual(DEEPSEEK_PRICING["deepseek/deepseek-v4-flash"].offPeak);
		expect(offPeak).toEqual({ input: 0.22, output: 0.66, cacheRead: 0.007 });
	});

	test("pro peak vs off-peak rates", () => {
		const peak = deepseekRates("deepseek/deepseek-v4-pro", new Date("2026-08-01T07:00:00Z"));
		expect(peak).toEqual({ input: 1.32, output: 3.96, cacheRead: 0.04 });

		const offPeak = deepseekRates("deepseek/deepseek-v4-pro", new Date("2026-08-01T15:00:00Z"));
		expect(offPeak).toEqual({ input: 0.66, output: 1.98, cacheRead: 0.02 });
	});

	test("unknown model returns zero rates, not a throw", () => {
		expect(deepseekRates("moonshotai/Kimi-K3", new Date("2026-08-01T02:00:00Z"))).toEqual({
			input: 0,
			output: 0,
			cacheRead: 0,
		});
	});
});

describe("weekend billing (rules effective 2026-08-23 00:00 Beijing)", () => {
	test("Sunday 10:00 Beijing (peak UTC hour) is off-peak all day", () => {
		// 2026-08-23 02:00 UTC = 2026-08-23 10:00 Sunday Beijing — peak band, but weekend
		expect(deepseekRates("deepseek/deepseek-v4-flash", new Date("2026-08-23T02:00:00Z"))).toEqual(
			DEEPSEEK_PRICING["deepseek/deepseek-v4-flash"].offPeak,
		);
		expect(deepseekRates("deepseek/deepseek-v4-pro", new Date("2026-08-23T02:00:00Z"))).toEqual(
			DEEPSEEK_PRICING["deepseek/deepseek-v4-pro"].offPeak,
		);
	});

	test("Saturday 15:00 Beijing (peak UTC hour) is off-peak all day", () => {
		// 2026-08-29 07:00 UTC = 2026-08-29 15:00 Saturday Beijing — peak band, but weekend
		expect(deepseekRates("deepseek/deepseek-v4-flash", new Date("2026-08-29T07:00:00Z"))).toEqual(
			DEEPSEEK_PRICING["deepseek/deepseek-v4-flash"].offPeak,
		);
	});

	test("weekday 10:00 Beijing (peak UTC hour) stays peak", () => {
		// 2026-08-24 02:00 UTC = 2026-08-24 10:00 Monday Beijing — peak band, weekday
		expect(deepseekRates("deepseek/deepseek-v4-flash", new Date("2026-08-24T02:00:00Z"))).toEqual(
			DEEPSEEK_PRICING["deepseek/deepseek-v4-flash"].peak,
		);
	});

	test("old rules apply before 2026-08-23 00:00 Beijing (Saturday 2026-08-22 10:00)", () => {
		// 2026-08-22 02:00 UTC = 2026-08-22 10:00 Saturday Beijing — before the new rules
		expect(deepseekRates("deepseek/deepseek-v4-flash", new Date("2026-08-22T02:00:00Z"))).toEqual(
			DEEPSEEK_PRICING["deepseek/deepseek-v4-flash"].peak,
		);
	});

	test("isDeepSeekPeakHours is false for any weekend hour (Beijing)", () => {
		// Sunday 2026-08-23 10:00 Beijing (02:00 UTC): peak band, but weekend
		expect(isDeepSeekPeakHours(new Date("2026-08-23T02:00:00Z"))).toBe(false);
		// Saturday 2026-08-29 15:00 Beijing (07:00 UTC): peak band, but weekend
		expect(isDeepSeekPeakHours(new Date("2026-08-29T07:00:00Z"))).toBe(false);
	});
});

describe("deepseek-v4-flash-vision-exp pricing", () => {
	test("shares flash peak/off-peak bands", () => {
		expect(DEEPSEEK_PRICING["deepseek/deepseek-v4-flash-vision-exp"]).toEqual(
			DEEPSEEK_PRICING["deepseek/deepseek-v4-flash"],
		);
	});

	test("weekday peak UTC hour bills peak", () => {
		expect(
			deepseekRates("deepseek/deepseek-v4-flash-vision-exp", new Date("2026-08-24T02:00:00Z")),
		).toEqual(DEEPSEEK_PRICING["deepseek/deepseek-v4-flash-vision-exp"].peak);
	});

	test("weekend peak UTC hour bills off-peak (new rules)", () => {
		expect(
			deepseekRates("deepseek/deepseek-v4-flash-vision-exp", new Date("2026-08-29T07:00:00Z")),
		).toEqual(DEEPSEEK_PRICING["deepseek/deepseek-v4-flash-vision-exp"].offPeak);
	});
});

describe("costFor", () => {
	test("off-peak flash: 500k in, 100k out, 400k cacheRead", () => {
		const cost = costFor(DEEPSEEK_PRICING["deepseek/deepseek-v4-flash"].offPeak, {
			input: 500_000,
			output: 100_000,
			cacheRead: 400_000,
			cacheWrite: 0,
		});
		expect(cost.input).toBeCloseTo(0.11, 10);
		expect(cost.output).toBeCloseTo(0.066, 10);
		expect(cost.cacheRead).toBeCloseTo(0.0028, 10);
		expect(cost.cacheWrite).toBe(0);
		expect(cost.total).toBeCloseTo(0.1788, 10);
	});

	test("peak flash doubles input/output but cacheRead only rounds up", () => {
		const cost = costFor(DEEPSEEK_PRICING["deepseek/deepseek-v4-flash"].peak, {
			input: 500_000,
			output: 100_000,
			cacheRead: 400_000,
			cacheWrite: 0,
		});
		expect(cost.input).toBeCloseTo(0.22, 10);
		expect(cost.output).toBeCloseTo(0.132, 10);
		expect(cost.cacheRead).toBeCloseTo(0.004, 10);
	});

	test("pro off-peak: 1M in, 200k out", () => {
		const cost = costFor(DEEPSEEK_PRICING["deepseek/deepseek-v4-pro"].offPeak, {
			input: 1_000_000,
			output: 200_000,
			cacheRead: 0,
			cacheWrite: 0,
		});
		expect(cost.input).toBeCloseTo(0.66, 10);
		expect(cost.output).toBeCloseTo(0.396, 10);
		expect(cost.total).toBeCloseTo(1.056, 10);
	});

	test("zero tokens cost zero", () => {
		const cost = costFor(DEEPSEEK_PRICING["deepseek/deepseek-v4-pro"].peak, {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
		});
		expect(cost.total).toBe(0);
	});
});
