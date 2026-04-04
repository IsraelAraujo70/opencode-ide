/**
 * GitPanel - Git source control panel (Ctrl+Shift+G)
 *
 * VS Code-inspired design with 3 tabs:
 *   Status  — staged/changes/untracked with interactive select lists
 *   Log     — git graph ASCII output
 *   Diff    — proper diff viewer with working/staged toggle
 *
 * Keyboard: s=stage u=unstage S=stageAll U=unstageAll
 *           c=commit d=diff p=push P=pull t=toggle diff mode
 *           1/2/3=switch tabs  Tab=cycle sections
 */

import { useState, useCallback, useEffect } from "react"
import type { KeyEvent } from "@opentui/core"
import type {
  Theme,
  GitState,
  GitPanelState,
} from "../../domain/types.ts"
import { store } from "../../application/store.ts"
import { git } from "../../adapters/index.ts"
import { refreshGitStatus } from "../../application/git-runtime.ts"
import { commandRegistry } from "../../application/commands.ts"
import { basename } from "node:path"

interface GitPanelProps {
  theme: Theme
  width: number
  height: number
  gitState: GitState
  gitPanel: GitPanelState
  focused: boolean
  rootPath: string | null
}

type Section = "staged" | "changes" | "untracked" | "commit"

const STATUS_ICON: Record<string, string> = {
  modified: "M",
  added: "A",
  deleted: "D",
  renamed: "R",
  copied: "C",
  untracked: "?",
}

