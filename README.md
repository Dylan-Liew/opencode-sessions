# oc-sessions

[![npm downloads](https://img.shields.io/npm/dm/oc-sessions)](https://www.npmjs.com/package/oc-sessions)

`oc-sessions` installs the `oc` CLI, a small tool for listing, inspecting, resuming, and deleting OpenCode sessions from the local session database.

## Features

- `oc new` to start a new interactive session in the current directory
- `oc list` and `oc ls` to browse root sessions
- `oc view` and `oc v` to inspect session details and recent text
- `oc resume` and `oc r` to reopen a session
- `oc delete` and `oc d` to remove a session after confirmation
- Ink-powered terminal UX for list/view/select/confirm flows
- exact-title lookup for `view`, `resume`, and `delete`
- fuzzy match suggestions for unresolved or ambiguous session lookups
- no-argument `oc resume` that looks up sessions for the current directory and supports interactive search when there are multiple matches

## Requirements

- Node.js 18+
- `opencode` available in your shell

## Install

From npm after publishing:

```bash
npm install -g oc-sessions
```

For local development from this repository:

```bash
bun install
bun add --global "$PWD"
```

You can also run the built CLI directly:

```bash
npm run build
node ./dist/cli/index.js list
```

## Usage

```text
oc new <title> [prompt...]
oc list
oc view <session>
oc resume [session]
oc delete <session>
```

Aliases: `oc ls` → `oc list`, `oc v` → `oc view`, `oc r` → `oc resume`, `oc d` → `oc delete`.

`oc new` launches the full OpenCode TUI (`opencode --prompt ...`) so the session is interactive from the start.
When interactive prompts are needed, use arrow keys and Enter in the Ink UI (Esc cancels).

## Examples

```bash
oc new "Fix login redirect" "Investigate the redirect loop after sign-in and patch it."
oc ls
oc v "usage-plugin"
oc resume
oc r "usage-plugin"
oc d "usage-plugin"
```
