/**
 * Cloudflare Worker entry point.
 *
 * Copies Workers env bindings (vars + secrets) into process.env
 * so that server-side code can access them via process.env.KEY.
 */
import { KVCacheHandler } from "vinext/cloudflare";
import { setCacheHandler } from "vinext/shims/cache";
import handler from "vinext/server/app-router-entry";

interface Env {
	VINEXT_CACHE: KVNamespace;
	[key: string]: unknown;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		setCacheHandler(new KVCacheHandler(env.VINEXT_CACHE));
		for (const [key, value] of Object.entries(env)) {
			if (typeof value === "string") {
				process.env[key] = value;
			}
		}
		return handler.fetch(request);
	},
};
