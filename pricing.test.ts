import { describe, expect, test } from "bun:test";
import {
	costFor,
	DEEPSEEK_PRICING,
	deepseekRates,
	isDeepSeekPeakHours,
} from "./pricing.ts";

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
