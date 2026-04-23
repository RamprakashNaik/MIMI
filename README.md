# MIMI - Personalized local-first AI Interface

MIMI is a highly optimized, local-first Next.js web interface designed to provide a premium, modern chat experience with advanced AI models. It acts as an aggregator allowing users to concurrently talk to LLMs running locally (e.g. Ollama) and cloud-based models (e.g. OpenRouter) all from one sleek, unified dashboard.

## System Architecture Highlights

* **Multi-Provider Aggregation:** Seamlessly configure any Open-AI compatible API endpoint in your settings. MIMI utilizes parallel asynchronous fetching (`Promise.allSettled`) to pool available models from every single registered provider simultaneously.
* **Server-Side Proxy Bypassing:** Solves strict browser CORS limitations. The Next.js API Routes act as a secure proxy (`/api/proxy`) forwarding your requests dynamically to local nodes like `ollama` or cloud architectures. 
* **Hyper-Contextual Memory Engine:** Chats individually memorize their specific model configurations. Starting a chat with `gpt-4o` on OpenRouter and switching back to an older `llama3` local chat will automatically snap your model selectors to match what was historically used.
* **Intelligent Auto-Titling:** MIMI runs an asynchronous sub-agent that detects brand new conversation threads. It silently reads your first prompt and dynamically updates the chat title in the sidebar with a precise, 3-word summary of the chat's agenda without interrupting the main text stream.
* **Premium Markdown & Math rendering:** The frontend integrates `react-markdown` alongside `rehype-katex` and `remark-math`. Complex LaTeX arithmetic code automatically resolves into textbook-grade visualizations. Standalone programming code utilizes dedicated dark-mode containers topped with convenient `Copy` tooling. 

## Tech Stack
* **Framework:** Next.js (App Router)
* **Design:** Bespoke Vanilla CSS with modern Glassmorpishm aesthetics. 
* **Routing Strategy:** Single Page Application (SPA), server-forwarding on network boundaries.

## How to Quick Start

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Configure Providers:
MIMI starts entirely blank. Navigate to the bottom left **Settings** menu and add providers using any compatible `baseURL` mimicking the OpenAI spec format (ex: `http://localhost:11434/v1` for Ollama or `https://openrouter.ai/api/v1` for OpenRouter payloads).
