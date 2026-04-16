import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import DatabaseConstructor from "better-sqlite3";
import { fail } from "../lib/errors.js";
import { rankFuzzy } from "../lib/fuzzy.js";
import { readOpencode } from "./opencode.js";

export type SessionDatabase = InstanceType<typeof DatabaseConstructor>;

export interface RootSession {
  sessionId: string;
  updated: string;
  title: string;
  directory: string;
}

export interface SessionDetails {
  sessionId: string;
  title: string;
  directory: string;
  projectName: string;
  worktree: string;
  parentId: string;
  shareUrl: string;
  created: string;
  updated: string;
  archived: string;
}

export interface SessionCounts {
  messages: number;
  parts: number;
  todos: number;
}

export interface RecentTextPart {
  created: string;
  role: string;
  text: string;
}

export interface SessionActivity {
  sessionId: string;
  activityMs: number;
}

export type SessionResolution =
  | { kind: "resolved"; sessionId: string }
  | { kind: "ambiguous"; matches: RootSession[] }
  | { kind: "not_found"; suggestions: RootSession[] };

function getDbPath(): string {
  const localPath = getDefaultDbPath();

  if (localPath) {
    return localPath;
  }

  try {
    return readOpencode(["db", "path"]);
  } catch (error) {
    fail(`Failed to resolve OpenCode database path: ${(error as Error).message}`);
  }
}

function getDefaultDbPath(): string | undefined {
  const home = homedir();
  const xdgDataHome = process.env.XDG_DATA_HOME;
  const localAppData = process.env.LOCALAPPDATA;
  const appData = process.env.APPDATA;
  const candidates = [
    xdgDataHome ? path.join(xdgDataHome, "opencode", "opencode.db") : undefined,
    home ? path.join(home, ".local", "share", "opencode", "opencode.db") : undefined,
    home ? path.join(home, "Library", "Application Support", "opencode", "opencode.db") : undefined,
    localAppData ? path.join(localAppData, "opencode", "opencode.db") : undefined,
    appData ? path.join(appData, "opencode", "opencode.db") : undefined,
  ];

  return candidates.find((candidate) => candidate !== undefined && existsSync(candidate));
}

export function openSessionStore(): SessionDatabase {
  try {
    return new DatabaseConstructor(getDbPath(), { readonly: true, fileMustExist: true });
  } catch (error) {
    fail(`Failed to open SQLite database: ${(error as Error).message}`);
  }
}

export function openSessionStoreWritable(): SessionDatabase {
  try {
    return new DatabaseConstructor(getDbPath(), { readonly: false, fileMustExist: true });
  } catch (error) {
    fail(`Failed to open SQLite database: ${(error as Error).message}`);
  }
}

function listSessionsByWhereClause(
  db: SessionDatabase,
  whereClause: string,
  ...params: string[]
): RootSession[] {
  return db
    .prepare(
      `
    select
      s.id as sessionId,
      datetime(s.time_updated / 1000, 'unixepoch', 'localtime') as updated,
      replace(replace(s.title, char(10), ' '), char(13), ' ') as title,
      coalesce(nullif(s.directory, ''), p.worktree, '') as directory
    from session s
    left join project p on p.id = s.project_id
    where ${whereClause}
    order by s.time_updated desc
  `,
    )
    .all(...params) as RootSession[];
}

