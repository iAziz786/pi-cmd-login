# pi-cmd-login

[pi](https://github.com/earendil-works/pi-mono) extension that adds [Command Code](https://commandcode.ai/) as a model provider through its [OpenAI-compatible chat completions API](https://commandcode.ai/docs/provider).

## Install

```bash
pi install git:github.com/iAziz786/pi-cmd-login
```

Then authenticate (prompts for your key, stores it in `~/.pi/agent/auth.json`):

```
/login command-code
```

## Models

Static roster of Command Code models (canonical ids from `GET /provider/v1/models`):

| Model | ID |
|---|---|
| DeepSeek V4 Flash | `deepseek/deepseek-v4-flash` |
| DeepSeek V4 Pro | `deepseek/deepseek-v4-pro` |
| Claude Fable 5 | `claude-fable-5` |
| Claude Opus 5 | `claude-opus-5` |
| Claude Opus 4.8 | `claude-opus-4-8` |
| Claude Opus 4.7 | `claude-opus-4-7` |
| Claude Sonnet 5 | `claude-sonnet-5` |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` |
| Gemini 3.7 Flash | `google/gemini-3.7-flash` |
| Gemini 3.6 Flash | `google/gemini-3.6-flash` |
| Gemini 3.5 Flash | `google/gemini-3.5-flash` |
| Gemini 3.5 Flash Lite | `google/gemini-3.5-flash-lite` |
| Gemini 3.1 Flash Lite | `google/gemini-3.1-flash-lite` |
| GPT-5.6 Sol | `gpt-5.6-sol` |
| GPT-5.6 Terra | `gpt-5.6-terra` |
| GPT-5.6 Luna | `gpt-5.6-luna` |
| GPT-5.5 | `gpt-5.5` |
| GPT-5.4 | `gpt-5.4` |
| GPT-5.4 Mini | `gpt-5.4-mini` |
| GPT-5.3 Codex | `gpt-5.3-codex` |
| Muse Spark 1.2 | `meta/muse-spark-1.2` |
| Muse Spark 1.2 Contributor | `meta/muse-spark-1.2-contributor` |
| Muse Spark 1.1 | `meta/muse-spark-1.1` |
| MiniMax M3 | `MiniMaxAI/MiniMax-M3` |
| MiniMax M2.7 | `MiniMaxAI/MiniMax-M2.7` |
| MiniMax M2.5 | `MiniMaxAI/MiniMax-M2.5` |
| Kimi K3 | `moonshotai/Kimi-K3` |
| Kimi K2.7 Code | `moonshotai/Kimi-K2.7-Code` |
| Kimi K2.7 Code HighSpeed | `moonshotai/Kimi-K2.7-Code-Highspeed` |
| Kimi K2.6 | `moonshotai/Kimi-K2.6` |
| Kimi K2.5 | `moonshotai/Kimi-K2.5` |
| Nemotron 3 Ultra | `nvidia/nemotron-3-ultra-550b-a55b` |
| Laguna S 2.1 | `poolside/laguna-s-2.1-free` |
| Fugu Ultra | `sakana/fugu-ultra` |
| Step 3.7 Flash | `stepfun/Step-3.7-Flash` |
| Step 3.5 Flash | `stepfun/Step-3.5-Flash` |
| Ox Alpha | `stealth/ox-alpha` |
| Tencent Hy3 | `tencent/hy3-paid` |
| Inkling | `thinkingmachines/inkling` |
| Inkling Small | `thinkingmachines/inkling-small` |
| Grok 4.6 | `xai/grok-4.6` |
| Grok 4.5 | `xai/grok-4.5` |
| MiMo V2.5 Pro | `xiaomi/mimo-v2.5-pro` |
| MiMo V2.5 | `xiaomi/mimo-v2.5` |
| GLM 5.3 | `zai-org/GLM-5.3` |
| GLM 5.2 | `zai-org/GLM-5.2` |
| GLM 5.2 Fast | `zai-org/GLM-5.2-Fast` |
| GLM 5.1 | `zai-org/GLM-5.1` |
| GLM 5 | `zai-org/GLM-5` |
| Qwen 3.8 Max | `Qwen/Qwen3.8-Max` |
| Qwen 3.8 27B | `Qwen/Qwen3.8-27B` |
| Qwen 3.7 Max | `Qwen/Qwen3.7-Max` |
| Qwen 3.7 Plus | `Qwen/Qwen3.7-Plus` |
| Qwen 3.7 Flash | `Qwen/Qwen3.7-Flash` |
| Qwen 3.6 Plus | `Qwen/Qwen3.6-Plus` |
| Qwen 3.6 Max Preview | `Qwen/Qwen3.6-Max-Preview` |

Per-1M-token USD costs are baked in from https://commandcode.ai/models.

## DeepSeek time-of-day pricing

DeepSeek V4 Flash/Pro bill at different rates depending on UTC hour:

| Band | Hours (UTC) | Flash $/M in/out/cache | Pro $/M in/out/cache |
|---|---|---|---|
| Off-peak | 17h/day | 0.22 / 0.66 / 0.007 | 0.66 / 1.98 / 0.02 |
| Peak | 7h/day · 01–04 & 06–10 | 0.44 / 1.32 / 0.01 | 1.32 / 3.96 / 0.04 |

Since 2026-08-23 00:00 Beijing time, weekends (Sat/Sun, Beijing time) are charged at the off-peak rate all day; weekdays keep the peak/off-peak bands above. Calls before that date are settled under the old rules.

pi models carry a flat `cost`, so the extension recomputes DeepSeek cost in a `message_end` hook using the rate band for the current UTC hour. Logic lives in `pricing.ts` (unit-tested).

## Test

```bash
bun test
```
