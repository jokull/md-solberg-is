import { AuthorFooter } from "@/components/author-footer";
import { CodeRenderer } from "@/components/code-renderer";
import { EncryptedGistViewer } from "@/components/encrypted-gist-viewer";
import { GistClientShell } from "@/components/gist-client-shell";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { CsvViewer } from "@/components/renderers/csv-viewer";
import { IcsViewer } from "@/components/renderers/ics-viewer";
import { JsonViewer } from "@/components/renderers/json-viewer";
import { StructuredFileViewer } from "@/components/renderers/structured-file-viewer";
import { YamlViewer } from "@/components/renderers/yaml-viewer";
import type { GistFile } from "@/lib/github";
import {
  fetchGist,
  fetchUser,
  getEncryptedOriginalExtension,
  isCSV,
  isEncrypted,
  isICS,
  isJSON,
  isMarkdown,
  isPlainText,
  isStructuredData,
  isYAML,
} from "@/lib/github";
import { getShikiLang, highlightCode } from "@/lib/shiki";
import { parseFrontmatter } from "@/lib/frontmatter";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";

export const revalidate = 60;

function ContentLoader() {
  return (
    <div className="flex-1 flex items-start justify-center pt-24">
      <div className="h-4 w-4 border-[1.5px] border-neutral-200 border-t-neutral-400 dark:border-neutral-700 dark:border-t-neutral-500 rounded-full animate-spin" />
    </div>
  );
}

function getUsername(): string {
  return process.env.GIST_USERNAME || "jokull";
}

interface PageProps {
  params: Promise<{ gistId: string }>;
}

const fetchGistCached = cache(async (gistId: string) => fetchGist(gistId));
const fetchUserCached = cache(async (username: string) => fetchUser(username));

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { gistId } = await params;
  const gist = await fetchGistCached(gistId);

  if (!gist) {
    return { title: "Not Found · gists.sh" };
  }

  const files = Object.values(gist.files);
  const firstFile = files[0];
  const title = gist.description || firstFile?.filename || "Gist";

  // Build a content preview for og:description instead of just "filename by author"
  // Strip frontmatter before generating preview
  const contentForPreview =
    firstFile?.content && isMarkdown(firstFile.filename)
      ? parseFrontmatter(firstFile.content).content
      : firstFile?.content;
  const rawPreview = contentForPreview
    ? contentForPreview
        .replace(/^#+\s+/gm, "") // strip markdown headings
        .replace(/[*_`~[\]]/g, "") // strip markdown formatting
        .replace(/\s+/g, " ") // collapse whitespace
        .trim()
    : "";
  const description = rawPreview
    ? rawPreview.length > 200
      ? rawPreview.slice(0, 200).replace(/\s+\S*$/, "") + "..."
      : rawPreview
    : `${firstFile?.filename} by ${getUsername()}`;
  const githubUrl = `https://gist.github.com/${getUsername()}/${gistId}`;

  return {
    title: `${title} · gists.sh`,
    description,
    ...(gist.public && {
      alternates: {
        canonical: githubUrl,
      },
    }),
    ...(!gist.public && {
      robots: { index: false, follow: false },
    }),
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://gists.sh/${gistId}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

// Pre-render a single file's content (server-side)
async function renderFileContent(file: GistFile) {
  const { filename, content, language } = file;

  if (isMarkdown(filename)) {
    return <MarkdownRenderer content={content} />;
  }

  if (isStructuredData(filename)) {
    const rawHtml = await highlightCode(content, getShikiLang(filename, language));

    if (isJSON(filename)) {
      return (
        <StructuredFileViewer rawHtml={rawHtml} rawContent={content}>
          <JsonViewer content={content} />
        </StructuredFileViewer>
      );
    }
    if (isYAML(filename)) {
      return (
        <StructuredFileViewer rawHtml={rawHtml} rawContent={content}>
          <YamlViewer content={content} />
        </StructuredFileViewer>
      );
    }
    if (isCSV(filename)) {
      return (
        <StructuredFileViewer rawHtml={rawHtml} rawContent={content}>
          <CsvViewer content={content} filename={filename} />
        </StructuredFileViewer>
      );
    }
    if (isICS(filename)) {
      return (
        <StructuredFileViewer rawHtml={rawHtml} rawContent={content}>
          <IcsViewer content={content} />
        </StructuredFileViewer>
      );
    }
  }

  if (isPlainText(filename)) {
    return (
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
        {content}
      </div>
    );
  }

  return <CodeRenderer content={content} filename={filename} language={language} />;
}

export default async function GistPage({ params }: PageProps) {
  const { gistId } = await params;
  const [gist, githubUser] = await Promise.all([
    fetchGistCached(gistId),
    fetchUserCached(getUsername()),
  ]);

  if (!gist) {
    notFound();
  }

  const files = Object.values(gist.files);
  const filenames = files.map((f) => f.filename);

  // Encrypted gists: all files are .encrypted, render client-only decryption viewer
  const hasEncryptedFiles = files.some((f) => isEncrypted(f.filename));
  if (hasEncryptedFiles) {
    const encryptedFiles = files
      .filter((f) => isEncrypted(f.filename))
      .map((f) => ({
        filename: f.filename,
        encryptedContent: f.content,
        originalExtension: getEncryptedOriginalExtension(f.filename),
      }));

    return (
      <main className="min-h-screen flex flex-col">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full flex-1 flex flex-col">
          <header className="mb-8">
            <h1 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate">
              {gist.description || filenames[0]}
            </h1>
          </header>
          <EncryptedGistViewer files={encryptedFiles} />
          <footer className="mt-8 pt-8 border-t border-neutral-100 dark:border-neutral-900">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <a
                href={gist.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
              >
                View on GitHub
              </a>
              <a
                href="/"
                className="hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
              >
                gists.sh
              </a>
            </div>
          </footer>
        </div>
      </main>
    );
  }

  // Build serializable file data for the client shell
  const fileData = files.map((f) => ({
    filename: f.filename,
    content: f.content,
    language: f.language,
    isMarkdown: isMarkdown(f.filename),
  }));

  // Pre-render ALL files in parallel so the page doesn't depend on searchParams.
  // This makes the page ISR-cacheable — searchParams are read client-side only.
  const renderedPanels = await Promise.all(
    files.map(async (file) => (
      <Suspense key={file.filename} fallback={<ContentLoader />}>
        {await renderFileContent(file)}
      </Suspense>
    )),
  );

  return (
    <Suspense fallback={<ContentLoader />}>
      <GistClientShell
        filenames={filenames}
        fileData={fileData}
        gistDescription={gist.description}
        gistPublic={gist.public}
        gistHtmlUrl={gist.html_url}
        gistOwner={!!gist.owner}
        gistId={gistId}
        authorFooter={gist.owner ? <AuthorFooter user={githubUser} /> : null}
      >
        {renderedPanels}
      </GistClientShell>
    </Suspense>
  );
}