export function resolveSession(
  db: SessionDatabase,
  input: string,
  options: { allowTitle?: boolean } = {},
): SessionResolution {
  const { allowTitle = false } = options;
  const exactMatches = listSessionsByWhereClause(db, "s.id = ?", input);

  if (exactMatches.length === 1) {
    return { kind: "resolved", sessionId: exactMatches[0].sessionId };
  }

  if (allowTitle) {
    const titleMatches = listSessionsByWhereClause(db, "s.title = ?", input);

    if (titleMatches.length === 1) {
      return { kind: "resolved", sessionId: titleMatches[0].sessionId };
    }

    if (titleMatches.length > 1) {
      return { kind: "ambiguous", matches: titleMatches };
    }

    const titlePrefixMatches = listSessionsByWhereClause(
      db,
      "substr(s.title, 1, length(?)) = ?",
      input,
      input,
    );

    if (titlePrefixMatches.length === 1) {
      return { kind: "resolved", sessionId: titlePrefixMatches[0].sessionId };
    }

    if (titlePrefixMatches.length > 1) {
      return { kind: "ambiguous", matches: titlePrefixMatches };
    }
  }

  const prefixMatches = listSessionsByWhereClause(
    db,
    "substr(s.id, 1, length(?)) = ?",
    input,
    input,
  );

  if (prefixMatches.length === 0) {
    return { kind: "not_found", suggestions: findSessionMatches(db, input) };
  }

  if (prefixMatches.length > 1) {
    return { kind: "ambiguous", matches: prefixMatches };
  }

  return { kind: "resolved", sessionId: prefixMatches[0].sessionId };
}

export function resolveSessionId(
  db: SessionDatabase,
  input: string,
  options: { allowTitle?: boolean } = {},
): string {
  const resolution = resolveSession(db, input, options);

  if (resolution.kind === "resolved") {
    return resolution.sessionId;
  }

  if (resolution.kind === "ambiguous") {
    fail(
      `! Session is ambiguous: ${input}\n\n` +
        resolution.matches.map((row) => `${row.sessionId}\t${row.title}`).join("\n"),
    );
  }

  if (resolution.suggestions.length > 0) {
    fail(
      `! Session not found: ${input}\n\n` +
        `Closest matches:\n${resolution.suggestions.map((row) => `${row.sessionId}\t${row.title}`).join("\n")}`,
    );
  }

  fail(`! Session not found: ${input}`);
}

function listSearchableSessions(db: SessionDatabase): RootSession[] {
  return db
    .prepare(
      `
    select
      s.id as sessionId,
      datetime(s.time_updated / 1000, 'unixepoch', 'localtime') as updated,
      replace(replace(s.title, char(10), ' '), char(13), ' ') as title,
      coalesce(nullif(s.directory, ''), p.worktree, '') as directory
    from session s
    left join project p on p.id = s.project_id
    where s.parent_id is null
    order by s.time_updated desc
    limit 3000
  `,
    )
    .all() as RootSession[];
}

export function findSessionMatches(db: SessionDatabase, input: string, limit = 10): RootSession[] {
  const ranked = rankFuzzy(
    listSearchableSessions(db),
    input,
    (session) => `${session.sessionId} ${session.title} ${session.directory}`,
    limit,
  );

  return ranked.map((row) => row.item);
}

export function listRootSessions(db: SessionDatabase): RootSession[] {
  return db
    .prepare(
      `
    select
      s.id as sessionId,
      datetime(s.time_updated / 1000, 'unixepoch', 'localtime') as updated,
      replace(replace(s.title, char(10), ' '), char(13), ' ') as title,
      coalesce(nullif(s.directory, ''), p.worktree, '') as directory
    from session s
    left join project p on p.id = s.project_id
    where s.parent_id is null
    order by s.time_updated desc
  `,
    )
    .all() as RootSession[];
}

export function listRootSessionsForDirectory(
  db: SessionDatabase,
  directory: string,
): RootSession[] {
  return db
    .prepare(
      `
    select
      s.id as sessionId,
      datetime(s.time_updated / 1000, 'unixepoch', 'localtime') as updated,
      replace(replace(s.title, char(10), ' '), char(13), ' ') as title,
      coalesce(nullif(s.directory, ''), p.worktree, '') as directory
    from session s
    left join project p on p.id = s.project_id
    where s.parent_id is null
      and coalesce(nullif(s.directory, ''), p.worktree, '') = ?
    order by s.time_updated desc
  `,
    )
    .all(directory) as RootSession[];
}

