import YAML from "yaml";

interface FrontmatterResult {
  data: Record<string, unknown>;
  content: string;
}

/**
 * Parse YAML frontmatter from markdown content.
 * Replaces gray-matter which uses eval() (blocked on CF Workers).
 */
export function parseFrontmatter(input: string): FrontmatterResult {
  const trimmed = input.trimStart();
  if (!trimmed.startsWith("---")) {
    return { data: {}, content: input };
  }

  const end = trimmed.indexOf("\n---", 3);
  if (end === -1) {
    return { data: {}, content: input };
  }

  const yamlBlock = trimmed.slice(3, end).trim();
  const content = trimmed.slice(end + 4); // skip past closing ---

  try {
    const data = YAML.parse(yamlBlock);
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return { data, content };
    }
    return { data: {}, content: input };
  } catch {
    return { data: {}, content: input };
  }
}
