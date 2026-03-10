"use client";

import { decrypt, importKey, type EncryptedPayload } from "@/lib/crypto";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface EncryptedFile {
  filename: string;
  encryptedContent: string;
  originalExtension: string;
}

interface EncryptedGistViewerProps {
  files: EncryptedFile[];
}

type Status = "waiting" | "decrypting" | "success" | "error";

const MARKDOWN_EXTENSIONS = new Set(["md", "markdown", "mdx"]);

function isMarkdownExt(ext: string): boolean {
  return MARKDOWN_EXTENSIONS.has(ext.toLowerCase());
}

function DecryptedContent({ content, extension }: { content: string; extension: string }) {
  if (isMarkdownExt(extension)) {
    return (
      <div className="prose prose-neutral dark:prose-invert prose-sm max-w-none">
        <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
      </div>
    );
  }

  return (
    <pre className="text-[13px] leading-relaxed overflow-x-auto rounded-lg bg-neutral-50 dark:bg-neutral-950 p-4 border border-neutral-100 dark:border-neutral-900">
      <code>{content}</code>
    </pre>
  );
}

export function EncryptedGistViewer({ files }: EncryptedGistViewerProps) {
  const [status, setStatus] = useState<Status>("waiting");
  const [decryptedFiles, setDecryptedFiles] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function tryDecrypt() {
      const hash = window.location.hash;
      if (!hash) {
        setStatus("waiting");
        return;
      }

      const params = new URLSearchParams(hash.slice(1));
      const keyParam = params.get("key");
      if (!keyParam) {
        setStatus("waiting");
        return;
      }

      setStatus("decrypting");

      try {
        const key = await importKey(keyParam);
        const results = new Map<string, string>();

        for (const file of files) {
          const payload: EncryptedPayload = JSON.parse(file.encryptedContent);
          if (payload.v !== 1) {
            throw new Error(`Unsupported encryption version: ${payload.v}`);
          }
          const plaintext = await decrypt(payload, key);
          results.set(file.filename, plaintext);
        }

        setDecryptedFiles(results);
        setStatus("success");
      } catch {
        setError("Decryption failed. The key may be wrong or the data may be corrupted.");
        setStatus("error");
      }
    }

    tryDecrypt();

    // Re-decrypt if hash changes (e.g. user pastes a new key)
    function onHashChange() {
      tryDecrypt();
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [files]);

  if (status === "waiting") {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-900 mb-4">
            <svg
              className="w-5 h-5 text-neutral-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            This gist is encrypted. The decryption key should be in the URL fragment.
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-2">
            The key never leaves your browser.
          </p>
        </div>
      </div>
    );
  }

  if (status === "decrypting") {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="h-4 w-4 border-[1.5px] border-neutral-200 border-t-neutral-400 dark:border-neutral-700 dark:border-t-neutral-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 dark:bg-red-950 mb-4">
            <svg
              className="w-5 h-5 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6">
      {files.map((file) => {
        const content = decryptedFiles.get(file.filename);
        if (!content) return null;
        return (
          <div key={file.filename}>
            {files.length > 1 && (
              <p className="text-xs text-neutral-500 mb-2 font-mono">
                {file.filename.replace(/\.encrypted$/, "")}
              </p>
            )}
            <DecryptedContent content={content} extension={file.originalExtension} />
          </div>
        );
      })}
      <p className="text-xs text-neutral-400 dark:text-neutral-600 text-center mt-4">
        Decrypted client-side. The server never sees the key.
      </p>
    </div>
  );
}