export function getLatestSessionForDirectorySince(
  db: SessionDatabase,
  directory: string,
  sinceMs: number,
): SessionActivity | undefined {
  return db
    .prepare(
      `
    select
      s.id as sessionId,
      max(coalesce(s.time_updated, 0), coalesce(s.time_created, 0)) as activityMs
    from session s
    left join project p on p.id = s.project_id
    where coalesce(nullif(s.directory, ''), p.worktree, '') = ?
      and max(coalesce(s.time_updated, 0), coalesce(s.time_created, 0)) >= ?
    order by activityMs desc
    limit 1
  `,
    )
    .get(directory, sinceMs) as SessionActivity | undefined;
}

export function getLatestSessionForDirectory(
  db: SessionDatabase,
  directory: string,
): SessionActivity | undefined {
  return db
    .prepare(
      `
    select
      s.id as sessionId,
      max(coalesce(s.time_updated, 0), coalesce(s.time_created, 0)) as activityMs
    from session s
    left join project p on p.id = s.project_id
    where coalesce(nullif(s.directory, ''), p.worktree, '') = ?
    order by activityMs desc
    limit 1
  `,
    )
    .get(directory) as SessionActivity | undefined;
}

export function getSession(db: SessionDatabase, id: string): SessionDetails | undefined {
  return db
    .prepare(
      `
    select
      s.id as sessionId,
      replace(replace(replace(s.title, char(9), ' '), char(10), ' '), char(13), ' ') as title,
      coalesce(s.directory, '') as directory,
      coalesce(p.name, '') as projectName,
      coalesce(p.worktree, '') as worktree,
      coalesce(s.parent_id, '') as parentId,
      coalesce(s.share_url, '') as shareUrl,
      coalesce(datetime(s.time_created / 1000, 'unixepoch', 'localtime'), '') as created,
      coalesce(datetime(s.time_updated / 1000, 'unixepoch', 'localtime'), '') as updated,
      coalesce(datetime(s.time_archived / 1000, 'unixepoch', 'localtime'), '') as archived
    from session s
    left join project p on p.id = s.project_id
    where s.id = ?
  `,
    )
    .get(id) as SessionDetails | undefined;
}

export function getSessionDirectory(db: SessionDatabase, id: string): string {
  const row = db
    .prepare(
      `
    select coalesce(nullif(s.directory, ''), p.worktree, '') as directory
    from session s
    left join project p on p.id = s.project_id
    where s.id = ?
  `,
    )
    .get(id) as { directory: string } | undefined;

  return row ? row.directory : "";
}

export function getSessionCounts(db: SessionDatabase, id: string): SessionCounts {
  return db
    .prepare(
      `
    select
      (select count(*) from message where session_id = ?) as messages,
      (select count(*) from part where session_id = ?) as parts,
      (select count(*) from todo where session_id = ?) as todos
  `,
    )
    .get(id, id, id) as SessionCounts;
}

export function getRecentTextParts(db: SessionDatabase, id: string): RecentTextPart[] {
  return db
    .prepare(
      `
    select
      datetime(p.time_created / 1000, 'unixepoch', 'localtime') as created,
      upper(coalesce(json_extract(m.data, '$.role'), '?')) as role,
      replace(replace(substr(coalesce(json_extract(p.data, '$.text'), ''), 1, 160), char(10), ' '), char(13), ' ') as text
    from part p
    join message m on m.id = p.message_id
    where p.session_id = ?
      and json_extract(p.data, '$.type') = 'text'
    order by p.time_created desc
    limit 10
  `,
    )
    .all(id) as RecentTextPart[];
}

export function setSessionTitle(db: SessionDatabase, id: string, title: string): void {
  db.prepare(
    `
      update session
      set title = ?
      where id = ?
    `,
  ).run(title, id);
}