export function GitPanel({
  theme,
  width,
  height,
  gitState,
  gitPanel,
  focused,
  rootPath,
}: GitPanelProps) {
  const [activeSection, setActiveSection] = useState<Section>("changes")
  const [selectedIndices, setSelectedIndices] = useState<Record<Section, number>>({
    staged: 0, changes: 0, untracked: 0, commit: 0,
  })
  const [commitMsg, setCommitMsg] = useState("")
  const colors = theme.colors

  // Load log+graph when switching to log tab
  useEffect(() => {
    if (gitPanel.activeTab === "log" && !gitPanel.logGraphOutput && rootPath) {
      commandRegistry.execute("git.showLog")
    }
  }, [gitPanel.activeTab, rootPath])

  const notify = (type: "success" | "error", message: string) => {
    store.dispatch({
      type: "SHOW_NOTIFICATION",
      notification: { id: `git-${Date.now()}`, type, message, timestamp: Date.now() },
    })
  }

  const doStage = useCallback(async (filePath: string) => {
    if (!rootPath) return
    await git.stage(rootPath, [filePath])
    refreshGitStatus()
  }, [rootPath])

  const doUnstage = useCallback(async (filePath: string) => {
    if (!rootPath) return
    await git.unstage(rootPath, [filePath])
    refreshGitStatus()
  }, [rootPath])

  const doCommit = useCallback(async () => {
    if (!rootPath || !commitMsg.trim()) return
    try {
      await git.commit(rootPath, commitMsg.trim())
      setCommitMsg("")
      setActiveSection("changes")
      refreshGitStatus()
      notify("success", `Committed: ${commitMsg.trim().slice(0, 40)}`)
    } catch (e) {
      notify("error", `Commit failed: ${e}`)
    }
  }, [rootPath, commitMsg])

  const doPush = useCallback(async () => {
    if (!rootPath) return
    store.dispatch({ type: "SET_GIT_LOADING", isLoading: true })
    try {
      await git.push(rootPath)
      refreshGitStatus()
      notify("success", "Push completed")
    } catch (e) {
      notify("error", `Push failed: ${e}`)
    } finally {
      store.dispatch({ type: "SET_GIT_LOADING", isLoading: false })
    }
  }, [rootPath])

  const doPull = useCallback(async () => {
    if (!rootPath) return
    store.dispatch({ type: "SET_GIT_LOADING", isLoading: true })
    try {
      await git.pull(rootPath)
      refreshGitStatus()
      notify("success", "Pull completed")
    } catch (e) {
      notify("error", `Pull failed: ${e}`)
    } finally {
      store.dispatch({ type: "SET_GIT_LOADING", isLoading: false })
    }
  }, [rootPath])

  const showDiffForFile = useCallback((filePath: string) => {
    store.dispatch({ type: "SET_GIT_PANEL_SELECTED_FILE", file: filePath })
    commandRegistry.execute("git.diff")
  }, [])

  // Cycle sections with Tab
  const cycleSections = () => {
    const order: Section[] = []
    if (gitState.staged.length > 0) order.push("staged")
    if (gitState.unstaged.length > 0) order.push("changes")
    if (gitState.untracked.length > 0) order.push("untracked")
    order.push("commit")
    const idx = order.indexOf(activeSection)
    setActiveSection(order[(idx + 1) % order.length]!)
  }

  const getFilesForSection = (s: Section) => {
    if (s === "staged") return gitState.staged.map(f => f.path)
    if (s === "changes") return gitState.unstaged.map(f => f.path)
    if (s === "untracked") return gitState.untracked
    return []
  }

  const getStatusForFile = (s: Section, filePath: string) => {
    if (s === "staged") return gitState.staged.find(f => f.path === filePath)?.status ?? "modified"
    if (s === "changes") return gitState.unstaged.find(f => f.path === filePath)?.status ?? "modified"
    return "untracked"
  }

  const handleKeyDown = (event: KeyEvent) => {
    if (!focused) return
    const key = event.name?.toLowerCase()
    const seq = event.sequence

    // Tab switching
    if (seq === "1") { store.dispatch({ type: "SET_GIT_PANEL_TAB", tab: "status" }); return }
    if (seq === "2") { store.dispatch({ type: "SET_GIT_PANEL_TAB", tab: "log" }); return }
    if (seq === "3") { store.dispatch({ type: "SET_GIT_PANEL_TAB", tab: "diff" }); return }
    if (key === "escape") { store.dispatch({ type: "CLOSE_GIT_PANEL" }); return }

    // Diff tab: t = toggle mode
    if (gitPanel.activeTab === "diff" && seq === "t") {
      const mode = gitPanel.diffMode === "working" ? "staged" : "working"
      store.dispatch({ type: "SET_GIT_DIFF_MODE", mode })
      return
    }

    // Status tab
    if (gitPanel.activeTab !== "status") return

    // Commit input mode
    if (activeSection === "commit") {
      if (key === "escape") { setActiveSection("changes"); return }
      if (key === "tab") { event.preventDefault?.(); cycleSections(); return }
      return
    }

    if (key === "tab") { event.preventDefault?.(); cycleSections(); return }

    const files = getFilesForSection(activeSection)
    const idx = selectedIndices[activeSection] ?? 0

    if (key === "down" || seq === "j") {
      event.preventDefault?.()
      setSelectedIndices(p => ({ ...p, [activeSection]: Math.min(idx + 1, files.length - 1) }))
      return
    }
    if (key === "up" || seq === "k") {
      event.preventDefault?.()
      setSelectedIndices(p => ({ ...p, [activeSection]: Math.max(idx - 1, 0) }))
      return
    }

    const selectedFile = files[idx]

    if (seq === "s" && selectedFile && activeSection !== "staged") {
      void doStage(selectedFile)
      return
    }
    if (seq === "u" && selectedFile && activeSection === "staged") {
      void doUnstage(selectedFile)
      return
    }
    if (seq === "S") { void commandRegistry.execute("git.stageAll"); return }
    if (seq === "U") { void commandRegistry.execute("git.unstageAll"); return }
    if (seq === "c") { setActiveSection("commit"); return }
    if (seq === "d" && selectedFile) { showDiffForFile(selectedFile); return }
    if (seq === "p") { void doPush(); return }
    if (seq === "P") { void doPull(); return }
    if ((key === "enter" || key === "return") && commitMsg.trim()) {
      void doCommit()
      return
    }
  }

  if (!gitState.isRepo) {
    return (
      <box width={width} height={height} backgroundColor={colors.background}
        borderStyle="single" border={["left"]} borderColor={colors.border}
        justifyContent="center" alignItems="center">
        <text fg={colors.comment}>Not a git repository</text>
      </box>
    )
  }

  return (
    <box width={width} height={height} flexDirection="column"
      backgroundColor={colors.background} borderStyle="single"
      border={["left"]} borderColor={focused ? colors.primary : colors.border}>

      {/* Header */}
      <box height={1} paddingX={1} flexDirection="row">
        <text fg={colors.primary} bg={colors.lineHighlight}>
          {" GIT "}
        </text>
        <text fg={colors.foreground}>{` ${gitState.branch}`}</text>
        {gitState.ahead > 0 && <text fg={colors.success}>{` ↑${gitState.ahead}`}</text>}
        {gitState.behind > 0 && <text fg={colors.warning}>{` ↓${gitState.behind}`}</text>}
        {gitState.isLoading && <text fg={colors.accent}>{" ..."}</text>}
      </box>

      {/* Tab bar */}
      <box height={1} paddingX={1} flexDirection="row"
        backgroundColor={colors.lineHighlight}>
        {(["status", "log", "diff"] as const).map((tab, i) => {
          const active = gitPanel.activeTab === tab
          return (
            <text
              key={tab}
              fg={active ? colors.background : colors.comment}
              bg={active ? colors.primary : colors.lineHighlight}
            >
              {` ${i + 1}:${tab.charAt(0).toUpperCase() + tab.slice(1)} `}
            </text>
          )
        })}
      </box>

      {/* Content */}
      <scrollbox
        height={height - (gitPanel.activeTab === "status" ? 5 : 3)}
        focused={focused && activeSection !== "commit"}
        onKeyDown={handleKeyDown}
      >
        {gitPanel.activeTab === "status" && (
          <StatusView
            gitState={gitState}
            activeSection={activeSection}
            selectedIndices={selectedIndices}
            colors={colors}
            width={width - 3}
          />
        )}
        {gitPanel.activeTab === "log" && (
          <LogView
            logGraph={gitPanel.logGraphOutput}
            entries={gitPanel.logEntries}
            colors={colors}
          />
        )}
        {gitPanel.activeTab === "diff" && (
          <DiffView
            diffContent={gitPanel.diffMode === "staged" ? gitPanel.stagedDiffContent : gitPanel.diffContent}
            selectedFile={gitPanel.selectedFile}
            diffMode={gitPanel.diffMode}
            colors={colors}
          />
        )}
      </scrollbox>

      {/* Commit area (status tab only) */}
      {gitPanel.activeTab === "status" && (
        <box flexDirection="column" borderStyle="single" border={["top"]} borderColor={colors.border}>
          <box height={1} paddingX={1}>
            <text fg={activeSection === "commit" ? colors.primary : colors.comment}>{">"} </text>
            <input
              value={commitMsg}
              placeholder="commit message"
              focused={focused && activeSection === "commit"}
              width={Math.max(10, width - 6)}
              backgroundColor={activeSection === "commit" ? colors.lineHighlight : colors.background}
              textColor={colors.foreground}
              focusedBackgroundColor={colors.lineHighlight}
              cursorColor={colors.primary}
              placeholderColor={colors.comment}
              onInput={setCommitMsg}
            />
          </box>
          <box height={1} paddingX={1} flexDirection="row">
            <text fg={colors.comment}>
              {"s:+  u:-  S:++  c:msg  d:diff  p:push  P:pull"}
            </text>
          </box>
        </box>
      )}
    </box>
  )
}

