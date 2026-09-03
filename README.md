# pi-cmd-login

[pi](https://github.com/earendil-works/pi-mono) extension that adds [Command Code](https://commandcode.ai/) as a model provider through its [OpenAI-compatible chat completions API](https://commandcode.ai/docs/provider).

## Install

```bash
pi install npm:@iaziz786/pi-cmd-login
# or from git:
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
| Claude Fable 5 | `claude-fable-5` |
| Claude Fable 5.1 | `claude-fable-5-1` |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` |
| Claude Opus 4.7 | `claude-opus-4-7` |
| Claude Opus 4.8 | `claude-opus-4-8` |
| Claude Opus 5 | `claude-opus-5` |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` |
| Claude Sonnet 5 | `claude-sonnet-5` |
| DeepSeek V4 Flash (latest) | `deepseek/deepseek-v4-flash` |
| DeepSeek V4 Flash Fast | `deepseek/deepseek-v4-flash-fast` |
| DeepSeek V4 Flash Vision (exp) | `deepseek/deepseek-v4-flash-vision-exp` |
| DeepSeek V4 Pro (latest) | `deepseek/deepseek-v4-pro` |
| Fugu Ultra | `sakana/fugu-ultra` |
| Gemini 3.1 Flash Lite | `google/gemini-3.1-flash-lite` |
| Gemini 3.5 Flash | `google/gemini-3.5-flash` |
| Gemini 3.5 Flash Lite | `google/gemini-3.5-flash-lite` |
| Gemini 3.6 Flash | `google/gemini-3.6-flash` |
| Gemini 3.7 Flash | `google/gemini-3.7-flash` |
| Gemini 3.8 Flash | `google/gemini-3.8-flash` |
| GLM-5 | `zai-org/GLM-5` |
| GLM-5.1 | `zai-org/GLM-5.1` |
| GLM-5.2 | `zai-org/GLM-5.2` |
| GLM-5.2 Fast | `zai-org/GLM-5.2-Fast` |
| GLM-5.3 | `zai-org/GLM-5.3` |
| GLM-5.3 Flash | `z-ai/glm-5.3-flash` |
| GPT-5.3 Codex | `gpt-5.3-codex` |
| GPT-5.4 | `gpt-5.4` |
| GPT-5.4 Mini | `gpt-5.4-mini` |
| GPT-5.5 | `gpt-5.5` |
| GPT-5.6 Luna | `gpt-5.6-luna` |
| GPT-5.6 Sol | `gpt-5.6-sol` |
| GPT-5.6 Terra | `gpt-5.6-terra` |
| Grok 4.5 | `xai/grok-4.5` |
| Grok 4.6 | `xai/grok-4.6` |
| Inkling | `thinkingmachines/inkling` |
| Inkling Small | `thinkingmachines/inkling-small` |
| Kimi K2.5 | `moonshotai/Kimi-K2.5` |
| Kimi K2.6 | `moonshotai/Kimi-K2.6` |
| Kimi K2.7 Code | `moonshotai/Kimi-K2.7-Code` |
| Kimi K2.7 Code HighSpeed | `moonshotai/Kimi-K2.7-Code-Highspeed` |
| Kimi K3 | `moonshotai/Kimi-K3` |
| Laguna S 2.1 | `poolside/laguna-s-2.1-free` |
| LongCat 2.0 | `meituan/LongCat-2.0:free` |
| MiMo V2.5 | `xiaomi/mimo-v2.5` |
| MiMo V2.5 Pro | `xiaomi/mimo-v2.5-pro` |
| MiniMax M2.5 | `MiniMaxAI/MiniMax-M2.5` |
| MiniMax M2.7 | `MiniMaxAI/MiniMax-M2.7` |
| MiniMax M3 | `MiniMaxAI/MiniMax-M3` |
| Muse Spark 1.1 | `meta/muse-spark-1.1` |
| Muse Spark 1.2 | `meta/muse-spark-1.2` |
| Muse Spark 1.2 Contributor | `meta/muse-spark-1.2-contributor` |
| Muse Spark 1.3 | `meta/muse-spark-1.3` |
| Muse Spark 1.3 Contributor | `meta/muse-spark-1.3-contributor` |
| Nemotron 3 Ultra | `nvidia/nemotron-3-ultra-550b-a55b` |
| Qwen 3.6 Max Preview | `Qwen/Qwen3.6-Max-Preview` |
| Qwen 3.6 Plus | `Qwen/Qwen3.6-Plus` |
| Qwen 3.7 Flash | `Qwen/Qwen3.7-Flash` |
| Qwen 3.7 Max | `Qwen/Qwen3.7-Max` |
| Qwen 3.7 Plus | `Qwen/Qwen3.7-Plus` |
| Qwen 3.8 27B | `Qwen/Qwen3.8-27B` |
| Qwen 3.8 Flash | `Qwen/Qwen3.8-Flash` |
| Qwen 3.8 Max | `Qwen/Qwen3.8-Max` |
| Qwen 3.8 Max 0902 | `Qwen/Qwen3.8-Max-0902` |
| Step 3.5 Flash | `stepfun/Step-3.5-Flash` |
| Step 3.7 Flash | `stepfun/Step-3.7-Flash` |
| Tencent Hy3 | `tencent/hy3-paid` |
| Tencent Hy4 Preview | `tencent/hy4-preview` |

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
