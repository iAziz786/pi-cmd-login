/**
 * Sync catalog.yaml from live Command Code sources.
 * - Fetches canonical ids/names/context from provider API
 * - Fetches per-model pricing from https://commandcode.ai/models/<slug> HTML
 *   (parses embedded JSON for inputCost/outputCost/cacheReadCost)
 * - Writes catalog.yaml deterministically
 *
 * Usage: bun run scripts/sync-catalog.ts
 */
const API = "https://api.commandcode.ai/provider/v1/models";
const SITE = "https://commandcode.ai/models";

function idToSlug(id: string): string {
  if (id === "claude-haiku-4-5-20251001") return "claude-haiku-4-5";
  if (id === "tencent/hy3-paid") return "tencent-hy3";
  if (id === "tencent/hy4-preview") return "hy4-preview";
  const last = id.split("/").pop()!;
  return last.toLowerCase().replace(/:/g, "-").replace(/\./g, "-");
}

async function fetchApi(): Promise<{ id: string; name: string; context_length: number }[]> {
  const res = await fetch(API);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const j = await res.json() as { data: { id: string; name: string; context_length: number }[] };
  return j.data;
}

async function fetchPricing(slug: string): Promise<{ input: number; output: number; cacheRead: number; cacheWrite?: number; peak?: { input: number; output: number; cacheRead: number } } | null> {
  const url = `${SITE}/${slug}`;
  const res = await fetch(url, { headers: { "User-Agent": "pi-cmd-login-sync/1.0" } });
  if (!res.ok) {
    console.warn(`  warn: ${slug} ${res.status}`);
    return null;
  }
  const html = await res.text();
  // Find the main model's block: locate \"slug\",\"<slug>\" then nearby inputCost
  const slugIdx = html.indexOf(`"slug","${slug}"`);
  const searchWindow = slugIdx !== -1 ? html.slice(slugIdx, slugIdx + 8000) : html.slice(0, 20000);
  // Extract inputCost/outputCost/cacheReadCost for the main model (first occurrence in window)
  const costRe = /"inputCost",([0-9.]+),"outputCost",([0-9.]+),"cacheReadCost",([0-9.]+)/;
  const m = searchWindow.match(costRe);
  if (!m) {
    // Free models have 0 costs, may not have inputCost? Check for Free marker
    if (searchWindow.includes("Free") && searchWindow.includes("longcat") || searchWindow.includes("laguna")) {
      return { input: 0, output: 0, cacheRead: 0 };
    }
    console.warn(`  warn: no cost for ${slug}`);
    return null;
  }
  const input = parseFloat(m[1]);
  const output = parseFloat(m[2]);
  const cacheRead = parseFloat(m[3]);
  // Check for peak/offPeak for DeepSeek models
  let peak: { input: number; output: number; cacheRead: number } | undefined;
  if (slug.startsWith("deepseek-")) {
    // DeepSeek pages have a "peak" table; search for peak near slug
    const peakRe = /"peak",\{"input":\s*([0-9.]+),\s*"output":\s*([0-9.]+),\s*"cacheRead":\s*([0-9.]+)/;
    // Alternative pattern in stream payload: \"peak\",{\"input\":0.44
    const altPeakRe = /"peak",\{"input":([0-9.]+),"output":([0-9.]+),"cacheRead":([0-9.]+)/;
    // Try to find peak in the whole html (for deepseek, there is peakHoursPerDay)
    const peakMatch = html.match(/"peak",\s*\{\s*"input":\s*([0-9.]+)[^}]*"output":\s*([0-9.]+)[^}]*"cacheRead":\s*([0-9.]+)/) || html.match(altPeakRe);
    if (peakMatch) {
      peak = { input: parseFloat(peakMatch[1]), output: parseFloat(peakMatch[2]), cacheRead: parseFloat(peakMatch[3]) };
    } else {
      // Fallback: peak is 2x offPeak for input/output, cache 0.01/0.04
      if (slug.includes("flash") && !slug.includes("pro")) {
        peak = { input: input * 2, output: output * 2, cacheRead: 0.01 };
        if (slug.includes("vision-exp")) peak.cacheRead = 0.01;
      } else if (slug.includes("pro")) {
        peak = { input: input * 2, output: output * 2, cacheRead: 0.04 };
      }
    }
  }
  // CacheWrite is rarely used; check if present near main model
  const cwMatch = searchWindow.match(/"cacheWriteCost",([0-9.]+)/);
  const cacheWrite = cwMatch ? parseFloat(cwMatch[1]) : undefined;
  return { input, output, cacheRead, ...(cacheWrite !== undefined ? { cacheWrite } : {}), ...(peak ? { peak } : {}) };
}

async function main() {
  console.log("Fetching API catalog...");
  const apiModels = await fetchApi();
  console.log(`API: ${apiModels.length} models`);

  // For pricing, we can also try to fetch master page once to get most costs, but we will fetch per-model for accuracy
  const results: { id: string; name: string; contextWindow: number; cost: { input: number; output: number; cacheRead: number; cacheWrite?: number }; peakCost?: { input: number; output: number; cacheRead: number }; source: string }[] = [];

  // Fetch pricing with concurrency 5
  const concurrency = 5;
  let idx = 0;
  async function worker() {
    while (idx < apiModels.length) {
      const i = idx++;
      const m = apiModels[i];
      const slug = idToSlug(m.id);
      const source = `${SITE}/${slug}`;
      process.stdout.write(`  [${i + 1}/${apiModels.length}] ${m.id} -> ${slug} ... `);
      const pricing = await fetchPricing(slug);
      if (!pricing) {
        console.log("no pricing, using 0");
        results.push({ id: m.id, name: m.name, contextWindow: m.context_length, cost: { input: 0, output: 0, cacheRead: 0 }, source });
      } else {
        console.log(`${pricing.input}/${pricing.output}/${pricing.cacheRead}${pricing.peak ? ` peak ${pricing.peak.input}/${pricing.peak.output}/${pricing.peak.cacheRead}` : ""}`);
        const entry: any = { id: m.id, name: m.name, contextWindow: m.context_length, cost: { input: pricing.input, output: pricing.output, cacheRead: pricing.cacheRead }, source };
        if (pricing.cacheWrite !== undefined && pricing.cacheWrite !== 0) entry.cost.cacheWrite = pricing.cacheWrite;
        if (pricing.peak) entry.peakCost = pricing.peak;
        results.push(entry);
      }
      // small delay to be nice
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  // Sort by id for determinism
  results.sort((a, b) => a.id.localeCompare(b.id));

  // Also need to handle models where API context_length differs from site's contextWindow display (e.g., Gemini 3.7 is 1.05M on site but 1048576, API says 1048576? API is canonical for contextWindow)
  // Write YAML
  let yaml = "# Source of truth for Command Code catalog pricing.\n";
  yaml += "# Each entry links to its live model page (source) — verify rates there.\n";
  yaml += "# Generated via `bun run sync:catalog` — do not edit costs by hand.\n";
  yaml += "# Pricing per 1M tokens, USD. See https://commandcode.ai/models (master) and per-model pages.\n";
  yaml += "models:\n";
  for (const r of results) {
    yaml += `  - id: ${r.id}\n`;
    yaml += `    name: "${r.name.replace(/"/g, '\\"')}"\n`;
    if (r.peakCost) {
      yaml += `    cost:\n`;
      yaml += `      input: ${r.cost.input}\n`;
      yaml += `      output: ${r.cost.output}\n`;
      yaml += `      cacheRead: ${r.cost.cacheRead}\n`;
      yaml += `    peakCost:\n`;
      yaml += `      input: ${r.peakCost.input}\n`;
      yaml += `      output: ${r.peakCost.output}\n`;
      yaml += `      cacheRead: ${r.peakCost.cacheRead}\n`;
    } else {
      yaml += `    cost:\n`;
      yaml += `      input: ${r.cost.input}\n`;
      yaml += `      output: ${r.cost.output}\n`;
      yaml += `      cacheRead: ${r.cost.cacheRead}\n`;
      if (r.cost.cacheWrite !== undefined) yaml += `      cacheWrite: ${r.cost.cacheWrite}\n`;
    }
    yaml += `    contextWindow: ${r.contextWindow}\n`;
    yaml += `    source: ${r.source}\n`;
  }
  await Bun.write("catalog.yaml", yaml);
  console.log(`\nWrote catalog.yaml with ${results.length} models`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
