/**
 * DiffviewFilePanel - Zed-style full-screen diff viewer
 *
 * Layout:
 *   LEFT:  Side-by-side diff view (split mode) with toolbar
 *   RIGHT: Sidebar with file list, branch info, commit input
 *
 * Keyboard: j/k navigate files (auto-loads diff), s/u stage/unstage,
 *           S stage all, c commit input, Tab cycle focus, q close
 */

import { useState, useCallback, useEffect, useRef } from "react"
import type { KeyEvent } from "@opentui/core"
import type { Theme, GitState, DiffviewState, DiffviewFocusArea, ThemeColors } from "../../domain/types.ts"
import { store } from "../../application/store.ts"
import { git, fileSystem } from "../../adapters/index.ts"
import { getFileIcon } from "../../domain/fileIcons.ts"
import { basename } from "node:path"

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

function buildAllFiles(gitState: GitState): ChangedFile[] {
  const files: ChangedFile[] = []
  for (const f of gitState.staged) {
    files.push({ path: f.path, status: f.status, section: "staged" })
  }
  for (const f of gitState.unstaged) {
    files.push({ path: f.path, status: f.status, section: "unstaged" })
  }
  for (const p of gitState.untracked) {
    files.push({ path: p, status: "untracked", section: "untracked" })
  }
  return files
}

