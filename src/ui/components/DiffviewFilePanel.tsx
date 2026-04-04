/**
 * DiffviewFilePanel - Neovim-style full-screen diff viewer
 *
 * Layout:
 *   LEFT:  File tree of changed files grouped by directory
 *   RIGHT: Side-by-side diff view using OpenTUI <diff> component
 *
 * Keyboard: j/k navigate files, Enter/d open diff, q close, Tab switch pane
 */

import { useState, useCallback, useEffect } from "react"
import type { KeyEvent } from "@opentui/core"
import type { Theme, GitState, DiffviewState } from "../../domain/types.ts"
import { store } from "../../application/store.ts"
import { git, fileSystem } from "../../adapters/index.ts"
import { getFileIcon, getFolderIcon, folderColor } from "../../domain/fileIcons.ts"
import { basename, dirname } from "node:path"

interface DiffviewFilePanelProps {
  theme: Theme
  width: number
  height: number
  gitState: GitState
  diffview: DiffviewState
  rootPath: string | null
}

const STATUS_ICON: Record<string, string> = {
  modified: "M",
  added: "A",
  deleted: "D",
  renamed: "R",
  copied: "C",
  untracked: "?",
}

const STATUS_LABEL: Record<string, string> = {
  modified: "modified",
  added: "new file",
  deleted: "deleted",
  renamed: "renamed",
  untracked: "untracked",
}

interface ChangedFile {
  path: string
  status: string
  section: "staged" | "unstaged" | "untracked"
}

function detectLanguage(filePath: string): string | null {
  const ext = filePath.split(".").pop()?.toLowerCase()
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rs: "rust", go: "go", json: "json", md: "markdown",
    html: "html", css: "css", scss: "css", yaml: "yaml", yml: "yaml",
    sh: "bash", bash: "bash", zsh: "bash",
  }
  return ext ? (map[ext] ?? null) : null
}

