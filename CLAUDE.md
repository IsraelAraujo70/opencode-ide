# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Open IDE is a terminal-based IDE built with OpenTUI and Bun. It renders a full IDE experience (editor, file explorer, tabs, command palette, LSP integration) inside the terminal using React components via `@opentui/react`.

## Commands

- **Run**: `bun run index.tsx` or `bun run start`
- **Dev mode**: `bun --watch index.tsx` or `bun run dev`
- **Tests**: `bun test` (single file: `bun test src/application/store.test.ts`)
- **Typecheck**: `bunx tsc --noEmit`
- **Format**: `prettier . --write` (check: `prettier . --check`)
- **Install deps**: `bun install`

## Architecture (Hexagonal)

The codebase follows hexagonal (ports & adapters) architecture:

- **`src/domain/`** — Pure types and business logic. `types.ts` defines all core entities (BufferState, Tab, Pane, AppState, AppAction, etc.). No external dependencies.
- **`src/ports/`** — Port interfaces (contracts) that adapters implement: FileSystemPort, ClipboardPort, LspPort, SettingsPort, etc.
- **`src/application/`** — State management via reducer pattern. `store.ts` has the central AppState and reducer with discriminated union actions. `commands.ts` orchestrates side effects. `lsp-runtime.ts` manages LSP server lifecycle.
- **`src/adapters/`** — Implementations of ports: filesystem (Bun APIs), clipboard, LSP (JSON-RPC over stdio), process spawning, renderer, settings.
- **`src/ui/`** — React components (`App.tsx`, `Editor.tsx`, `Explorer.tsx`, `CommandLine.tsx`, `Palette.tsx`, etc.) and hooks (`useStore.ts`, `useKeybindings.ts`).
- **`src/shared/`** — Cross-cutting utilities: Tree-sitter integration for syntax highlighting, syntax style mappings.

Data flow: UI dispatches `AppAction` → reducer in `store.ts` produces new `AppState` → UI re-renders. Side effects go through `commands.ts` which uses adapters via ports.

## Code Style

- **Runtime**: Bun — use `bun:test`, `Bun.file()`, etc. Not Node.js.
- **TypeScript strict mode**, no semicolons, 2-space indent
- **Imports**: Use `.ts` extensions, `type` keyword for type-only imports (`verbatimModuleSyntax`)
- **JSX**: `jsxImportSource` is `@opentui/react`, not `react-dom`
- **Naming**: PascalCase components, camelCase functions, UPPER_SNAKE action types
- **Files**: kebab-case filenames, barrel exports via `index.ts`
- **State actions**: Discriminated unions — add new actions to the `AppAction` union in `types.ts` and handle in the reducer in `store.ts`

## LSP Integration

Language servers are started as child processes communicating via JSON-RPC over stdio. Server configs per language are in `lsp-runtime.ts`. The `.open-ide/` directory contains Tree-sitter parser configs and highlight query files (`.scm`) for syntax highlighting.

## Key Constraints

- This is a terminal UI app — there is no browser DOM. All rendering goes through OpenTUI's terminal renderer.
- React 19 with `@opentui/react` JSX transform — not React DOM.
- Published to npm as `@israelaraujo70/open-ide` with `bin/open-ide.js` as CLI entry point.
