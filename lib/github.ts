export interface GistFileSummary {
  filename: string;
  type: string;
  language: string | null;
  raw_url: string;
  size: number;
}

export interface GistFile extends GistFileSummary {
  content: string;
}

export interface GistOwner {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GistSummary {
  id: string;
  description: string | null;
  public: boolean;
  files: Record<string, GistFileSummary>;
  owner: GistOwner | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface Gist {
  id: string;
  description: string | null;
  public: boolean;
  files: Record<string, GistFile>;
  owner: GistOwner | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
  name: string | null;
  bio: string | null;
  blog: string | null;
  twitter_username: string | null;
  location: string | null;
}

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "gists-sh",
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

// KV-backed GitHub API cache with ETag support.
// On cache hit, sends If-None-Match to GitHub. A 304 means the cached
// data is still fresh (and doesn't count against rate limits).
//
// Uses cloudflare:workers to access KV bindings directly in server
// components — no need to pass bindings through the worker entry.

// Cache GitHub API responses using the Cloudflare Cache API with ETags.
// On cache hit, sends If-None-Match; a 304 means data is fresh (free).
// Falls back to direct fetch when Cache API isn't available (dev).

async function cachedFetch<T>(
  url: string,
): Promise<T | null> {
  const headers = getGitHubHeaders();

  // Try CF Cache API for stored response
  let cache: Cache | null = null;
  let cachedResponse: Response | undefined;
  try {
    cache = caches.default;
    cachedResponse = await cache.match(url);
  } catch {
    // Cache API not available (dev mode)
  }

  // Extract ETag from cached response for conditional request
  if (cachedResponse) {
    const etag = cachedResponse.headers.get("x-gh-etag");
    if (etag) {
      headers["If-None-Match"] = etag;
    }
  }

  const res = await fetch(url, { headers, cache: "no-store" });

  // 304 Not Modified: cached data is still fresh
  if (res.status === 304 && cachedResponse) {
    return cachedResponse.json() as Promise<T>;
  }

  if (res.status === 404) return null;

  if (res.status === 403) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (remaining === "0") {
      if (cachedResponse) return cachedResponse.json() as Promise<T>;
      throw new Error(
        "GitHub API rate limit exceeded. Please try again later.",
      );
    }
  }

  if (!res.ok) {
    if (cachedResponse) return cachedResponse.json() as Promise<T>;
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const data = await res.json();

  // Store in CF Cache with the GitHub ETag for future conditional requests
  if (cache) {
    const etag = res.headers.get("etag");
    const cacheHeaders = new Headers({
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400",
    });
    if (etag) cacheHeaders.set("x-gh-etag", etag);

    const cacheResponse = new Response(JSON.stringify(data), {
      headers: cacheHeaders,
    });
    try {
      cache.put(url, cacheResponse);
    } catch {
      // Cache put failure is non-fatal
    }
  }

  return data as T;
}

export async function fetchUser(username: string): Promise<GitHubUser | null> {
  if (!isValidUsername(username)) return null;

  try {
    return await cachedFetch<GitHubUser>(
      `https://api.github.com/users/${username}`,
    );
  } catch {
    return null;
  }
}

const GIST_ID_RE = /^[a-f0-9]+$/;
const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;

export function isValidGistId(id: string): boolean {
  return GIST_ID_RE.test(id) && id.length >= 1 && id.length <= 32;
}

export function isValidUsername(username: string): boolean {
  return (
    username.length >= 1 && username.length <= 39 && USERNAME_RE.test(username)
  );
}

export async function fetchGist(gistId: string): Promise<Gist | null> {
  if (!isValidGistId(gistId)) return null;

  return cachedFetch<Gist>(
    `https://api.github.com/gists/${gistId}`,
  );
}

export async function fetchUserGists(
  username: string,
  page = 1,
  perPage = 30,
): Promise<GistSummary[]> {
  if (!isValidUsername(username)) return [];

  try {
    const gists = await cachedFetch<GistSummary[]>(
      `https://api.github.com/users/${username}/gists?per_page=${perPage}&page=${page}`,
    );
    if (!gists) return [];
    return gists.filter((g) => g.public);
  } catch {
    return [];
  }
}

const MARKDOWN_EXTENSIONS = new Set(["md", "markdown", "mdx"]);
const PLAIN_TEXT_EXTENSIONS = new Set(["txt", "text"]);
const JSON_EXTENSIONS = new Set(["json", "geojson"]);
const CSV_EXTENSIONS = new Set(["csv", "tsv"]);
const YAML_EXTENSIONS = new Set(["yaml", "yml"]);
const ICS_EXTENSIONS = new Set(["ics", "ical"]);

export function isMarkdown(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MARKDOWN_EXTENSIONS.has(ext);
}

export function isPlainText(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return PLAIN_TEXT_EXTENSIONS.has(ext);
}

export function isJSON(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return JSON_EXTENSIONS.has(ext);
}

export function isCSV(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return CSV_EXTENSIONS.has(ext);
}

export function isTSV(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ext === "tsv";
}

export function isYAML(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return YAML_EXTENSIONS.has(ext);
}

export function isICS(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ICS_EXTENSIONS.has(ext);
}

export function isStructuredData(filename: string): boolean {
  return isJSON(filename) || isCSV(filename) || isYAML(filename) || isICS(filename);
}

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "txt";
}

export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename);
  const map: Record<string, string> = {
    md: "text/markdown",
    markdown: "text/markdown",
    json: "application/json",
    js: "application/javascript",
    ts: "application/typescript",
    html: "text/html",
    css: "text/css",
    xml: "application/xml",
    yaml: "text/yaml",
    yml: "text/yaml",
    toml: "text/plain",
    py: "text/x-python",
    rb: "text/x-ruby",
    go: "text/x-go",
    rs: "text/x-rust",
    sh: "text/x-shellscript",
    txt: "text/plain",
  };
  return map[ext] ?? "text/plain";
}
