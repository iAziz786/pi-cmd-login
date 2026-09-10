/**
 * DeepSeek time-of-day pricing for the Command Code provider.
 *
 * Rates from https://commandcode.ai/models/deepseek-v4-flash and
 * https://commandcode.ai/models/deepseek-v4-pro. Peak bands (UTC):
 * 01:00–04:00 and 06:00–10:00, 7h/day; off-peak is the other 17h.
 *
 * Billing rules changed 2026-08-23 00:00 Beijing time (= 2026-08-22 16:00 UTC):
 * weekends (Sat/Sun, Beijing time) are charged at the off-peak rate all day;
 * weekdays keep the peak/off-peak bands. Fees before the effective time are
 * settled under the old rules (no weekend discount).
 */

export type Rates = { input: number; output: number; cacheRead: number };

// 2026-08-23 00:00 Beijing time, when the weekend billing rules took effect.
const WEEKEND_RULES_START = Date.UTC(2026, 7, 22, 16);

// Beijing is UTC+8; shifting the instant and reading the UTC weekday yields
// the weekday as it is in Beijing.
function beijingWeekday(date: Date): number {
	return new Date(date.getTime() + 8 * 3_600_000).getUTCDay();
}

export const DEEPSEEK_PRICING: Record<string, { offPeak: Rates; peak: Rates }> = {
	"deepseek/deepseek-v4-flash": {
		offPeak: { input: 0.15, output: 0.6, cacheRead: 0.003 },
		peak: { input: 0.3, output: 1.2, cacheRead: 0.006 },
	},
	"deepseek/deepseek-v4.1-flash": {
		offPeak: { input: 0.15, output: 0.6, cacheRead: 0.003 },
		peak: { input: 0.3, output: 1.2, cacheRead: 0.006 },
	},
	"deepseek/deepseek-v4-flash-vision-exp": {
		offPeak: { input: 0.22, output: 0.66, cacheRead: 0.007 },
		peak: { input: 0.44, output: 1.32, cacheRead: 0.01 },
	},
	"deepseek/deepseek-v4-pro": {
		offPeak: { input: 0.66, output: 1.98, cacheRead: 0.02 },
		peak: { input: 1.32, output: 3.96, cacheRead: 0.04 },
	},
};

export function isDeepSeekPeakHours(date = new Date()): boolean {
	// From 2026-08-23 00:00 Beijing, weekends are off-peak all day.
	if (date.getTime() >= WEEKEND_RULES_START) {
		const weekday = beijingWeekday(date);
		if (weekday === 0 || weekday === 6) return false;
	}
	const hour = date.getUTCHours();
	return (hour >= 1 && hour < 4) || (hour >= 6 && hour < 10);
}

export function deepseekRates(modelId: string, date = new Date()): Rates {
	const rates = DEEPSEEK_PRICING[modelId];
	if (!rates) return { input: 0, output: 0, cacheRead: 0 };
	return isDeepSeekPeakHours(date) ? rates.peak : rates.offPeak;
}

export type TokenUsage = {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
};

export function costFor(rates: Rates, usage: TokenUsage) {
	const input = (rates.input / 1_000_000) * usage.input;
	const output = (rates.output / 1_000_000) * usage.output;
	const cacheRead = (rates.cacheRead / 1_000_000) * usage.cacheRead;
	const cacheWrite = 0; // DeepSeek has no cache-write rate on Command Code
	return {
		input,
		output,
		cacheRead,
		cacheWrite,
		total: input + output + cacheRead + cacheWrite,
	};
}
