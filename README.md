# ChatUniverse

Upload your AI conversation history and see your interests visualized as a 3D solar system.

Works with **ChatGPT**, **Claude**, and **Gemini** exports. Or just click "Try with Sample Data" to see it without uploading anything.

---

## What you get

Each planet is something you care about — programming, cooking, music, whatever. Bigger planets mean more questions asked. Moons are sub-topics. Closer to the center means more recently active.

There's a slider at the bottom that controls how detailed the view is. Slide it low and you get broad categories like "Programming". Slide it high and that splits into "React", "Python", "DevOps" as separate planets. This all happens client-side from the cached category tree — no extra API calls.

## How the analysis works

The tricky part was handling people with thousands of conversations. Anthropic's API has a rate limit (30k input tokens/min), so you can't just send everything at once.

So it works in three phases:

1. **Quick preview** — samples 250 questions, classifies them in one API call, renders the solar system in ~5 seconds
2. **Background refinement** — the rest of the questions get processed in chunks of 200, spaced 15 seconds apart to stay under rate limits
3. **Final merge** — all the chunk results get unified into one coherent category tree, and the solar system updates

The whole background pipeline runs in a Cloudflare Durable Object, so it keeps going even if you close the tab.

## Architecture

Frontend is Next.js 15 on **Cloudflare Pages**. API is a separate **Cloudflare Worker** (Hono) that handles file parsing, LLM classification, and progress tracking.

Other Cloudflare stuff used:
- **KV** for caching analysis results (same file = instant results, no API call)
- **Durable Objects** for the progressive analysis pipeline
- **R2** for temporary file storage (auto-deletes after 24 hours)

Built with Next.js 15, React Three Fiber, Zustand, Recharts, Framer Motion, Tailwind CSS.

## Project structure

```
src/                    # Next.js frontend (3D scene, UI panels, charts)
apps/api-worker/        # Cloudflare Worker (analyze, parse, upload routes)
```

## License

MIT
