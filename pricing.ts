/**
 * DeepSeek time-of-day pricing for the Command Code provider.
 *
 * Rates from https://commandcode.ai/models/deepseek-v4-flash and
 * https://commandcode.ai/models/deepseek-v4-pro. Peak bands (UTC):
 * 01:00–04:00 and 06:00–10:00, 7h/day; off-peak is the other 17h.
 */

export type Rates = { input: number; output: number; cacheRead: number };

export const DEEPSEEK_PRICING: Record<string, { offPeak: Rates; peak: Rates }> = {
	"deepseek/deepseek-v4-flash": {
		offPeak: { input: 0.22, output: 0.66, cacheRead: 0.007 },
		peak: { input: 0.44, output: 1.32, cacheRead: 0.01 },
	},
	"deepseek/deepseek-v4-pro": {
		offPeak: { input: 0.66, output: 1.98, cacheRead: 0.02 },
		peak: { input: 1.32, output: 3.96, cacheRead: 0.04 },
	},
};

export function isDeepSeekPeakHours(date = new Date()): boolean {
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
