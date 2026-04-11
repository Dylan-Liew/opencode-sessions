# oc-sessions

`oc-sessions` installs the `oc` CLI, a small tool for listing, inspecting, resuming, and deleting OpenCode sessions from the local session database.

## Features

- `oc new` to start a titled session in the current directory
- `oc list` and `oc ls` to browse root sessions
- `oc view` and `oc v` to inspect session details and recent text
- `oc resume` and `oc r` to reopen a session
- `oc delete` and `oc d` to remove a session after confirmation
- exact-title lookup for `view`, `resume`, and `delete`
- no-argument `oc resume` that looks up sessions for the current directory and prompts when there are multiple matches

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
oc ls
oc view <session>
oc v <session>
oc resume [session]
oc r [session]
oc delete <session>
oc d <session>
```

## Examples

```bash
oc new "Fix login redirect" "Investigate the redirect loop after sign-in and patch it."
oc ls
oc v "usage-plugin"
oc resume
oc r "usage-plugin"
oc d "usage-plugin"
```