export function DiffviewFilePanel({
  theme,
  width,
  height,
  gitState,
  diffview,
  rootPath,
}: DiffviewFilePanelProps) {
  const [fileIndex, setFileIndex] = useState(diffview.selectedIndex)
  const [commitMsg, setCommitMsg] = useState("")
  const [lastCommit, setLastCommit] = useState("")
  const [diffText, setDiffText] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const colors = theme.colors
  const focusArea = diffview.focusArea

  const allFiles = buildAllFiles(gitState)
  const stagedFiles = allFiles.filter(f => f.section === "staged")
  const unstagedFiles = allFiles.filter(f => f.section === "unstaged")
  const untrackedFiles = allFiles.filter(f => f.section === "untracked")

  const sidebarWidth = Math.max(22, Math.min(35, Math.floor(width * 0.22)))
  const diffAreaWidth = width - sidebarWidth

  const setFocus = useCallback((area: DiffviewFocusArea) => {
    store.dispatch({ type: "SET_DIFFVIEW_FOCUS_AREA", area })
  }, [])

  const loadDiffForFile = useCallback(async (file: ChangedFile, index: number) => {
    if (!rootPath) return
    const lang = detectLanguage(file.path)

    // Get unified diff text for the <diff> component
    try {
      let diffOutput: string
      if (file.section === "staged") {
        diffOutput = await git.diffStaged(rootPath, file.path)
      } else if (file.section === "untracked") {
        const content = await fileSystem.readFile(`${rootPath}/${file.path}`)
        const lines = content.split("\n")
        diffOutput = [
          `--- /dev/null`,
          `+++ b/${file.path}`,
          `@@ -0,0 +1,${lines.length} @@`,
          ...lines.map(l => `+${l}`),
        ].join("\n")
      } else {
        diffOutput = await git.diff(rootPath, file.path)
      }
      setDiffText(diffOutput)
    } catch {
      setDiffText("")
    }

    // Update store state for tracking selected file
    try {
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
      store.dispatch({ type: "SET_DIFFVIEW_FILE", file: file.path, oldCode, newCode, language: lang, index })
    } catch {
      try {
        const newCode = await fileSystem.readFile(`${rootPath}/${file.path}`)
        store.dispatch({ type: "SET_DIFFVIEW_FILE", file: file.path, oldCode: "", newCode, language: lang, index })
      } catch {
        // Ignore
      }
    }
  }, [rootPath])

  const loadDiffDebounced = useCallback((file: ChangedFile, index: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void loadDiffForFile(file, index)
    }, 100)
  }, [loadDiffForFile])

  // Auto-load first file + file stats on open
  useEffect(() => {
    if (!diffview.isOpen || !rootPath) return

    // Load first file if nothing is selected yet
    if (allFiles.length > 0 && (!diffview.selectedFile || diffview.selectedFile === "")) {
      void loadDiffForFile(allFiles[0]!, 0)
    }

    // Load file stats
    git.diffNumstat(rootPath).then(stats => {
      store.dispatch({ type: "SET_DIFFVIEW_FILE_STATS", stats })
    }).catch(() => {})

    // Load last commit message
    git.log(rootPath, 1).then(entries => {
      if (entries.length > 0) setLastCommit(entries[0]!.message)
    }).catch(() => {})
  }, [diffview.isOpen, allFiles.length, rootPath])

  // Also load diff text when selectedFile changes from the command pre-load
  useEffect(() => {
    if (!diffview.isOpen || !rootPath || !diffview.selectedFile) return
    if (diffText) return // Already have diff text

    const file = allFiles.find(f => f.path === diffview.selectedFile)
    if (file) {
      void (async () => {
        try {
          let output: string
          if (file.section === "staged") {
            output = await git.diffStaged(rootPath, file.path)
          } else if (file.section === "untracked") {
            const content = await fileSystem.readFile(`${rootPath}/${file.path}`)
            const lines = content.split("\n")
            output = [
              `--- /dev/null`,
              `+++ b/${file.path}`,
              `@@ -0,0 +1,${lines.length} @@`,
              ...lines.map(l => `+${l}`),
            ].join("\n")
          } else {
            output = await git.diff(rootPath, file.path)
          }
          setDiffText(output)
        } catch {
          setDiffText("")
        }
      })()
    }
  }, [diffview.selectedFile, diffview.isOpen, rootPath])

  const refreshAfterGitOp = useCallback(async () => {
    const { refreshGitStatus } = await import("../../application/git-runtime.ts")
    refreshGitStatus()
    if (rootPath) {
      git.diffNumstat(rootPath).then(stats => {
        store.dispatch({ type: "SET_DIFFVIEW_FILE_STATS", stats })
      }).catch(() => {})
    }
  }, [rootPath])

  const doStage = useCallback(async (file: ChangedFile) => {
    if (!rootPath || file.section === "staged") return
    await git.stage(rootPath, [file.path])
    await refreshAfterGitOp()
  }, [rootPath, refreshAfterGitOp])

  const doUnstage = useCallback(async (file: ChangedFile) => {
    if (!rootPath || file.section !== "staged") return
    await git.unstage(rootPath, [file.path])
    await refreshAfterGitOp()
  }, [rootPath, refreshAfterGitOp])

  const doStageAll = useCallback(async () => {
    if (!rootPath) return
    const files = [...gitState.unstaged.map(f => f.path), ...gitState.untracked]
    if (files.length === 0) return
    await git.stage(rootPath, files)
    await refreshAfterGitOp()
  }, [rootPath, gitState, refreshAfterGitOp])

  const doCommit = useCallback(async () => {
    if (!rootPath || !commitMsg.trim()) return
    try {
      await git.commit(rootPath, commitMsg.trim())
      setCommitMsg("")
      store.dispatch({ type: "SET_DIFFVIEW_COMMIT_MESSAGE", message: "" })
      await refreshAfterGitOp()
      git.log(rootPath, 1).then(entries => {
        if (entries.length > 0) setLastCommit(entries[0]!.message)
      }).catch(() => {})
      setFocus("fileList")
    } catch {
      // Commit failed
    }
  }, [rootPath, commitMsg, refreshAfterGitOp, setFocus])

  // Main key handler — attached to the outermost focused box
  const handleKeyDown = useCallback((event: KeyEvent) => {
    const key = event.name?.toLowerCase()
    const seq = event.sequence

    // Commit input mode — only handle Escape and Ctrl+Enter
    if (focusArea === "commitInput") {
      if (key === "escape") {
        event.preventDefault?.()
        setFocus("fileList")
        return
      }
      // Let the input component handle all other keys
      return
    }

    // Global shortcuts (not in commitInput)
    if (seq === "q" || key === "escape") {
      store.dispatch({ type: "CLOSE_DIFFVIEW" })
      return
    }

    if (key === "tab") {
      event.preventDefault?.()
      const order: DiffviewFocusArea[] = ["fileList", "diff", "commitInput"]
      const idx = order.indexOf(focusArea)
      setFocus(order[(idx + 1) % order.length]!)
      return
    }

    if (seq === "c") {
      event.preventDefault?.()
      setFocus("commitInput")
      return
    }

    // File list navigation
    if (focusArea === "fileList") {
      if (key === "down" || seq === "j") {
        event.preventDefault?.()
        const newIdx = Math.min(fileIndex + 1, allFiles.length - 1)
        setFileIndex(newIdx)
        const file = allFiles[newIdx]
        if (file) loadDiffDebounced(file, newIdx)
        return
      }
      if (key === "up" || seq === "k") {
        event.preventDefault?.()
        const newIdx = Math.max(fileIndex - 1, 0)
        setFileIndex(newIdx)
        const file = allFiles[newIdx]
        if (file) loadDiffDebounced(file, newIdx)
        return
      }
      if (seq === "s") {
        const file = allFiles[fileIndex]
        if (file) void doStage(file)
        return
      }
      if (seq === "u") {
        const file = allFiles[fileIndex]
        if (file) void doUnstage(file)
        return
      }
      if (seq === "S") {
        void doStageAll()
        return
      }
      if (key === "enter" || key === "return") {
        event.preventDefault?.()
        const file = allFiles[fileIndex]
        if (file) void loadDiffForFile(file, fileIndex)
        return
      }
    }
  }, [focusArea, fileIndex, allFiles, doStage, doUnstage, doStageAll, loadDiffDebounced, loadDiffForFile, setFocus])

  // Commit input key handler — separate so it only fires on the input wrapper
  const handleCommitKeyDown = useCallback((event: KeyEvent) => {
    const key = event.name?.toLowerCase()

    if (key === "escape") {
      event.preventDefault?.()
      setFocus("fileList")
      return
    }
    if (key === "enter" || key === "return") {
      event.preventDefault?.()
      void doCommit()
      return
    }
  }, [doCommit, setFocus])

  const getFileStats = (filePath: string) => {
    return diffview.fileStats.find(s => s.file === filePath)
  }

  const toolbarHeight = 1
  const fileHeaderHeight = 1
  const mainHeight = height - toolbarHeight - fileHeaderHeight

  return (
    <box
      width={width}
      height={height}
      flexDirection="column"
      backgroundColor={colors.background}
    >
      {/* Toolbar */}
      <box height={toolbarHeight} backgroundColor={colors.lineHighlight} paddingLeft={1} paddingRight={1} flexDirection="row" gap={2}>
        <text fg={colors.foreground}>
          <strong>s</strong>
        </text>
        <text fg={colors.comment}>Stage</text>
        <text fg={colors.foreground}>
          <strong>u</strong>
        </text>
        <text fg={colors.comment}>Unstage</text>
        <text fg={colors.foreground}>
          <strong>S</strong>
        </text>
        <text fg={colors.comment}>Stage All</text>
        <text fg={colors.foreground}>
          <strong>c</strong>
        </text>
        <text fg={colors.comment}>Commit</text>
        <text fg={colors.foreground}>
          <strong>q</strong>
        </text>
        <text fg={colors.comment}>Close</text>
        <text fg={colors.foreground}>
          <strong>Tab</strong>
        </text>
        <text fg={colors.comment}>Switch</text>
      </box>

      {/* File header */}
      <box height={fileHeaderHeight} backgroundColor={colors.background} paddingLeft={1} paddingRight={1} flexDirection="row">
        {diffview.selectedFile ? (
          <>
            <text fg={colors.foreground}>
              <strong>{diffview.selectedFile}</strong>
            </text>
            <text fg={colors.comment}>{`  ${allFiles.find(f => f.path === diffview.selectedFile)?.status ?? ""}`}</text>
          </>
        ) : (
          <text fg={colors.comment}>No file selected</text>
        )}
      </box>

      {/* Main content: Diff (left) + Sidebar (right) */}
      <box flexDirection="row" height={mainHeight}>
        {/* Diff area */}
        <box width={diffAreaWidth} flexDirection="column">
          {diffText ? (
            <diff
              diff={diffText}
              view="split"
              filetype={diffview.language ?? undefined}
              showLineNumbers
              addedBg="#2d4f2d"
              removedBg="#4f2d2d"
            />
          ) : (
            <box flexGrow={1} justifyContent="center" alignItems="center">
              <text fg={colors.comment}>
                {allFiles.length > 0 ? "Loading diff..." : "No changes to display"}
              </text>
            </box>
          )}
        </box>

        {/* Sidebar */}
        <scrollbox
          width={sidebarWidth}
          height={mainHeight}
          borderStyle="single"
          border={["left"]}
          borderColor={focusArea === "fileList" ? colors.primary : colors.border}
          focused={focusArea !== "commitInput"}
          onKeyDown={handleKeyDown}
        >
          <box flexDirection="column">
            {/* Change count header */}
            <box height={1} paddingLeft={1} paddingRight={1} backgroundColor={colors.lineHighlight} flexDirection="row">
              <text fg={colors.accent}>
                <strong>{allFiles.length} Change{allFiles.length !== 1 ? "s" : ""}</strong>
              </text>
            </box>

            {/* Staged files section */}
            {stagedFiles.length > 0 && (
              <box flexDirection="column">
                <box height={1} paddingLeft={1} paddingRight={1}>
                  <text fg={colors.success}>
                    <strong>Staged ({stagedFiles.length})</strong>
                  </text>
                </box>
                {stagedFiles.map(file => {
                  const globalIdx = allFiles.indexOf(file)
                  const isSelected = globalIdx === fileIndex
                  const stats = getFileStats(file.path)
                  return (
                    <FileRow
                      key={`staged-${file.path}`}
                      file={file}
                      isSelected={isSelected}
                      isActive={file.path === diffview.selectedFile}
                      stats={stats}
                      colors={colors}
                    />
                  )
                })}
              </box>
            )}

            {/* Unstaged (tracked) files section */}
            {unstagedFiles.length > 0 && (
              <box flexDirection="column">
                <box height={1} paddingLeft={1} paddingRight={1}>
                  <text fg={colors.warning}>
                    <strong>Changes ({unstagedFiles.length})</strong>
                  </text>
                </box>
                {unstagedFiles.map(file => {
                  const globalIdx = allFiles.indexOf(file)
                  const isSelected = globalIdx === fileIndex
                  const stats = getFileStats(file.path)
                  return (
                    <FileRow
                      key={`unstaged-${file.path}`}
                      file={file}
                      isSelected={isSelected}
                      isActive={file.path === diffview.selectedFile}
                      stats={stats}
                      colors={colors}
                    />
                  )
                })}
              </box>
            )}

            {/* Untracked files section */}
            {untrackedFiles.length > 0 && (
              <box flexDirection="column">
                <box height={1} paddingLeft={1} paddingRight={1}>
                  <text fg={colors.comment}>
                    <strong>Untracked ({untrackedFiles.length})</strong>
                  </text>
                </box>
                {untrackedFiles.map(file => {
                  const globalIdx = allFiles.indexOf(file)
                  const isSelected = globalIdx === fileIndex
                  return (
                    <FileRow
                      key={`untracked-${file.path}`}
                      file={file}
                      isSelected={isSelected}
                      isActive={file.path === diffview.selectedFile}
                      stats={undefined}
                      colors={colors}
                    />
                  )
                })}
              </box>
            )}

            {/* Branch info */}
            <box height={1} paddingLeft={1} paddingRight={1} marginTop={1}>
              <text fg={colors.primary}>{`\u2387 ${gitState.branch}`}</text>
              {gitState.ahead > 0 && <text fg={colors.success}>{` \u2191${gitState.ahead}`}</text>}
              {gitState.behind > 0 && <text fg={colors.error}>{` \u2193${gitState.behind}`}</text>}
            </box>

            {/* Commit message input — wrapped in box with its own keyDown handler */}
            <scrollbox paddingLeft={1} paddingRight={1} marginTop={1} flexDirection="column" height={2} focused={focusArea === "commitInput"} onKeyDown={handleCommitKeyDown}>
              <input
                value={commitMsg}
                onChange={(val: string) => {
                  setCommitMsg(val)
                  store.dispatch({ type: "SET_DIFFVIEW_COMMIT_MESSAGE", message: val })
                }}
                placeholder="Commit message..."
                focused={focusArea === "commitInput"}
                backgroundColor={colors.background}
                textColor={colors.foreground}
                placeholderColor={colors.comment}
              />
            </scrollbox>

            {/* Commit button hint */}
            <box height={1} paddingLeft={1} paddingRight={1} marginTop={1}>
              {stagedFiles.length > 0 ? (
                <text fg={colors.primary}>
                  <strong>[Enter] Commit Staged</strong>
                </text>
              ) : (
                <text fg={colors.comment}>[Enter] Commit (nothing staged)</text>
              )}
            </box>

            {/* Last commit preview */}
            {lastCommit && (
              <box height={1} paddingLeft={1} paddingRight={1} marginTop={1}>
                <text fg={colors.comment}>{lastCommit.length > sidebarWidth - 4 ? lastCommit.slice(0, sidebarWidth - 7) + "..." : lastCommit}</text>
              </box>
            )}
          </box>
        </scrollbox>
      </box>
    </box>
  )
}

