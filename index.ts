/**
 * Command Code provider (https://commandcode.ai/docs/provider)
 *
 * OpenAI-compatible Chat Completions API:
 *   baseUrl: https://api.commandcode.ai/provider/v1
 *   auth:    Bearer <key>  (stored via `/login command-code`, or $CMD_CODE_API_KEY)
 *
 * Model roster is static — canonical ids from
 *   GET https://api.commandcode.ai/provider/v1/models
 * with context windows from the models endpoint and per-1M-token USD prices
 * from https://commandcode.ai/models (open-weight Go-plan models plus the
 * premium models available on every plan: GPT-5.6 Luna, Grok 4.5).
 *
 * The gateway proxies to many upstreams, so request fields stay conservative:
 * `max_tokens` instead of `max_completion_tokens`, and no `reasoning_effort`.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	costFor,
	DEEPSEEK_PRICING,
	deepseekRates,
} from "./pricing.ts";

const BASE_URL = "https://api.commandcode.ai/provider/v1";

const ZERO_CACHE_WRITE = 0;
const c = (input: number, output: number, cacheRead: number, cacheWrite = ZERO_CACHE_WRITE) => ({
	input,
	output,
	cacheRead,
	cacheWrite,
});

// Common compat: send max_tokens (deprecated-but-universal OpenAI field),
// skip reasoning_effort to avoid 400s on strict upstreams.
const COMPAT = { maxTokensField: "max_tokens", supportsReasoningEffort: false } as const;

// DeepSeek models accept the DeepSeek thinking controls (like Hetzner):
// thinking: {type: "enabled"} + reasoning_effort. Map enables max level.
const DEEPSEEK_THINKING = {
	off: "disabled",
	minimal: "low",
	low: "low",
	medium: "medium",
	high: "high",
	xhigh: "max",
	max: "max",
} as const;

const DEEPSEEK_COMPAT = {
	thinkingFormat: "deepseek",
	maxTokensField: "max_tokens",
	supportsReasoningEffort: true,
	requiresReasoningContentOnAssistantMessages: true,
} as const;

// Other open-weight families (GLM/Qwen/Kimi/MiniMax/MiMo/Inkling) and
// OpenAI-format premium models cap effort at "high"; the gateway accepts
// reasoning_effort (probed: qwen/deepseek effort actually changes reasoning
// depth) but has no "max" tier. Exposes all pi levels without inventing
// upstream values.
const THINKING = {
	off: "disabled",
	minimal: "low",
	low: "low",
	medium: "medium",
	high: "high",
	xhigh: "high",
	max: "high",
} as const;

// Anthropic upstream: reasoning_effort controls thinking depth.
const ANTHROPIC_COMPAT = {
	maxTokensField: "max_tokens",
	supportsReasoningEffort: true,
} as const;

// Google Gemini upstream: thinking budget tokens via reasoning_effort.
const GEMINI_COMPAT = {
	maxTokensField: "max_tokens",
	supportsReasoningEffort: true,
} as const;

// GLM upstream speaks the zai thinking contract (thinking: {type} + reasoning_effort).
const ZAI_COMPAT = {
	thinkingFormat: "zai",
	maxTokensField: "max_tokens",
	supportsReasoningEffort: true,
} as const;

// Qwen upstream reads enable_thinking + reasoning_effort.
const QWEN_COMPAT = {
	thinkingFormat: "qwen",
	maxTokensField: "max_tokens",
	supportsReasoningEffort: true,
} as const;

// OpenAI-schema reasoning_effort (low/medium/high) for the rest.
const REASONING_COMPAT = {
	maxTokensField: "max_tokens",
	supportsReasoningEffort: true,
} as const;

export default function (pi: ExtensionAPI) {
	pi.registerProvider("command-code", {
		name: "Command Code",
		baseUrl: BASE_URL,
		apiKey: "$CMD_CODE_API_KEY",
		api: "openai-completions",
		models: [
			// DeepSeek
			// DeepSeek — time-of-day pricing (docs: commandcode.ai/models/deepseek-v4-{flash,pro}):
			//   Off-peak (17h/day): flash $0.22/$0.66/$0.007, pro $0.66/$1.98/$0.02
			//   Peak (7h/day, 01–04 & 06–10 UTC): flash $0.44/$1.32/$0.01, pro $1.32/$3.96/$0.04
			// pi supports only flat rates, so off-peak (the page headline rate) is used;
			// during peak hours actual cost runs ~2x. Pro page also had a −75% deal
			// (ends 2026-08-16) baked into these numbers.
			{
				id: "deepseek/deepseek-v4-flash",
				name: "DeepSeek V4 Flash",
				reasoning: true,
				input: ["text"],
				cost: c(0.22, 0.66, 0.007),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: DEEPSEEK_THINKING,
				compat: DEEPSEEK_COMPAT,
			},
			{
				id: "deepseek/deepseek-v4-pro",
				name: "DeepSeek V4 Pro",
				reasoning: true,
				input: ["text"],
				cost: c(0.66, 1.98, 0.02),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: DEEPSEEK_THINKING,
				compat: DEEPSEEK_COMPAT,
			},
			{
				id: "deepseek/deepseek-v4-flash-vision-exp",
				name: "DeepSeek V4 Flash Vision (exp)",
				reasoning: true,
				input: [
					"text",
					"image"
				],
				cost: c(0.22, 0.66, 0.007),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: DEEPSEEK_THINKING,
				compat: DEEPSEEK_COMPAT,
			},
			{
				id: "deepseek/deepseek-v4-flash-fast",
				name: "DeepSeek V4 Flash Fast",
				reasoning: true,
				input: [
					"text",
					"image"
				],
				cost: c(0.28, 0.56, 0.07),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: DEEPSEEK_THINKING,
				compat: DEEPSEEK_COMPAT,
			},
			// --- Anthropic Claude ---
			{
				id: "claude-fable-5",
				name: "Claude Fable 5",
				reasoning: true,
				input: ["text", "image"],
				cost: c(10, 50, 1),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: ANTHROPIC_COMPAT,
			},
			{
				id: "claude-fable-5-1",
				name: "Claude Fable 5.1",
				reasoning: true,
				input: ["text", "image"],
				cost: c(10, 50, 0.25),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: ANTHROPIC_COMPAT,
			},
			{
				id: "claude-opus-5",
				name: "Claude Opus 5",
				reasoning: true,
				input: ["text", "image"],
				cost: c(25, 100, 0.5),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: ANTHROPIC_COMPAT,
			},
			{
				id: "claude-opus-4-8",
				name: "Claude Opus 4.8",
				reasoning: true,
				input: ["text", "image"],
				cost: c(5, 25, 0.5),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: ANTHROPIC_COMPAT,
			},
			{
				id: "claude-opus-4-7",
				name: "Claude Opus 4.7",
				reasoning: true,
				input: ["text", "image"],
				cost: c(5, 25, 0.5),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: ANTHROPIC_COMPAT,
			},
			{
				id: "claude-sonnet-5",
				name: "Claude Sonnet 5",
				reasoning: true,
				input: ["text", "image"],
				cost: c(2, 10, 0.2),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: ANTHROPIC_COMPAT,
			},
			{
				id: "claude-sonnet-4-6",
				name: "Claude Sonnet 4.6",
				reasoning: true,
				input: ["text", "image"],
				cost: c(3, 15, 0.3),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: ANTHROPIC_COMPAT,
			},
			{
				id: "claude-haiku-4-5-20251001",
				name: "Claude Haiku 4.5",
				reasoning: true,
				input: ["text", "image"],
				cost: c(1, 5, 0.1),
				contextWindow: 200000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: ANTHROPIC_COMPAT,
			},
			// --- Google Gemini ---
			{
				id: "google/gemini-3.7-flash",
				name: "Gemini 3.7 Flash",
				reasoning: true,
				input: ["text", "image"],
				cost: c(0.75, 3.75, 0.07),
				contextWindow: 1_048_576,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: GEMINI_COMPAT,
			},
			{
				id: "google/gemini-3.6-flash",
				name: "Gemini 3.6 Flash",
				reasoning: true,
				input: ["text", "image"],
				cost: c(1.5, 7.5, 0.15),
				contextWindow: 1_000_000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: GEMINI_COMPAT,
			},
			{
				id: "google/gemini-3.5-flash",
				name: "Gemini 3.5 Flash",
				reasoning: true,
				input: ["text", "image"],
				cost: c(1.5, 9, 0.15),
				contextWindow: 1_000_000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: GEMINI_COMPAT,
			},
			{
				id: "google/gemini-3.5-flash-lite",
				name: "Gemini 3.5 Flash Lite",
				reasoning: true,
				input: ["text", "image"],
				cost: c(0.3, 2.5, 0.03),
				contextWindow: 1_000_000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: GEMINI_COMPAT,
			},
			{
				id: "google/gemini-3.1-flash-lite",
				name: "Gemini 3.1 Flash Lite",
				reasoning: true,
				input: ["text", "image"],
				cost: c(0.25, 1.5, 0.03),
				contextWindow: 1_000_000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: GEMINI_COMPAT,
			},
			// --- OpenAI GPT ---
			{
				id: "gpt-5.6-sol",
				name: "GPT-5.6 Sol",
				reasoning: true,
				input: ["text"],
				cost: c(5, 30, 0.5),
				contextWindow: 1_050_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			{
				id: "gpt-5.6-terra",
				name: "GPT-5.6 Terra",
				reasoning: true,
				input: ["text", "image"],
				cost: c(2, 12, 0.2),
				contextWindow: 1_050_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			{
				id: "gpt-5.6-luna",
				name: "GPT-5.6 Luna",
				reasoning: true,
				input: ["text", "image"],
				cost: c(0.2, 1.2, 0.02, 0.25),
				contextWindow: 1_050_000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			{
				id: "gpt-5.5",
				name: "GPT-5.5",
				reasoning: true,
				input: ["text", "image"],
				cost: c(5, 30, 0.5),
				contextWindow: 200000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			{
				id: "gpt-5.4",
				name: "GPT-5.4",
				reasoning: true,
				input: ["text", "image"],
				cost: c(2.5, 15, 0.25),
				contextWindow: 400000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			{
				id: "gpt-5.4-mini",
				name: "GPT-5.4 Mini",
				reasoning: true,
				input: ["text", "image"],
				cost: c(0.75, 4.5, 0.07),
				contextWindow: 400000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			{
				id: "gpt-5.3-codex",
				name: "GPT-5.3 Codex",
				reasoning: true,
				input: ["text"],
				cost: c(2, 8, 0.5),
				contextWindow: 400000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			// --- Meta Muse Spark ---
			{
				id: "meta/muse-spark-1.2",
				name: "Muse Spark 1.2",
				reasoning: true,
				input: ["text", "image"],
				cost: c(1.25, 4.25, 0.15),
				contextWindow: 1_048_576,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			{
				id: "meta/muse-spark-1.2-contributor",
				name: "Muse Spark 1.2 Contributor",
				reasoning: true,
				input: ["text", "image"],
				cost: c(0.1, 0.2, 0.002),
				contextWindow: 1_048_576,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			{
				id: "meta/muse-spark-1.1",
				name: "Muse Spark 1.1",
				reasoning: true,
				input: ["text", "image"],
				cost: c(1.25, 4.25, 0.15),
				contextWindow: 1_048_576,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			// --- MiniMax ---
			{
				id: "MiniMaxAI/MiniMax-M3",
				name: "MiniMax M3",
				reasoning: true,
				input: ["text", "image"],
				cost: c(0.3, 1.2, 0.06),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			{
				id: "MiniMaxAI/MiniMax-M2.7",
				name: "MiniMax M2.7",
				reasoning: true,
				input: ["text", "image"],
				cost: c(0.3, 1.2, 0.06),
				contextWindow: 200000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			{
				id: "MiniMaxAI/MiniMax-M2.5",
				name: "MiniMax M2.5",
				reasoning: true,
				input: ["text", "image"],
				cost: c(0.3, 1.2, 0.03),
				contextWindow: 200000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			// --- Moonshot Kimi ---
			{
				id: "moonshotai/Kimi-K3",
				name: "Kimi K3",
				reasoning: true,
				input: ["text", "image"],
				cost: c(3, 15, 0.3),
				contextWindow: 1_000_000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			{
				id: "moonshotai/Kimi-K2.7-Code",
				name: "Kimi K2.7 Code",
				reasoning: true,
				input: ["text", "image"],
				cost: c(0.19, 0.95, 0.04),
				contextWindow: 256000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			{
				id: "moonshotai/Kimi-K2.7-Code-Highspeed",
				name: "Kimi K2.7 Code HighSpeed",
				reasoning: true,
				input: ["text"],
				cost: c(1.9, 8, 0.38),
				contextWindow: 262000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			{
				id: "moonshotai/Kimi-K2.6",
				name: "Kimi K2.6",
				reasoning: true,
				input: ["text", "image"],
				cost: c(0.95, 1.71, 0.397),
				contextWindow: 256000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			{
				id: "moonshotai/Kimi-K2.5",
				name: "Kimi K2.5",
				reasoning: true,
				input: ["text", "image"],
				cost: c(0.6, 3, 0.1),
				contextWindow: 256000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			// --- NVIDIA ---
			{
				id: "nvidia/nemotron-3-ultra-550b-a55b",
				name: "Nemotron 3 Ultra",
				reasoning: true,
				input: ["text"],
				cost: c(0.6, 2.4, 0.12),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			// --- Poolside ---
			{
				id: "poolside/laguna-s-2.1-free",
				name: "Laguna S 2.1",
				reasoning: true,
				input: ["text"],
				cost: c(0, 0, 0),
				contextWindow: 256000,
				maxTokens: 65536,
				compat: COMPAT,
			},
			// --- Sakana AI ---
			{
				id: "sakana/fugu-ultra",
				name: "Fugu Ultra",
				reasoning: true,
				input: ["text"],
				cost: c(5, 30, 0.5),
				contextWindow: 1_000_000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			// --- StepFun ---
			{
				id: "stepfun/Step-3.7-Flash",
				name: "Step 3.7 Flash",
				reasoning: true,
				input: ["text", "image"],
				cost: c(0.2, 1.15, 0.04),
				contextWindow: 256000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			{
				id: "stepfun/Step-3.5-Flash",
				name: "Step 3.5 Flash",
				reasoning: true,
				input: ["text"],
				cost: c(0.1, 0.3, 0.02),
				contextWindow: 1_000_000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
		// --- Tencent ---
			{
				id: "tencent/hy3-paid",
				name: "Tencent Hy3",
				reasoning: true,
				input: ["text"],
				cost: c(0.14, 0.58, 0.04),
				contextWindow: 262144,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			{
				id: "tencent/hy4-preview",
				name: "Tencent Hy4 Preview",
				reasoning: true,
				input: ["text"],
				cost: c(0.834, 2.501, 0.042),
				contextWindow: 1_048_576,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			// --- Thinking Machines ---
			{
				id: "thinkingmachines/inkling",
				name: "Inkling",
				reasoning: true,
				input: ["text", "image"],
				cost: c(1, 4.05, 0.17),
				contextWindow: 256000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			{
				id: "thinkingmachines/inkling-small",
				name: "Inkling Small",
				reasoning: true,
				input: ["text", "image"],
				cost: c(0.5, 1.2, 0.1),
				contextWindow: 1_000_000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			// --- xAI ---
			{
				id: "xai/grok-4.6",
				name: "Grok 4.6",
				reasoning: true,
				input: ["text"],
				cost: c(2, 6, 0.5),
				contextWindow: 500000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			{
				id: "xai/grok-4.5",
				name: "Grok 4.5",
				reasoning: true,
				input: ["text", "image"],
				cost: c(2, 6, 0.5),
				contextWindow: 500000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			// --- Xiaomi MiMo ---
			{
				id: "xiaomi/mimo-v2.5-pro",
				name: "MiMo V2.5 Pro",
				reasoning: true,
				input: ["text"],
				cost: c(0.435, 0.87, 0.0036),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: REASONING_COMPAT,
			},
			{
				id: "xiaomi/mimo-v2.5",
				name: "MiMo V2.5",
				reasoning: false,
				input: ["text", "image"],
				cost: c(0.14, 0.28, 0.0028),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				compat: COMPAT,
			},
			// --- Zhipu GLM ---
			{
				id: "zai-org/GLM-5.3",
				name: "GLM 5.3",
				reasoning: true,
				input: ["text"],
				cost: c(1.4, 4.4, 0.26),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: ZAI_COMPAT,
			},
			{
				id: "z-ai/glm-5.3-flash",
				name: "GLM 5.3 Flash",
				reasoning: true,
				input: [
					"text"
				],
				cost: c(0.15, 0.50, 0.03),
				contextWindow: 1_050_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: ZAI_COMPAT,
			},
			{
				id: "zai-org/GLM-5.2",
				name: "GLM 5.2",
				reasoning: true,
				input: ["text"],
				cost: c(1.4, 4.4, 0.26),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: ZAI_COMPAT,
			},
			{
				id: "zai-org/GLM-5.2-Fast",
				name: "GLM 5.2 Fast",
				reasoning: false,
				input: ["text"],
				cost: c(3, 10.25, 0.5),
				contextWindow: 1_000_000,
				maxTokens: 65536,
				compat: COMPAT,
			},
			{
				id: "zai-org/GLM-5.1",
				name: "GLM 5.1",
				reasoning: false,
				input: ["text"],
				cost: c(1.4, 4.4, 0.26),
				contextWindow: 200000,
				maxTokens: 65536,
				compat: COMPAT,
			},
			{
				id: "zai-org/GLM-5",
				name: "GLM 5",
				reasoning: false,
				input: ["text"],
				cost: c(1, 3.2, 0.2),
				contextWindow: 200000,
				maxTokens: 65536,
				compat: COMPAT,
			},
			// --- Alibaba Qwen ---
			{
				id: "Qwen/Qwen3.8-Max",
				name: "Qwen 3.8 Max",
				reasoning: true,
				input: ["text"],
				cost: c(2, 6, 0.25),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: QWEN_COMPAT,
			},
			{
				id: "Qwen/Qwen3.8-27B",
				name: "Qwen 3.8 27B",
				reasoning: true,
				input: ["text", "image"],
				cost: c(0.4, 3, 0.04),
				contextWindow: 262_144,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: QWEN_COMPAT,
			},
			{
				id: "Qwen/Qwen3.8-Flash",
				name: "Qwen 3.8 Flash",
				reasoning: true,
				input: [
					"text",
					"image"
				],
				cost: c(0.16, 0.47, 0.02),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: QWEN_COMPAT,
			},
			{
				id: "Qwen/Qwen3.7-Max",
				name: "Qwen 3.7 Max",
				reasoning: true,
				input: ["text"],
				cost: c(2.5, 7.5, 0.5, 3.13),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: QWEN_COMPAT,
			},
			{
				id: "Qwen/Qwen3.7-Plus",
				name: "Qwen 3.7 Plus",
				reasoning: true,
				input: ["text", "image"],
				cost: c(0.4, 1.6, 0.08, 0.7),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: QWEN_COMPAT,
			},
			{
				id: "Qwen/Qwen3.7-Flash",
				name: "Qwen 3.7 Flash",
				reasoning: true,
				input: ["text", "image"],
				cost: c(0.03, 0.13, 0.006, 0.038),
				contextWindow: 1_000_000,
				maxTokens: 131072,
				thinkingLevelMap: THINKING,
				compat: QWEN_COMPAT,
			},
			{
				id: "Qwen/Qwen3.6-Plus",
				name: "Qwen 3.6 Plus",
				reasoning: true,
				input: ["text", "image"],
				cost: c(0.5, 3, 0.1),
				contextWindow: 200000,
				maxTokens: 32768,
				thinkingLevelMap: THINKING,
				compat: QWEN_COMPAT,
			},
			{
				id: "Qwen/Qwen3.6-Max-Preview",
				name: "Qwen 3.6 Max Preview",
				reasoning: true,
				input: ["text"],
				cost: c(1.3, 7.8, 0.26),
				contextWindow: 200000,
				maxTokens: 65536,
				thinkingLevelMap: THINKING,
				compat: QWEN_COMPAT,
			},
		],
	});

	// Recompute DeepSeek cost with the rate band for the current UTC hour.
	// Runs at message end so peak/off-peak switches mid-session stay accurate.
	pi.on("message_end", (event) => {
		const message = event.message;
		if (message.role !== "assistant") return;
		if (message.provider !== "command-code") return;
		const rates = DEEPSEEK_PRICING[message.model];
		if (!rates) return;
		const usage = message.usage;
		if (!usage || usage.totalTokens === 0) return;
		return {
			message: {
				...message,
				usage: {
					...usage,
					cost: costFor(deepseekRates(message.model), usage),
				},
			},
		};
	});
}