/**
 * SearchPanel - Project-wide search results panel
 *
 * Shows grep results grouped by file with match previews.
 * Clicking a result opens the file at that position.
 */

import { useState } from "react"
import type { Theme, ProjectSearchResult } from "../../domain/types.ts"
import { store } from "../../application/store.ts"
import { commandRegistry } from "../../application/commands.ts"
import { basename } from "node:path"

interface SearchPanelProps {
  theme: Theme
  width: number
  height: number
  results: ProjectSearchResult[]
  query: string
  focused: boolean
}

export function SearchPanel({
  theme,
  width,
  height,
  results,
  query,
  focused,
}: SearchPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const colors = theme.colors

  // Flatten results into selectable items
  const items: { type: "file" | "match"; filePath: string; line?: number; preview?: string }[] = []
  for (const result of results) {
    items.push({ type: "file", filePath: result.filePath })
    for (const match of result.matches.slice(0, 5)) {
      items.push({
        type: "match",
        filePath: result.filePath,
        line: match.line,
        preview: result.preview,
      })
    }
  }

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0)

  return (
    <box
      width={width}
      height={height}
      flexDirection="column"
      backgroundColor={colors.background}
      borderStyle="single"
      border={["top"]}
      borderColor={focused ? colors.primary : colors.border}
    >
      {/* Header */}
      <box height={1} flexDirection="row" paddingX={1}>
        <text fg={colors.primary}>
          <strong> Search Results</strong>
        </text>
        <text fg={colors.comment}>
          {query ? ` "${query}" — ${totalMatches} matches in ${results.length} files` : ""}
        </text>
      </box>

      {/* Results list */}
      <scrollbox height={height - 2} focused={focused}>
        {items.length === 0 && (
          <text fg={colors.comment}>
            {query ? "  No results found" : "  Type to search across project files"}
          </text>
        )}
        {items.map((item, idx) => {
          const isSelected = idx === selectedIndex
          if (item.type === "file") {
            const relPath = item.filePath.replace(
              (store.getState().workspace.rootPath ?? "") + "/",
              ""
            )
            return (
              <box key={`f-${idx}`} height={1} paddingX={1}>
                <text
                  fg={colors.accent}
                  bg={isSelected ? colors.selection : undefined}
                >
                  {`  ${basename(item.filePath)}`}
                  <span fg={colors.comment}>{` ${relPath}`}</span>
                </text>
              </box>
            )
          }
          return (
            <box key={`m-${idx}`} height={1} paddingX={1}>
              <text
                fg={colors.foreground}
                bg={isSelected ? colors.selection : undefined}
              >
                {`    ${(item.line ?? 0) + 1}: ${item.preview ?? ""}`}
              </text>
            </box>
          )
        })}
      </scrollbox>
    </box>
  )
}
