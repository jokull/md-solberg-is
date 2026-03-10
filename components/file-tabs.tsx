"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface FileTabsProps {
  filenames: string[];
  activeFile: string;
  gistId: string;
}

export function FileTabs({ filenames, activeFile: initialActiveFile, gistId }: FileTabsProps) {
  const searchParams = useSearchParams();
  const [, forceUpdate] = useState(0);

  // Sync UI when navigating back/forward via browser buttons
  useEffect(() => {
    function handlePopState() {
      forceUpdate((n) => n + 1);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Derive active file from current URL search params
  const fileParam = new URLSearchParams(window.location.search).get("file");
  const activeFile = fileParam && filenames.includes(fileParam) ? fileParam : initialActiveFile;

  const handleTabClick = useCallback(
    (filename: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (filename === filenames[0]) {
        params.delete("file");
      } else {
        params.set("file", filename);
      }
      const query = params.toString();
      window.history.pushState(null, "", `/${gistId}${query ? `?${query}` : ""}`);
      forceUpdate((n) => n + 1);
    },
    [searchParams, filenames, gistId],
  );

  if (filenames.length <= 1) return null;

  return (
    <div className="flex gap-6 overflow-x-auto overflow-y-hidden hide-scrollbar border-b border-neutral-200 dark:border-neutral-800">
      {filenames.map((name) => (
        <button
          key={name}
          onClick={() => handleTabClick(name)}
          className={`py-1.5 text-xs font-mono whitespace-nowrap transition-colors focus:outline-none -mb-px ${
            name === activeFile
              ? "text-neutral-900 dark:text-neutral-100 border-b-2 border-neutral-900 dark:border-neutral-100"
              : "text-neutral-500 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 border-b-2 border-transparent"
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
