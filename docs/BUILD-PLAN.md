# Build plan: provider re-verification (2026-10-30)

Temporary orchestration state. Deleted before the PR is opened.

- Integration branch `data/reverify-2026-10` (worktree `ic-reverify`) from `origin/main`. One branch per batch, `reverify/<batch>`, merged `--no-ff` after research and verification.
- Briefs, batch list, tier helper and reports live outside the repo in `/tmp/ic-reverify/`.
- Each batch: researcher (Opus 5.5 high) → fresh verifier (Opus 5.5 high) in the same worktree → fast gate → merge → full gate.
- Pilot `p0` first; the orchestrator reviews it, then the remaining batches run four at a time.

| Batch | Providers                                                                                                       | Status |
| ----- | --------------------------------------------------------------------------------------------------------------- | ------ |
| p0    | mistral alibaba openai berget-ai scaleway deepseek                                                              | queued |
| b1    | amazon-bedrock azure azure-cognitive-services vertex vertex-anthropic google sap-ai-core cloudflare-workers-ai  | queued |
| b2    | aleph-alpha cloudferro-sherlock cortecs evroc ovhcloud-ai-endpoints stackit privatemode-ai nebius-token-factory | queued |
| b3    | anthropic cohere xai perplexity perplexity-agent inception upstage morph                                        | queued |
| b4    | moonshot-ai minimax-minimax-io z-ai xiaomi stepfun siliconflow bailing novitaai                                 | queued |
| b5    | together-ai fireworks-ai groq cerebras deep-infra baseten friendli nvidia                                       | queued |
| b6    | hugging-face llama chutes inference io-net venice-ai vultr weights-biases                                       | queued |
| b7    | openrouter cloudflare-ai-gateway vercel-ai-gateway helicone requesty kilo-gateway llm-gateway zenmux            | queued |
| b8    | abacus aihubmix clarifai dinference firmware github-models lucidquery-ai meganova                               | queued |
| b9    | mixlayer nanogpt nova ollama-cloud poe synthetic vivgrid                                                        | queued |
