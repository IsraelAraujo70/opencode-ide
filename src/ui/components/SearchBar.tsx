/**
 * SearchBar - Minimal search overlay (Ctrl+F)
 *
 * Clean single-line: [/query] N/M
 */

import { useEffect } from "react"
import type { KeyEvent } from "@opentui/core"
import type { Theme, SearchMatch } from "../../domain/types.ts"
import { store } from "../../application/store.ts"
import { search } from "../../adapters/index.ts"

interface SearchBarProps {
  theme: Theme
  width: number
  query: string
  replaceText: string
  isRegex: boolean
  isCaseSensitive: boolean
  isWholeWord: boolean
  matches: SearchMatch[]
  currentMatchIndex: number
  mode: "file" | "project"
  bufferContent: string | null
}

export function SearchBar({
  theme,
  width,
  query,
  replaceText,
  isRegex,
  isCaseSensitive,
  isWholeWord,
  matches,
  currentMatchIndex,
  mode,
  bufferContent,
}: SearchBarProps) {
  const colors = theme.colors

  // Run search when query or options change
  useEffect(() => {
    if (mode === "file" && bufferContent !== null && query) {
      const results = search.searchInFile(bufferContent, query, {
        isRegex,
        isCaseSensitive,
        isWholeWord,
      })
      store.dispatch({ type: "SET_SEARCH_MATCHES", matches: results })
    } else if (mode === "file" && !query) {
      store.dispatch({ type: "SET_SEARCH_MATCHES", matches: [] })
    }
  }, [query, isRegex, isCaseSensitive, isWholeWord, bufferContent, mode])

  // Project search (debounced)
  useEffect(() => {
    if (mode !== "project" || !query) return
    const rootPath = store.getState().workspace.rootPath
    if (!rootPath) return

    const doSearch = async () => {
      const results = await search.searchInProject(rootPath, query, {
        isRegex,
        isCaseSensitive,
        isWholeWord,
      })
      store.dispatch({ type: "SET_PROJECT_SEARCH_RESULTS", results })
    }

    const timer = setTimeout(doSearch, 300)
    return () => clearTimeout(timer)
  }, [query, isRegex, isCaseSensitive, isWholeWord, mode])

  const handleKeyDown = (event: KeyEvent) => {
    if (event.name === "escape") {
      store.dispatch({ type: "CLOSE_SEARCH" })
      return
    }
    if (event.name === "return" || event.name === "enter") {
      if (event.shift) {
        store.dispatch({ type: "PREV_MATCH" })
      } else {
        store.dispatch({ type: "NEXT_MATCH" })
      }
      return
    }
  }

  const matchText = query
    ? matches.length > 0
      ? `${currentMatchIndex + 1}/${matches.length}`
      : "no match"
    : ""

  return (
    <box height={1} flexDirection="row" backgroundColor={colors.selection}>
      <text fg={colors.primary} bg={colors.selection}>{" / "}</text>
      <input
        value={query}
        focused={true}
        width={20}
        backgroundColor={colors.selection}
        textColor={colors.foreground}
        focusedBackgroundColor={colors.selection}
        cursorColor={colors.primary}
        onInput={(val: string) => store.dispatch({ type: "SET_SEARCH_QUERY", query: val })}
        onKeyDown={handleKeyDown}
      />
      <text
        fg={matches.length > 0 ? colors.accent : colors.error}
        bg={colors.selection}
      >
        {matchText ? ` [${matchText}]` : ""}
      </text>
    </box>
  )
}
