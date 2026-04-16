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

function getDbPath(): string {
  try {
    return readOpencode(["db", "path"]);
  } catch (error) {
    fail(`Failed to resolve OpenCode database path: ${(error as Error).message}`);
  }
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

export function resolveSessionId(
  db: SessionDatabase,
  input: string,
  options: { allowTitle?: boolean } = {},
): string {
  const { allowTitle = false } = options;
  const exactMatches = db
    .prepare(
      `
    select id
    from session
    where id = ?
    order by time_updated desc
  `,
    )
    .all(input) as Array<{ id: string }>;

  if (exactMatches.length === 1) {
    return exactMatches[0].id;
  }

  if (allowTitle) {
    const titleMatches = db
      .prepare(
        `
      select id
      from session
      where title = ?
      order by time_updated desc
    `,
      )
      .all(input) as Array<{ id: string }>;

    if (titleMatches.length === 1) {
      return titleMatches[0].id;
    }

    if (titleMatches.length > 1) {
      fail(
        `! Session title is ambiguous: ${input}\n\n${titleMatches.map((row) => row.id).join("\n")}`,
      );
    }

    const titlePrefixMatches = db
      .prepare(
        `
      select
        id,
        replace(replace(title, char(10), ' '), char(13), ' ') as title
      from session
      where substr(title, 1, length(?)) = ?
      order by time_updated desc
    `,
      )
      .all(input, input) as Array<{ id: string; title: string }>;

    if (titlePrefixMatches.length === 1) {
      return titlePrefixMatches[0].id;
    }

    if (titlePrefixMatches.length > 1) {
      fail(
        `! Session title prefix is ambiguous: ${input}\n\n` +
          `${titlePrefixMatches.map((row) => `${row.id}\t${row.title}`).join("\n")}`,
      );
    }
  }

  const prefixMatches = db
    .prepare(
      `
    select id
    from session
    where substr(id, 1, length(?)) = ?
    order by time_updated desc
  `,
    )
    .all(input, input) as Array<{ id: string }>;

  if (prefixMatches.length === 0) {
    const fuzzyMatches = findSessionMatches(db, input);

    if (fuzzyMatches.length > 0) {
      fail(
        `! Session not found: ${input}\n\n` +
          `Closest matches:\n${fuzzyMatches.map((row) => `${row.sessionId}\t${row.title}`).join("\n")}`,
      );
    }

    fail(`! Session not found: ${input}`);
  }

  if (prefixMatches.length > 1) {
    const fuzzyMatches = findSessionMatches(db, input);
    const lines =
      fuzzyMatches.length > 0
        ? fuzzyMatches.map((row) => `${row.sessionId}\t${row.title}`).join("\n")
        : prefixMatches.map((row) => row.id).join("\n");

    fail(`! Session prefix is ambiguous: ${input}\n\n${lines}`);
  }

  return prefixMatches[0].id;
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
