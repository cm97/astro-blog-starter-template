/**
 * Thin client for free-tier LLM providers. Both expose OpenAI-compatible
 * chat/completions, so one function covers them.
 *
 * Order: Groq first (its terms say inputs are not used for training, and
 * requests aren't retained by default), Gemini second as a fallback. Gemini's
 * free tier DOES train on prompts, so keep what we send it to the same
 * low-sensitivity text the Groq call gets, and never put customer or order
 * data into a prompt.
 *
 * Keys are Cloudflare secrets (`npx wrangler secret put GROQ_API_KEY`), never
 * `vars` in wrangler.json: the repo is public.
 *
 * Last resort, and the only one that needs no key: Cloudflare Workers AI via
 * the `AI` binding in wrangler.json. It runs inside the Buzzyfly Cloudflare
 * account on the free 10,000 Neurons/day allocation and does not train on
 * prompts.
 */

export interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

interface Provider {
	name: string;
	url: string;
	model: string;
	key: string | undefined;
}

/** The slice of the Workers AI binding we use. */
export interface WorkersAiBinding {
	run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

export interface FreeLlmEnv {
	GROQ_API_KEY?: string;
	GEMINI_API_KEY?: string;
	AI?: WorkersAiBinding;
}

// Free-plan Workers AI models, best first.
const WORKERS_AI_MODELS = ["@cf/meta/llama-3.3-70b-instruct-fp8-fast", "@cf/meta/llama-3.1-8b-instruct-fast"];

function hasWorkersAi(env: FreeLlmEnv): boolean {
	return typeof env.AI?.run === "function";
}

async function callWorkersAi(ai: WorkersAiBinding, model: string, messages: ChatMessage[], maxTokens: number): Promise<string> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`workers-ai ${model} timed out`)), TIMEOUT_MS);
	});
	try {
		const out = (await Promise.race([ai.run(model, { messages, max_tokens: maxTokens, temperature: 0.6 }), timeout])) as {
			response?: unknown;
			choices?: { message?: { content?: string } }[];
		};
		const raw = typeof out?.response === "string" ? out.response : out?.choices?.[0]?.message?.content;
		const text = typeof raw === "string" ? raw.trim() : "";
		if (!text) throw new Error(`workers-ai ${model} returned no text`);
		return text;
	} finally {
		clearTimeout(timer);
	}
}

const TIMEOUT_MS = 20_000;

function providers(env: FreeLlmEnv): Provider[] {
	return [
		{
			name: "groq",
			url: "https://api.groq.com/openai/v1/chat/completions",
			model: "llama-3.3-70b-versatile",
			key: env.GROQ_API_KEY,
		},
		{
			name: "gemini",
			url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
			model: "gemini-2.5-flash",
			key: env.GEMINI_API_KEY,
		},
	].filter((p) => Boolean(p.key));
}

export function hasFreeLlm(env: FreeLlmEnv): boolean {
	return providers(env).length > 0 || hasWorkersAi(env);
}

async function callProvider(p: Provider, messages: ChatMessage[], maxTokens: number): Promise<string> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const res = await fetch(p.url, {
			method: "POST",
			headers: { "content-type": "application/json", authorization: `Bearer ${p.key}` },
			body: JSON.stringify({ model: p.model, messages, max_tokens: maxTokens, temperature: 0.6 }),
			signal: controller.signal,
		});
		if (!res.ok) throw new Error(`${p.name} responded ${res.status}`);
		const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
		const text = data.choices?.[0]?.message?.content?.trim();
		if (!text) throw new Error(`${p.name} returned no text`);
		return text;
	} finally {
		clearTimeout(timer);
	}
}

/** Tries each configured provider in order; throws only if all of them fail. */
export async function freeChat(env: FreeLlmEnv, messages: ChatMessage[], maxTokens = 500): Promise<string> {
	const list = providers(env);
	if (list.length === 0 && !hasWorkersAi(env)) throw new Error("No free LLM configured");
	let last: unknown;
	for (const p of list) {
		try {
			return await callProvider(p, messages, maxTokens);
		} catch (error) {
			last = error;
			console.error("Buzzyfly free LLM provider failed", p.name, error instanceof Error ? error.message : error);
		}
	}
	if (env.AI && hasWorkersAi(env)) {
		for (const model of WORKERS_AI_MODELS) {
			try {
				return await callWorkersAi(env.AI, model, messages, maxTokens);
			} catch (error) {
				last = error;
				console.error("Buzzyfly free LLM provider failed", model, error instanceof Error ? error.message : error);
			}
		}
	}
	throw last instanceof Error ? last : new Error("All free LLM providers failed");
}
