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
import type {
  Theme,
  GitState,
  DiffviewState,
  DiffviewFocusArea,
  ThemeColors,
} from "../../domain/types.ts"
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

function getChangedFileKey(file: ChangedFile): string {
  return `${file.section}:${file.path}`
}

function detectLanguage(filePath: string): string | null {
  const ext = filePath.split(".").pop()?.toLowerCase()
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rs: "rust",
    go: "go",
    json: "json",
    md: "markdown",
    html: "html",
    css: "css",
    scss: "css",
    yaml: "yaml",
    yml: "yaml",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
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
  const [selectedFileKeyState, setSelectedFileKeyState] = useState("")
  const [commitMsg, setCommitMsg] = useState("")
  const [lastCommit, setLastCommit] = useState("")
  const [diffText, setDiffText] = useState("")
  const [isDiffLoading, setIsDiffLoading] = useState(false)
  const isMountedRef = useRef(true)
  const loadRequestRef = useRef(0)
  const colors = theme.colors
  const focusArea = diffview.focusArea === "commitInput" ? "commitInput" : "fileList"

  const allFiles = buildAllFiles(gitState)
  const stagedFiles = allFiles.filter(f => f.section === "staged")
  const unstagedFiles = allFiles.filter(f => f.section === "unstaged")
  const untrackedFiles = allFiles.filter(f => f.section === "untracked")
  const allFilesKey = allFiles.map(file => `${file.section}:${file.status}:${file.path}`).join("\n")
  const selectedIndex = allFiles.findIndex(file => getChangedFileKey(file) === selectedFileKeyState)
  const selectedFile = selectedIndex >= 0 ? allFiles[selectedIndex]! : null
  const selectedFileKey = selectedFile
    ? `${selectedFile.section}:${selectedFile.status}:${selectedFile.path}`
    : ""
  const selectedLanguage = selectedFile
    ? (detectLanguage(selectedFile.path) ?? undefined)
    : undefined

  const sidebarWidth = Math.max(22, Math.min(35, Math.floor(width * 0.22)))
  const diffAreaWidth = width - sidebarWidth

  const setFocus = useCallback((area: DiffviewFocusArea) => {
    store.dispatch({ type: "SET_DIFFVIEW_FOCUS_AREA", area })
  }, [])

  const notify = useCallback((type: "success" | "error", message: string) => {
    store.dispatch({
      type: "SHOW_NOTIFICATION",
      notification: { id: `diffview-${Date.now()}`, type, message, timestamp: Date.now() },
    })
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      loadRequestRef.current += 1
    }
  }, [])

  const loadDiffForFile = useCallback(
    async (file: ChangedFile, index: number) => {
      if (!rootPath) return
      const requestId = ++loadRequestRef.current
      const isActiveRequest = () => {
        return (
          requestId === loadRequestRef.current &&
          isMountedRef.current &&
          store.getState().diffview.isOpen
        )
      }
      const lang = detectLanguage(file.path)
      setIsDiffLoading(true)
      setDiffText("")

      // Get unified diff text for the <diff> component
      try {
        let diffOutput: string
        if (file.section === "staged") {
          diffOutput = await git.diffStaged(rootPath, file.path)
          if (!diffOutput && file.status === "modified") {
            diffOutput = await git.diff(rootPath, file.path)
          }
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
        if (isActiveRequest()) {
          setDiffText(diffOutput)
          setIsDiffLoading(false)
        }
      } catch {
        if (isActiveRequest()) {
          setDiffText("")
          setIsDiffLoading(false)
        }
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
        if (!isActiveRequest()) {
          return
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
        try {
          const newCode = await fileSystem.readFile(`${rootPath}/${file.path}`)
          if (!isActiveRequest()) {
            return
          }
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
    },
    [rootPath]
  )

  useEffect(() => {
    if (!diffview.isOpen) {
      loadRequestRef.current += 1
      setIsDiffLoading(false)
      setDiffText("")
      setSelectedFileKeyState("")
    }
  }, [diffview.isOpen])

  useEffect(() => {
    if (!diffview.isOpen) return
    if (diffview.focusArea === "diff") {
      setFocus("fileList")
    }
  }, [diffview.isOpen, diffview.focusArea, setFocus])

  // Auto-load first file + file stats on open
  useEffect(() => {
    if (!diffview.isOpen || !rootPath) return

    // Load file stats
    git
      .diffNumstat(rootPath)
      .then(stats => {
        store.dispatch({ type: "SET_DIFFVIEW_FILE_STATS", stats })
      })
      .catch(() => {})

    // Load last commit message
    git
      .log(rootPath, 1)
      .then(entries => {
        if (entries.length > 0) setLastCommit(entries[0]!.message)
      })
      .catch(() => {})
  }, [diffview.isOpen, rootPath])

  useEffect(() => {
    if (!diffview.isOpen) return

    if (allFiles.length === 0) {
      loadRequestRef.current += 1
      setSelectedFileKeyState("")
      setIsDiffLoading(false)
      setDiffText("")
      if (diffview.selectedFile || diffview.selectedIndex !== 0) {
        store.dispatch({
          type: "SET_DIFFVIEW_FILE",
          file: "",
          oldCode: "",
          newCode: "",
          language: null,
          index: 0,
        })
      }
      return
    }

    if (
      selectedFileKeyState &&
      allFiles.some(file => getChangedFileKey(file) === selectedFileKeyState)
    ) {
      return
    }

    if (diffview.selectedFile && allFiles.some(file => file.path === diffview.selectedFile)) {
      const indexedFile =
        allFiles[Math.min(Math.max(diffview.selectedIndex, 0), allFiles.length - 1)]
      const matchedFile =
        indexedFile?.path === diffview.selectedFile
          ? indexedFile
          : allFiles.find(file => file.path === diffview.selectedFile)
      if (matchedFile) {
        setSelectedFileKeyState(getChangedFileKey(matchedFile))
      }
      return
    }

    const fallbackIndex = Math.min(Math.max(diffview.selectedIndex, 0), allFiles.length - 1)
    const fallbackFile = allFiles[fallbackIndex] ?? allFiles[0]!
    const fallbackKey = getChangedFileKey(fallbackFile)
    if (fallbackFile.path && fallbackKey !== selectedFileKeyState) {
      setSelectedFileKeyState(fallbackKey)
    }
  }, [
    diffview.isOpen,
    diffview.selectedFile,
    diffview.selectedIndex,
    allFilesKey,
    selectedFileKeyState,
    allFiles.length,
  ])

  useEffect(() => {
    if (!diffview.isOpen || !rootPath || !selectedFile) return
    void loadDiffForFile(selectedFile, selectedIndex)
  }, [diffview.isOpen, rootPath, selectedFileKey, selectedIndex, loadDiffForFile])

  const refreshAfterGitOp = useCallback(async () => {
    const { refreshGitStatus } = await import("../../application/git-runtime.ts")
    refreshGitStatus()
    if (rootPath) {
      git
        .diffNumstat(rootPath)
        .then(stats => {
          store.dispatch({ type: "SET_DIFFVIEW_FILE_STATS", stats })
        })
        .catch(() => {})
    }
  }, [rootPath])

  const doStage = useCallback(
    async (file: ChangedFile) => {
      if (!rootPath || file.section === "staged") return
      try {
        await git.stage(rootPath, [file.path])
        await refreshAfterGitOp()
      } catch (error) {
        notify("error", `Stage failed: ${String(error)}`)
      }
    },
    [rootPath, refreshAfterGitOp, notify]
  )

  const doUnstage = useCallback(
    async (file: ChangedFile) => {
      if (!rootPath || file.section !== "staged") return
      try {
        await git.unstage(rootPath, [file.path])
        await refreshAfterGitOp()
      } catch (error) {
        notify("error", `Unstage failed: ${String(error)}`)
      }
    },
    [rootPath, refreshAfterGitOp, notify]
  )

  const doStageAll = useCallback(async () => {
    if (!rootPath) return
    const files = [...gitState.unstaged.map(f => f.path), ...gitState.untracked]
    if (files.length === 0) return
    try {
      await git.stage(rootPath, files)
      await refreshAfterGitOp()
    } catch (error) {
      notify("error", `Stage all failed: ${String(error)}`)
    }
  }, [rootPath, gitState, refreshAfterGitOp, notify])

  const doCommit = useCallback(async () => {
    if (!rootPath) return
    if (!commitMsg.trim()) {
      notify("error", "Commit message is empty")
      return
    }
    if (stagedFiles.length === 0) {
      notify("error", "Nothing staged to commit")
      return
    }

    try {
      await git.commit(rootPath, commitMsg.trim())
      setCommitMsg("")
      store.dispatch({ type: "SET_DIFFVIEW_COMMIT_MESSAGE", message: "" })
      await refreshAfterGitOp()
      git
        .log(rootPath, 1)
        .then(entries => {
          if (entries.length > 0) setLastCommit(entries[0]!.message)
        })
        .catch(() => {})
      setFocus("fileList")
      notify("success", `Committed: ${commitMsg.trim().slice(0, 40)}`)
    } catch (error) {
      notify("error", `Commit failed: ${String(error)}`)
    }
  }, [rootPath, commitMsg, stagedFiles.length, refreshAfterGitOp, setFocus, notify])

  // Main key handler — attached to the outermost focused box
  const handleKeyDown = useCallback(
    (event: KeyEvent) => {
      const key = event.name?.toLowerCase()
      const isPlainKey = (name: string) => {
        return key === name && !event.ctrl && !event.meta && !event.option && !event.shift
      }

      // Commit input mode
      if (focusArea === "commitInput") {
        if (key === "q" && !event.ctrl && !event.meta && !event.option && !event.shift) {
          event.preventDefault?.()
          store.dispatch({ type: "CLOSE_DIFFVIEW" })
          return
        }
        if (key === "escape") {
          event.preventDefault?.()
          setFocus("fileList")
          return
        }
        if (key === "tab") {
          event.preventDefault?.()
          setFocus("fileList")
          return
        }
        if (key === "enter" || key === "return") {
          event.preventDefault?.()
          void doCommit()
          return
        }
        return
      }

      // Global shortcuts (not in commitInput)
      if (isPlainKey("q") || key === "escape") {
        store.dispatch({ type: "CLOSE_DIFFVIEW" })
        return
      }

      if (key === "tab") {
        event.preventDefault?.()
        const order: DiffviewFocusArea[] = ["fileList", "commitInput"]
        const idx = order.indexOf(focusArea)
        setFocus(order[(idx + 1) % order.length]!)
        return
      }

      if (isPlainKey("c")) {
        event.preventDefault?.()
        setFocus("commitInput")
        return
      }

      // File list navigation
      if (focusArea === "fileList") {
        if (key === "down" || isPlainKey("j")) {
          event.preventDefault?.()
          const currentIndex = selectedIndex >= 0 ? selectedIndex : 0
          const newIdx = Math.min(currentIndex + 1, allFiles.length - 1)
          const file = allFiles[newIdx]
          if (file) {
            setSelectedFileKeyState(getChangedFileKey(file))
          }
          return
        }
        if (key === "up" || isPlainKey("k")) {
          event.preventDefault?.()
          const currentIndex = selectedIndex >= 0 ? selectedIndex : 0
          const newIdx = Math.max(currentIndex - 1, 0)
          const file = allFiles[newIdx]
          if (file) {
            setSelectedFileKeyState(getChangedFileKey(file))
          }
          return
        }
        if (isPlainKey("s") && !event.shift) {
          const file = selectedFile
          if (file) void doStage(file)
          return
        }
        if (isPlainKey("u")) {
          const file = selectedFile
          if (file) void doUnstage(file)
          return
        }
        if (key === "s" && !event.ctrl && !event.meta && !event.option && !!event.shift) {
          void doStageAll()
          return
        }
        if (key === "enter" || key === "return") {
          event.preventDefault?.()
          if (selectedFile) void loadDiffForFile(selectedFile, selectedIndex)
          return
        }
      }
    },
    [
      focusArea,
      selectedIndex,
      selectedFile,
      allFiles,
      doStage,
      doUnstage,
      doStageAll,
      doCommit,
      loadDiffForFile,
      setFocus,
    ]
  )

  const getFileStats = (filePath: string) => {
    return diffview.fileStats.find(s => s.file === filePath)
  }

  const toolbarHeight = 1
  const fileHeaderHeight = 1
  const mainHeight = height - toolbarHeight - fileHeaderHeight

  return (
    <box width={width} height={height} flexDirection="column" backgroundColor={colors.background}>
      {/* Toolbar */}
      <box
        height={toolbarHeight}
        backgroundColor={colors.lineHighlight}
        paddingLeft={1}
        paddingRight={1}
        flexDirection="row"
        gap={2}
      >
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
      <box
        height={fileHeaderHeight}
        backgroundColor={colors.background}
        paddingLeft={1}
        paddingRight={1}
        flexDirection="row"
      >
        {selectedFile ? (
          <>
            <text fg={colors.foreground}>
              <strong>{selectedFile.path}</strong>
            </text>
            <text fg={colors.comment}>{`  ${selectedFile.status}`}</text>
          </>
        ) : (
          <text fg={colors.comment}>No file selected</text>
        )}
      </box>

      {/* Main content: Diff (left) + Sidebar (right) */}
      <box flexDirection="row" height={mainHeight}>
        {/* Diff area */}
        <box width={diffAreaWidth} height={mainHeight} flexDirection="column">
          <box flexDirection="column">
            {diffText ? (
              <diff
                diff={diffText}
                view="split"
                filetype={selectedLanguage}
                showLineNumbers
                addedBg="#2d4f2d"
                removedBg="#4f2d2d"
              />
            ) : (
              <box flexGrow={1} justifyContent="center" alignItems="center">
                <text fg={colors.comment}>
                  {isDiffLoading
                    ? "Loading diff..."
                    : allFiles.length > 0
                      ? "No diff available"
                      : "No changes to display"}
                </text>
              </box>
            )}
          </box>
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
            <box
              height={1}
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={colors.lineHighlight}
              flexDirection="row"
            >
              <text fg={colors.accent}>
                <strong>
                  {allFiles.length} Change{allFiles.length !== 1 ? "s" : ""}
                </strong>
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
                  const isSelected = globalIdx === selectedIndex
                  const stats = getFileStats(file.path)
                  return (
                    <FileRow
                      key={`staged-${file.path}`}
                      file={file}
                      isSelected={isSelected}
                      isActive={getChangedFileKey(file) === selectedFileKeyState}
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
                  const isSelected = globalIdx === selectedIndex
                  const stats = getFileStats(file.path)
                  return (
                    <FileRow
                      key={`unstaged-${file.path}`}
                      file={file}
                      isSelected={isSelected}
                      isActive={getChangedFileKey(file) === selectedFileKeyState}
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
                  const isSelected = globalIdx === selectedIndex
                  return (
                    <FileRow
                      key={`untracked-${file.path}`}
                      file={file}
                      isSelected={isSelected}
                      isActive={getChangedFileKey(file) === selectedFileKeyState}
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
            <scrollbox
              paddingLeft={1}
              paddingRight={1}
              marginTop={1}
              flexDirection="column"
              height={2}
              focused={focusArea === "commitInput"}
              onKeyDown={handleKeyDown}
            >
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
                <text fg={colors.comment}>
                  {lastCommit.length > sidebarWidth - 4
                    ? lastCommit.slice(0, sidebarWidth - 7) + "..."
                    : lastCommit}
                </text>
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
    file.status === "added" || file.status === "untracked"
      ? colors.success
      : file.status === "deleted"
        ? colors.error
        : colors.warning
  const bg = isSelected ? colors.selection : colors.background

  return (
    <box height={1} backgroundColor={bg} flexDirection="row" paddingLeft={1} paddingRight={1}>
      <text fg={statusColor} bg={bg}>
        {statusChar}{" "}
      </text>
      <text fg={fileIcon.color} bg={bg}>{`${fileIcon.icon} `}</text>
      <text fg={isActive ? colors.primary : colors.foreground} bg={bg}>
        {name}
      </text>
      {stats && (
        <>
          {stats.additions > 0 && <text fg={colors.success} bg={bg}>{` +${stats.additions}`}</text>}
          {stats.deletions > 0 && <text fg={colors.error} bg={bg}>{` -${stats.deletions}`}</text>}
        </>
      )}
    </box>
  )
}
