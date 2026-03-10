import { getFileExtension } from "@/lib/github";
import langBash from "@shikijs/langs/bash";
import langC from "@shikijs/langs/c";
import langCpp from "@shikijs/langs/cpp";
import langCsharp from "@shikijs/langs/csharp";
import langCss from "@shikijs/langs/css";
import langGo from "@shikijs/langs/go";
import langHtml from "@shikijs/langs/html";
import langJava from "@shikijs/langs/java";
import langJson from "@shikijs/langs/json";
import langJsx from "@shikijs/langs/jsx";
import langKotlin from "@shikijs/langs/kotlin";
import langMarkdown from "@shikijs/langs/markdown";
import langObjectiveC from "@shikijs/langs/objective-c";
import langPython from "@shikijs/langs/python";
import langRuby from "@shikijs/langs/ruby";
import langRust from "@shikijs/langs/rust";
import langSql from "@shikijs/langs/sql";
import langSwift from "@shikijs/langs/swift";
import langToml from "@shikijs/langs/toml";
import langTsx from "@shikijs/langs/tsx";
import langTypescript from "@shikijs/langs/typescript";
import langXml from "@shikijs/langs/xml";
import langYaml from "@shikijs/langs/yaml";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

const highlighter = createHighlighterCore({
	themes: [
		import("@shikijs/themes/github-light"),
		import("@shikijs/themes/github-dark"),
	],
	langs: [
		langBash,
		langC,
		langCpp,
		langCsharp,
		langCss,
		langGo,
		langHtml,
		langJava,
		langJson,
		langJsx,
		langKotlin,
		langMarkdown,
		langObjectiveC,
		langPython,
		langRuby,
		langRust,
		langSql,
		langSwift,
		langToml,
		langTsx,
		langTypescript,
		langXml,
		langYaml,
	],
	engine: createJavaScriptRegexEngine(),
});

// Map file extensions to Shiki language identifiers
export function getShikiLang(filename: string, language: string | null): string {
  if (language) {
    const langMap: Record<string, string> = {
      "C#": "csharp",
      "C++": "cpp",
      "Objective-C": "objective-c",
      Shell: "bash",
      Batchfile: "batch",
    };
    return langMap[language] ?? language.toLowerCase();
  }
  const ext = getFileExtension(filename);
  const extMap: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    jsx: "jsx",
    tsx: "tsx",
    py: "python",
    rb: "ruby",
    rs: "rust",
    go: "go",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    yml: "yaml",
    yaml: "yaml",
    md: "markdown",
    json: "json",
    html: "html",
    css: "css",
    sql: "sql",
    toml: "toml",
    xml: "xml",
    kt: "kotlin",
    swift: "swift",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
  };
  return extMap[ext] ?? "text";
}

export { highlighter };

export async function highlightCode(
  code: string,
  lang: string,
): Promise<string> {
  const hl = await highlighter;
  try {
    return hl.codeToHtml(code, {
      lang: lang || "text",
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    });
  } catch {
    // Fallback for unsupported languages
    return hl.codeToHtml(code, {
      lang: "text",
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    });
  }
}