export function DiffviewFilePanel({
  theme,
  width,
  height,
  gitState,
  diffview,
  rootPath,
}: DiffviewFilePanelProps) {
  const [focusPane, setFocusPane] = useState<"files" | "diff">("files")
  const [fileIndex, setFileIndex] = useState(diffview.selectedIndex)
  const colors = theme.colors

  // Build flat list of all changed files
  const allFiles: ChangedFile[] = []
  for (const f of gitState.staged) {
    allFiles.push({ path: f.path, status: f.status, section: "staged" })
  }
  for (const f of gitState.unstaged) {
    allFiles.push({ path: f.path, status: f.status, section: "unstaged" })
  }
  for (const p of gitState.untracked) {
    allFiles.push({ path: p, status: "untracked", section: "untracked" })
  }

  // Group by directory
  const groups = new Map<string, ChangedFile[]>()
  for (const file of allFiles) {
    const dir = dirname(file.path)
    if (!groups.has(dir)) groups.set(dir, [])
    groups.get(dir)!.push(file)
  }

  const loadDiffForFile = useCallback(async (file: ChangedFile, index: number) => {
    if (!rootPath) return

    const lang = detectLanguage(file.path)

    try {
      // Get old version (from HEAD) and new version (working tree)
      const oldCode = await git.showFile(rootPath, file.path, "HEAD")
      let newCode: string
      if (file.status === "deleted") {
        newCode = ""
      } else {
        try {
          newCode = await fileSystem.readFile(`${rootPath}/${file.path}`)
        } catch {
          newCode = ""
        }
      }

      store.dispatch({
        type: "SET_DIFFVIEW_FILE",
        file: file.path,
        oldCode,
        newCode,
        language: lang,
        index,
      })
    } catch {
      // New file — no old version
      try {
        const newCode = await fileSystem.readFile(`${rootPath}/${file.path}`)
        store.dispatch({
          type: "SET_DIFFVIEW_FILE",
          file: file.path,
          oldCode: "",
          newCode,
          language: lang,
          index,
        })
      } catch {
        // Ignore
      }
    }
  }, [rootPath])

  // Load first file on open
  useEffect(() => {
    if (diffview.isOpen && !diffview.selectedFile && allFiles.length > 0) {
      void loadDiffForFile(allFiles[0]!, 0)
    }
  }, [diffview.isOpen])

  const handleKeyDown = useCallback((event: KeyEvent) => {
    const key = event.name?.toLowerCase()
    const seq = event.sequence

    // q or Escape = close
    if (seq === "q" || key === "escape") {
      store.dispatch({ type: "CLOSE_DIFFVIEW" })
      return
    }

    // Tab = switch pane
    if (key === "tab") {
      event.preventDefault?.()
      setFocusPane(p => p === "files" ? "diff" : "files")
      return
    }

    // File pane navigation
    if (focusPane === "files") {
      if (key === "down" || seq === "j") {
        event.preventDefault?.()
        setFileIndex(i => Math.min(i + 1, allFiles.length - 1))
        return
      }
      if (key === "up" || seq === "k") {
        event.preventDefault?.()
        setFileIndex(i => Math.max(i - 1, 0))
        return
      }
      if (key === "enter" || key === "return" || seq === "d") {
        event.preventDefault?.()
        const file = allFiles[fileIndex]
        if (file) void loadDiffForFile(file, fileIndex)
        return
      }
      // s = stage
      if (seq === "s" && rootPath) {
        const file = allFiles[fileIndex]
        if (file && file.section !== "staged") {
          git.stage(rootPath, [file.path]).then(() => {
            import("../../application/git-runtime.ts").then(m => m.refreshGitStatus())
          })
        }
        return
      }
      // u = unstage
      if (seq === "u" && rootPath) {
        const file = allFiles[fileIndex]
        if (file && file.section === "staged") {
          git.unstage(rootPath, [file.path]).then(() => {
            import("../../application/git-runtime.ts").then(m => m.refreshGitStatus())
          })
        }
        return
      }
    }
  }, [focusPane, fileIndex, allFiles, rootPath])

  const treeWidth = Math.max(25, Math.min(40, Math.floor(width * 0.25)))
  const diffWidth = width - treeWidth

  return (
    <box width={width} height={height} flexDirection="column" backgroundColor={colors.background}>
      {/* Header */}
      <box height={1} backgroundColor={colors.lineHighlight} paddingX={1} flexDirection="row">
        <text fg={colors.primary}>
          {"DiffviewFilePanel"}
        </text>
        <text fg={colors.comment}>
          {` - ${gitState.branch}`}
        </text>
        <text fg={colors.foreground}>
          {`  Changes (${allFiles.length})`}
        </text>
        <text fg={colors.comment}>
          {"  q:close Tab:switch s:stage u:unstage"}
        </text>
      </box>

      {/* Main content: file tree + diff */}
      <box flexDirection="row" flexGrow={1}>
        {/* File tree (left) */}
        <scrollbox
          width={treeWidth}
          height={height - 1}
          focused={focusPane === "files"}
          onKeyDown={handleKeyDown}
        >
          <box flexDirection="column" borderStyle="single" border={["right"]}
            borderColor={focusPane === "files" ? colors.primary : colors.border}>
            {/* Section header */}
            <box height={1} paddingX={1} backgroundColor={colors.lineHighlight}>
              <text fg={colors.accent}>
                <strong>Changes ({allFiles.length})</strong>
              </text>
            </box>

            {/* Group by directory - tree style */}
            {Array.from(groups.entries()).map(([dir, files]) => (
              <box key={dir} flexDirection="column">
                {/* Directory header with folder icon */}
                <box height={1} paddingX={1}>
                  <text fg={folderColor}>{`${getFolderIcon(dir.split("/").pop() ?? dir, true)} `}</text>
                  <text fg={folderColor}>{dir === "." ? "." : dir.split("/").pop() ?? dir}</text>
                </box>
                {/* Files in directory with indent */}
                {files.map((file) => {
                  const globalIdx = allFiles.indexOf(file)
                  const isSelected = globalIdx === fileIndex
                  const isViewing = file.path === diffview.selectedFile
                  const name = basename(file.path)
                  const fileIcon = getFileIcon(name)
                  const statusChar = STATUS_ICON[file.status] ?? "?"
                  const statusColor =
                    file.status === "added" || file.status === "untracked" ? colors.success
                    : file.status === "deleted" ? colors.error
                    : colors.warning
                  const bg = isSelected ? colors.selection : colors.background

                  return (
                    <box key={file.path} height={1} backgroundColor={bg} flexDirection="row">
                      <text fg={colors.border} bg={bg}>{"   "}</text>
                      <text fg={fileIcon.color} bg={bg}>{`${fileIcon.icon} `}</text>
                      <text fg={isViewing ? colors.primary : colors.foreground} bg={bg}>{name}</text>
                      <text fg={statusColor} bg={bg}>{` ${statusChar}`}</text>
                      {file.section === "staged" && <text fg={colors.success} bg={bg}>{" ✓"}</text>}
                    </box>
                  )
                })}
              </box>
            ))}
          </box>
        </scrollbox>

        {/* Diff view (right) */}
        <box flexGrow={1} flexDirection="column">
          {/* Diff header */}
          <box height={1} paddingX={1} backgroundColor={colors.lineHighlight}>
            {diffview.selectedFile ? (
              <>
                <text fg={colors.foreground}>{diffview.selectedFile}</text>
                <text fg={colors.comment}>{` (${STATUS_LABEL[allFiles.find(f => f.path === diffview.selectedFile)?.status ?? ""] ?? ""})`}</text>
              </>
            ) : (
              <text fg={colors.comment}>Select a file to view diff</text>
            )}
          </box>

          {/* Diff content */}
          {diffview.selectedFile && (diffview.oldCode || diffview.newCode) ? (
            <diff
              oldCode={diffview.oldCode}
              newCode={diffview.newCode}
              language={diffview.language ?? "text"}
              mode="split"
              syncScroll
              showLineNumbers
              addedLineColor="#2d4f2d"
              removedLineColor="#4f2d2d"
            />
          ) : (
            <box flexGrow={1} justifyContent="center" alignItems="center">
              <text fg={colors.comment}>
                {allFiles.length > 0
                  ? "Press Enter or 'd' to view diff"
                  : "No changes to display"}
              </text>
            </box>
          )}
        </box>
      </box>
    </box>
  )
}