// ============================================================================
// Sub-views
// ============================================================================

interface StatusViewProps {
  gitState: GitState
  activeSection: Section
  selectedIndices: Record<Section, number>
  colors: Theme["colors"]
  width: number
}

function StatusView({ gitState, activeSection, selectedIndices, colors, width }: StatusViewProps) {
  const totalChanges = gitState.staged.length + gitState.unstaged.length + gitState.untracked.length

  if (totalChanges === 0) {
    return (
      <box paddingX={1} paddingY={1}>
        <text fg={colors.comment}>Working tree clean</text>
      </box>
    )
  }

  return (
    <box flexDirection="column">
      {gitState.staged.length > 0 && (
        <FileSection
          title={`Staged (${gitState.staged.length})`}
          files={gitState.staged.map(f => ({ path: f.path, status: f.status }))}
          isActive={activeSection === "staged"}
          selectedIndex={selectedIndices.staged ?? 0}
          titleColor={colors.success}
          colors={colors}
          width={width}
          prefix="✓"
        />
      )}
      {gitState.unstaged.length > 0 && (
        <FileSection
          title={`Changes (${gitState.unstaged.length})`}
          files={gitState.unstaged.map(f => ({ path: f.path, status: f.status }))}
          isActive={activeSection === "changes"}
          selectedIndex={selectedIndices.changes ?? 0}
          titleColor={colors.warning}
          colors={colors}
          width={width}
          prefix=" "
        />
      )}
      {gitState.untracked.length > 0 && (
        <FileSection
          title={`Untracked (${gitState.untracked.length})`}
          files={gitState.untracked.map(p => ({ path: p, status: "untracked" as const }))}
          isActive={activeSection === "untracked"}
          selectedIndex={selectedIndices.untracked ?? 0}
          titleColor={colors.accent}
          colors={colors}
          width={width}
          prefix=" "
        />
      )}
    </box>
  )
}

