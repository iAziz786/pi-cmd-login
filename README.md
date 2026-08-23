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

- DeepSeek V4 Flash / Pro
- Kimi K3, K2.7 Code, K2.7 Code HighSpeed, K2.6, K2.5
- GLM 5.3, 5.2, 5.2 Fast
- MiniMax M3
- Qwen 3.7 Max / Plus / Flash, Qwen 3.6 Plus
- MiMo V2.5 Pro, Inkling
- GPT-5.6 Luna, Grok 4.5 (available on every plan)

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