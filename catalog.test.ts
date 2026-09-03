import { describe, expect, test } from "bun:test";
import fs from "fs";

type Cost = { input: number; output: number; cacheRead: number; cacheWrite?: number };
type CatalogEntry = {
	id: string;
	name: string;
	cost: Cost;
	peakCost?: Cost;
	contextWindow: number;
	source: string;
};

function parseCatalogYaml(text: string): CatalogEntry[] {
	// Simple parser for the specific catalog.yaml structure — no external dep.
	// Split on "  - id:" entries (each model)
	const entries: CatalogEntry[] = [];
	const blocks = text.split(/\n\s*- id:\s*/);
	// blocks[0] is header before first model, skip
	for (let i = 1; i < blocks.length; i++) {
		const block = "id: " + blocks[i]; // restore prefix lost by split
		const id = block.match(/id:\s*([^\n]+)/)?.[1].trim();
		const name = block.match(/name:\s*"([^"]+)"/)?.[1];
		const source = block.match(/source:\s*([^\n]+)/)?.[1].trim();
		const ctx = block.match(/contextWindow:\s*([0-9]+)/)?.[1];
		if (!id || !name || !source || !ctx) throw new Error(`parse failed for block: ${block.slice(0,120)}`);
		const costBlock = block.match(/cost:\s*\n([\s\S]*?)(?:\n\s*peakCost:|\n\s*contextWindow:)/);
		const costText = costBlock?.[1] ?? "";
		const input = parseFloat(costText.match(/input:\s*([0-9.]+)/)?.[1] ?? "");
		const output = parseFloat(costText.match(/output:\s*([0-9.]+)/)?.[1] ?? "");
		const cacheRead = parseFloat(costText.match(/cacheRead:\s*([0-9.]+)/)?.[1] ?? "");
		const cacheWriteMatch = costText.match(/cacheWrite:\s*([0-9.]+)/);
		const cacheWrite = cacheWriteMatch ? parseFloat(cacheWriteMatch[1]) : undefined;
		if (Number.isNaN(input) || Number.isNaN(output) || Number.isNaN(cacheRead)) {
			throw new Error(`cost parse failed for ${id}: ${costText}`);
		}
		const peakMatch = block.match(/peakCost:\s*\n([\s\S]*?)\n\s*contextWindow:/);
		let peakCost: Cost | undefined;
		if (peakMatch) {
			const p = peakMatch[1];
			const pi = parseFloat(p.match(/input:\s*([0-9.]+)/)?.[1] ?? "");
			const po = parseFloat(p.match(/output:\s*([0-9.]+)/)?.[1] ?? "");
			const pc = parseFloat(p.match(/cacheRead:\s*([0-9.]+)/)?.[1] ?? "");
			if (!Number.isNaN(pi) && !Number.isNaN(po) && !Number.isNaN(pc)) {
				peakCost = { input: pi, output: po, cacheRead: pc };
			}
		}
		entries.push({
			id,
			name,
			cost: { input, output, cacheRead, ...(cacheWrite !== undefined ? { cacheWrite } : {}) },
			...(peakCost ? { peakCost } : {}),
			contextWindow: parseInt(ctx, 10),
			source,
		});
	}
	return entries;
}

function parseIndexModels(text: string): Map<string, { name: string; cost: Cost; contextWindow: number }> {
	const re = /id:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?cost:\s*c\(([^)]+)\)[\s\S]*?contextWindow:\s*([0-9_]+)/g;
	const map = new Map<string, { name: string; cost: Cost; contextWindow: number }>();
	let m: RegExpExecArray | null;
	while ((m = re.exec(text))) {
		const id = m[1];
		const name = m[2];
		const args = m[3].split(",").map((s) => parseFloat(s.trim()));
		const cost: Cost = { input: args[0], output: args[1], cacheRead: args[2] };
		if (args[3] !== undefined) cost.cacheWrite = args[3];
		const ctx = parseInt(m[4].replace(/_/g, ""), 10);
		map.set(id, { name, cost, contextWindow: ctx });
	}
	return map;
}