function FileRow({
  file,
  isSelected,
  isActive,
  stats,
  colors,
}: {
  file: ChangedFile
  isSelected: boolean
  isActive: boolean
  stats: { additions: number; deletions: number } | undefined
  colors: ThemeColors
}) {
  const name = basename(file.path)
  const fileIcon = getFileIcon(name)
  const statusChar = STATUS_ICON[file.status] ?? "?"
  const statusColor =
    file.status === "added" || file.status === "untracked" ? colors.success
    : file.status === "deleted" ? colors.error
    : colors.warning
  const bg = isSelected ? colors.selection : colors.background

  return (
    <box height={1} backgroundColor={bg} flexDirection="row" paddingLeft={1} paddingRight={1}>
      <text fg={statusColor} bg={bg}>{statusChar} </text>
      <text fg={fileIcon.color} bg={bg}>{`${fileIcon.icon} `}</text>
      <text fg={isActive ? colors.primary : colors.foreground} bg={bg}>{name}</text>
      {stats && (
        <>
          {stats.additions > 0 && <text fg={colors.success} bg={bg}>{` +${stats.additions}`}</text>}
          {stats.deletions > 0 && <text fg={colors.error} bg={bg}>{` -${stats.deletions}`}</text>}
        </>
      )}
    </box>
  )
}
