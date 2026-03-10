import type { GistSummary } from "@/lib/github";
import { fetchUser, fetchUserGists } from "@/lib/github";
import Image from "next/image";
import Link from "next/link";

export const revalidate = 3600;

const USERNAME = "jokull";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function GistCard({ gist }: { gist: GistSummary }) {
  const files = Object.values(gist.files);
  const firstFile = files[0];
  const title = gist.description || firstFile?.filename || "Untitled";

  return (
    <Link href={`/${gist.id}`} className="group block py-4 -mx-1 px-1 rounded-md transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium text-neutral-800 dark:text-neutral-200 group-hover:text-neutral-950 dark:group-hover:text-white transition-colors truncate">
            {title}
          </h2>
          <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-500">
            <span className="font-mono truncate">{files.map((f) => f.filename).join(", ")}</span>
            {files.length > 1 && (
              <span className="shrink-0 text-neutral-400 dark:text-neutral-600">
                {files.length} files
              </span>
            )}
          </div>
        </div>
        <span className="shrink-0 text-xs text-neutral-400 dark:text-neutral-600 tabular-nums">
          {formatDate(gist.updated_at)}
        </span>
      </div>
    </Link>
  );
}

export default async function Home() {
  const [gists, user] = await Promise.all([fetchUserGists(USERNAME, 1, 100), fetchUser(USERNAME)]);

  const displayName = user?.name || USERNAME;

  return (
    <main className="min-h-screen flex items-start justify-center px-5 sm:px-6 lg:px-8 py-12 sm:py-24">
      <div className="max-w-xl w-full">
        {/* Header */}
        <div className="flex items-center gap-3.5 mb-10">
          {user && (
            <Image
              src={user.avatar_url}
              alt={user.login}
              width={36}
              height={36}
              className="rounded-full shrink-0"
            />
          )}
          <div>
            <h1 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              {displayName}
            </h1>
            {user?.bio && (
              <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-0.5">{user.bio}</p>
            )}
          </div>
        </div>

        {/* Gist list */}
        {gists.length > 0 ? (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {gists.map((gist) => (
              <GistCard key={gist.id} gist={gist} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No public gists yet.</p>
        )}
      </div>
    </main>
  );
}