function parseDeepseekPricing(text: string): Map<string, { offPeak: Cost; peak: Cost }> {
	const re = /"(deepseek\/[^"]+)"[\s\S]*?offPeak:\s*\{\s*input:\s*([0-9.]+),\s*output:\s*([0-9.]+),\s*cacheRead:\s*([0-9.]+)[\s\S]*?peak:\s*\{\s*input:\s*([0-9.]+),\s*output:\s*([0-9.]+),\s*cacheRead:\s*([0-9.]+)/g;
	const map = new Map<string, { offPeak: Cost; peak: Cost }>();
	let m: RegExpExecArray | null;
	while ((m = re.exec(text))) {
		map.set(m[1], {
			offPeak: { input: parseFloat(m[2]), output: parseFloat(m[3]), cacheRead: parseFloat(m[4]) },
			peak: { input: parseFloat(m[5]), output: parseFloat(m[6]), cacheRead: parseFloat(m[7]) },
		});
	}
	return map;
}

const catalog = parseCatalogYaml(fs.readFileSync("catalog.yaml", "utf8"));
const indexText = fs.readFileSync("index.ts", "utf8");
const pricingText = fs.readFileSync("pricing.ts", "utf8");
const indexModels = parseIndexModels(indexText);
const deepseekPricing = parseDeepseekPricing(pricingText);

describe("catalog.yaml is source of truth — pricing cannot drift", () => {
	test("catalog.yaml exists and has 67 models", () => {
		expect(catalog.length).toBe(67);
	});

	test("every catalog entry has a valid source URL", () => {
		for (const e of catalog) {
			expect(e.source).toMatch(/^https:\/\/commandcode\.ai\/models\//);
		}
	});

	test("every model in index.ts has a matching catalog entry with identical pricing", () => {
		for (const [id, idx] of indexModels) {
			const cat = catalog.find((c) => c.id === id);
			expect(cat, `catalog missing id ${id}`).toBeDefined();
			if (!cat) continue;
			expect(idx.name).toBe(cat.name);
			expect(idx.cost).toEqual(cat.cost);
			expect(idx.contextWindow).toBe(cat.contextWindow);
		}
	});

	test("every catalog entry has a matching model in index.ts", () => {
		for (const cat of catalog) {
			const idx = indexModels.get(cat.id);
			expect(idx, `index.ts missing id ${cat.id} (source: ${cat.source})`).toBeDefined();
		}
	});

	test("catalog and index have identical id sets (no missing, no extra)", () => {
		const catIds = new Set(catalog.map((c) => c.id));
		const idxIds = new Set(indexModels.keys());
		const missing = [...catIds].filter((x) => !idxIds.has(x));
		const extra = [...idxIds].filter((x) => !catIds.has(x));
		expect({ missing, extra }).toEqual({ missing: [], extra: [] });
	});

	test("DEEPSEEK_PRICING matches catalog peak/off-peak costs", () => {
		for (const cat of catalog) {
			if (!cat.peakCost) continue;
			const pricing = deepseekPricing.get(cat.id);
			expect(pricing, `DEEPSEEK_PRICING missing ${cat.id}`).toBeDefined();
			if (!pricing) continue;
			expect(pricing.offPeak).toEqual(cat.cost);
			expect(pricing.peak).toEqual(cat.peakCost);
		}
		for (const [id, pricing] of deepseekPricing) {
			const cat = catalog.find((c) => c.id === id);
			expect(cat, `catalog missing deepseek id ${id}`).toBeDefined();
			if (!cat?.peakCost) throw new Error(`catalog entry ${id} missing peakCost`);
		}
	});

	test("catalog costs are non-negative and plausible (spot check known rates)", () => {
		// Spot checks that would have caught the last audit's bugs
		const checks: Record<string, Cost> = {
			"google/gemini-3.7-flash": { input: 1.5, output: 7.5, cacheRead: 0.15 },
			"claude-opus-5": { input: 5, output: 25, cacheRead: 0.5 },
			"moonshotai/Kimi-K2.7-Code": { input: 0.95, output: 4, cacheRead: 0.19 },
			"moonshotai/Kimi-K2.6": { input: 0.95, output: 4, cacheRead: 0.16 },
			"google/gemini-3.8-flash": { input: 1.5, output: 7.5, cacheRead: 0.15 },
			"meituan/LongCat-2.0:free": { input: 0, output: 0, cacheRead: 0 },
		};
		for (const [id, expected] of Object.entries(checks)) {
			const cat = catalog.find((c) => c.id === id);
			expect(cat, `catalog missing ${id}`).toBeDefined();
			expect(cat!.cost).toEqual(expected);
		}
	});
});