interface FileSectionProps {
  title: string
  files: { path: string; status: string }[]
  isActive: boolean
  selectedIndex: number
  titleColor: string
  colors: Theme["colors"]
  width: number
  prefix: string
}

function FileSection({ title, files, isActive, selectedIndex, titleColor, colors, width, prefix }: FileSectionProps) {
  return (
    <box flexDirection="column">
      {/* Section header */}
      <box height={1} paddingX={1}>
        <text fg={titleColor}>
          <strong>{isActive ? "▸ " : "  "}{title}</strong>
        </text>
      </box>
      {/* File list */}
      {files.map((file, idx) => {
        const isSelected = isActive && idx === selectedIndex
        const icon = STATUS_ICON[file.status] ?? "?"
        const statusColor =
          file.status === "added" || file.status === "untracked" ? colors.success
          : file.status === "deleted" ? colors.error
          : colors.warning

        return (
          <box key={file.path} height={1} paddingX={2}
            backgroundColor={isSelected ? colors.selection : undefined}>
            <text fg={statusColor}>{`${prefix}${icon} `}</text>
            <text fg={isSelected ? colors.foreground : colors.foreground}>
              {basename(file.path)}
            </text>
            <text fg={colors.comment}>{` ${file.path}`}</text>
          </box>
        )
      })}
    </box>
  )
}

interface LogViewProps {
  logGraph: string | null
  entries: import("../../domain/types.ts").GitLogEntry[]
  colors: Theme["colors"]
}

function LogView({ logGraph, entries, colors }: LogViewProps) {
  if (logGraph) {
    const lines = logGraph.split("\n")
    return (
      <box flexDirection="column" paddingX={1}>
        {lines.map((line, i) => {
          // Color the graph characters and hash
          let fg = colors.foreground
          if (line.match(/^[*|\\/ ]+[a-f0-9]{7,}/)) fg = colors.foreground
          const trimmed = line.trimStart()
          if (trimmed.startsWith("*")) fg = colors.warning

          return <text key={i} fg={fg}>{line}</text>
        })}
      </box>
    )
  }

  if (entries.length === 0) {
    return <text fg={colors.comment}>{"  Loading..."}</text>
  }

  return (
    <box flexDirection="column" paddingX={1}>
      {entries.map((entry) => (
        <box key={entry.hash} height={1} flexDirection="row">
          <text fg={colors.warning}>{entry.hash.slice(0, 7)} </text>
          <text fg={colors.foreground}>{entry.message.slice(0, 40)} </text>
          <text fg={colors.comment}>{entry.author}</text>
        </box>
      ))}
    </box>
  )
}

interface DiffViewProps {
  diffContent: string | null
  selectedFile: string | null
  diffMode: "working" | "staged"
  colors: Theme["colors"]
}

function DiffView({ diffContent, selectedFile, diffMode, colors }: DiffViewProps) {
  if (!diffContent) {
    return (
      <box paddingX={1} paddingY={1}>
        <text fg={colors.comment}>
          {selectedFile ? "No diff content" : "Select a file and press 'd' to view diff"}
        </text>
      </box>
    )
  }

  return (
    <box flexDirection="column">
      {/* Diff header */}
      <box height={1} paddingX={1} backgroundColor={colors.lineHighlight}>
        <text fg={colors.foreground}>
          {selectedFile ? basename(selectedFile) : "Diff"}
        </text>
        <text fg={colors.accent}>
          {` [${diffMode === "staged" ? "Staged" : "Working"}] `}
        </text>
        <text fg={colors.comment}>{"t:toggle"}</text>
      </box>
      {/* Diff lines */}
      <box flexDirection="column" paddingX={1}>
        {diffContent.split("\n").map((line, i) => {
          let fg = colors.foreground
          if (line.startsWith("+") && !line.startsWith("+++")) fg = colors.success
          else if (line.startsWith("-") && !line.startsWith("---")) fg = colors.error
          else if (line.startsWith("@@")) fg = colors.accent
          else if (line.startsWith("diff ") || line.startsWith("index ")) fg = colors.comment

          return <text key={i} fg={fg}>{line}</text>
        })}
      </box>
    </box>
  )
}

// Re-export for sub-component props
type Theme = import("../../domain/types.ts").Theme
