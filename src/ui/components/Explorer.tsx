/**
 * Explorer Component - File tree sidebar
 *
 * Features:
 * - Tree lines (├──, └──) for hierarchy visualization
 * - Color coding by file type
 * - Click to expand/collapse folders
 * - Click to open files
 * - Lazy loading of directory contents
 * - Keyboard navigation with arrows and Enter
 */

import { useEffect, useMemo, useState, useCallback } from "react"
import type { KeyEvent } from "@opentui/core"
import type { DirectoryTree, Theme, BufferState, GitState, GitFileChange } from "../../domain/types.ts"
import { store } from "../../application/store.ts"
import { commandRegistry } from "../../application/commands.ts"
import { fileSystem } from "../../adapters/index.ts"
import { getFileIcon, getFolderIcon, folderColor } from "../../domain/fileIcons.ts"
import { dirname, join, basename } from "node:path"

export type ExplorerTab = "file" | "bufs" | "git"

interface ExplorerProps {
  width: number
  height: number
  directoryTree: DirectoryTree | null
  rootPath: string | null
  theme: Theme
  focused: boolean
  buffers?: Map<string, BufferState>
  gitState?: GitState
  explorerTab?: ExplorerTab
}

interface FlatItem {
  tree: DirectoryTree
  depth: number
  isLast: boolean
  parentPrefixes: boolean[] // true = has more siblings, false = last child
  parentPath: string | null
}

interface VisibleItem extends FlatItem {
  isRoot: boolean
}

function flattenTree(
  tree: DirectoryTree,
  depth = 0,
  isLast = true,
  parentPrefixes: boolean[] = [],
  parentPath: string | null = null
): FlatItem[] {
  const items: FlatItem[] = []

  if (depth > 0) {
    items.push({ tree, depth, isLast, parentPrefixes, parentPath })
  }

  if (tree.entry.type === "directory" && tree.isExpanded) {
    const children = tree.children
    children.forEach((child, index) => {
      const childIsLast = index === children.length - 1
      const newPrefixes = depth === 0 ? [] : [...parentPrefixes, !isLast]
      items.push(...flattenTree(child, depth + 1, childIsLast, newPrefixes, tree.entry.path))
    })
  }

  return items
}

function buildPrefix(item: FlatItem): string {
  let prefix = ""

  for (const hasMoreSiblings of item.parentPrefixes) {
    prefix += hasMoreSiblings ? "│   " : "    "
  }

  prefix += item.isLast ? "└── " : "├── "

  return prefix
}

function normalizeKeyName(name: string): string {
  if (name === "return") return "enter"
  return name.toLowerCase()
}

export function Explorer({
  width,
  height,
  directoryTree,
  rootPath,
  theme,
  focused,
  buffers,
  gitState,
  explorerTab,
}: ExplorerProps) {
  const { colors } = theme
  const borderColor = focused ? colors.primary : colors.border
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ExplorerTab>(explorerTab ?? "file")

  // Sync with external explorerTab changes (e.g. Ctrl+Shift+G)
  useEffect(() => {
    if (explorerTab) setActiveTab(explorerTab)
  }, [explorerTab])
  const [gitSelectedIndex, setGitSelectedIndex] = useState(0)
  const [bufsSelectedIndex, setBufsSelectedIndex] = useState(0)

  const flatItems = useMemo(() => (directoryTree ? flattenTree(directoryTree) : []), [directoryTree])

  const visibleItems = useMemo((): VisibleItem[] => {
    if (!directoryTree) return []

    const rootItem: VisibleItem = {
      tree: directoryTree,
      depth: 0,
      isLast: true,
      parentPrefixes: [],
      parentPath: null,
      isRoot: true,
    }

    return [
      rootItem,
      ...flatItems.map(item => ({
        ...item,
        isRoot: false,
      })),
    ]
  }, [directoryTree, flatItems])

  useEffect(() => {
    if (!directoryTree) {
      setSelectedPath(null)
      return
    }

    const hasSelection = selectedPath
      ? visibleItems.some(item => item.tree.entry.path === selectedPath)
      : false

    if (!hasSelection) {
      setSelectedPath(directoryTree.entry.path)
    }
  }, [directoryTree, selectedPath, visibleItems])

  const openFile = async (path: string) => {
    await commandRegistry.execute("file.open", { args: [path] })
  }

  const loadDirectoryChildren = async (path: string): Promise<DirectoryTree[]> => {
    const children = await fileSystem.listDirectory(path)
    const mapped = children.map(entry => ({
      entry,
      children: [],
      isExpanded: false,
    }))

    store.dispatch({
      type: "LOAD_DIRECTORY_CHILDREN",
      path,
      children: mapped,
    })

    return mapped
  }

  const toggleDirectory = async (item: VisibleItem, selectFirstChild = false) => {
    if (item.tree.entry.type !== "directory") return

    const path = item.tree.entry.path
    const wasExpanded = item.tree.isExpanded

    store.dispatch({ type: "TOGGLE_DIRECTORY", path })

    if (!wasExpanded) {
      let children = item.tree.children

      if (children.length === 0) {
        try {
          children = await loadDirectoryChildren(path)
        } catch {
          children = []
        }
      }

      if (selectFirstChild && children.length > 0) {
        setSelectedPath(children[0]!.entry.path)
      }
    }
  }

  const activateItem = async (item: VisibleItem) => {
    if (item.tree.entry.type === "directory") {
      await toggleDirectory(item)
      return
    }

    await openFile(item.tree.entry.path)
  }

  // File operation states
  const [fileOp, setFileOp] = useState<{
    type: "create" | "rename" | "delete" | null
    path: string
    value: string
  }>({ type: null, path: "", value: "" })

  const getParentDir = (itemPath: string, itemType: string) => {
    return itemType === "directory" ? itemPath : dirname(itemPath)
  }

  const handleCreateFile = useCallback(async () => {
    if (!fileOp.value.trim() || fileOp.type !== "create") return
    const newPath = join(fileOp.path, fileOp.value.trim())
    try {
      if (fileOp.value.endsWith("/")) {
        await fileSystem.mkdir(newPath.replace(/\/$/, ""))
      } else {
        await fileSystem.writeFile(newPath, "")
      }
      // Refresh tree
      if (rootPath) {
        const tree = await fileSystem.buildTree(rootPath, 2)
        store.dispatch({ type: "SET_DIRECTORY_TREE", tree })
      }
      store.dispatch({
        type: "SHOW_NOTIFICATION",
        notification: {
          id: `create-${Date.now()}`,
          type: "success",
          message: `Created ${fileOp.value.trim()}`,
          timestamp: Date.now(),
        },
      })
    } catch (error) {
      store.dispatch({
        type: "SHOW_NOTIFICATION",
        notification: {
          id: `create-error-${Date.now()}`,
          type: "error",
          message: `Failed to create: ${error}`,
          timestamp: Date.now(),
        },
      })
    }
    setFileOp({ type: null, path: "", value: "" })
  }, [fileOp, rootPath])

  const handleRenameFile = useCallback(async () => {
    if (!fileOp.value.trim() || fileOp.type !== "rename") return
    const dir = dirname(fileOp.path)
    const newPath = join(dir, fileOp.value.trim())
    try {
      await fileSystem.rename(fileOp.path, newPath)
      if (rootPath) {
        const tree = await fileSystem.buildTree(rootPath, 2)
        store.dispatch({ type: "SET_DIRECTORY_TREE", tree })
      }
      store.dispatch({
        type: "SHOW_NOTIFICATION",
        notification: {
          id: `rename-${Date.now()}`,
          type: "success",
          message: `Renamed to ${fileOp.value.trim()}`,
          timestamp: Date.now(),
        },
      })
    } catch (error) {
      store.dispatch({
        type: "SHOW_NOTIFICATION",
        notification: {
          id: `rename-error-${Date.now()}`,
          type: "error",
          message: `Rename failed: ${error}`,
          timestamp: Date.now(),
        },
      })
    }
    setFileOp({ type: null, path: "", value: "" })
  }, [fileOp, rootPath])

  const handleDeleteFile = useCallback(async () => {
    try {
      await fileSystem.remove(fileOp.path)
      if (rootPath) {
        const tree = await fileSystem.buildTree(rootPath, 2)
        store.dispatch({ type: "SET_DIRECTORY_TREE", tree })
      }
      store.dispatch({
        type: "SHOW_NOTIFICATION",
        notification: {
          id: `delete-${Date.now()}`,
          type: "success",
          message: `Deleted ${fileOp.path.split("/").pop()}`,
          timestamp: Date.now(),
        },
      })
    } catch (error) {
      store.dispatch({
        type: "SHOW_NOTIFICATION",
        notification: {
          id: `delete-error-${Date.now()}`,
          type: "error",
          message: `Delete failed: ${error}`,
          timestamp: Date.now(),
        },
      })
    }
    setFileOp({ type: null, path: "", value: "" })
  }, [fileOp, rootPath])

  const moveSelection = (delta: number) => {
    if (visibleItems.length === 0) return

    const currentIndex = selectedPath
      ? visibleItems.findIndex(item => item.tree.entry.path === selectedPath)
      : -1

    const startIndex = currentIndex === -1 ? 0 : currentIndex
    const nextIndex = Math.max(0, Math.min(visibleItems.length - 1, startIndex + delta))
    const next = visibleItems[nextIndex]

    if (next) {
      setSelectedPath(next.tree.entry.path)
    }
  }

  // Build git changed files list
  const gitFiles = useMemo(() => {
    if (!gitState?.isRepo) return []
    const files: { path: string; status: string; section: "staged" | "unstaged" | "untracked" }[] = []
    for (const f of gitState.staged) files.push({ path: f.path, status: f.status, section: "staged" })
    for (const f of gitState.unstaged) files.push({ path: f.path, status: f.status, section: "unstaged" })
    for (const p of gitState.untracked) files.push({ path: p, status: "untracked", section: "untracked" })
    return files
  }, [gitState])

  // Build open buffers list
  const openBuffers = useMemo(() => {
    if (!buffers) return []
    return Array.from(buffers.values()).filter(b => b.filePath)
  }, [buffers])

  const handleKeyDown = (key: KeyEvent) => {
    if (!focused) return

    const keyName = normalizeKeyName(key.name)

    // Tab switching: 1/2/3 or [/]
    const switchToTab = (tab: ExplorerTab) => {
      key.preventDefault?.()
      setActiveTab(tab)
      store.dispatch({ type: "SET_EXPLORER_TAB", tab })
    }
    if (key.sequence === "1") { switchToTab("file"); return }
    if (key.sequence === "2") { switchToTab("bufs"); return }
    if (key.sequence === "3") { switchToTab("git"); return }
    if (key.sequence === "[") {
      const tabs: ExplorerTab[] = ["file", "bufs", "git"]
      switchToTab(tabs[(tabs.indexOf(activeTab) - 1 + 3) % 3]!)
      return
    }
    if (key.sequence === "]") {
      const tabs: ExplorerTab[] = ["file", "bufs", "git"]
      switchToTab(tabs[(tabs.indexOf(activeTab) + 1) % 3]!)
      return
    }

    // Bufs tab navigation
    if (activeTab === "bufs") {
      if (keyName === "down" || key.sequence === "j") {
        key.preventDefault?.()
        setBufsSelectedIndex(i => Math.min(i + 1, openBuffers.length - 1))
        return
      }
      if (keyName === "up" || key.sequence === "k") {
        key.preventDefault?.()
        setBufsSelectedIndex(i => Math.max(i - 1, 0))
        return
      }
      if (keyName === "enter") {
        key.preventDefault?.()
        const buf = openBuffers[bufsSelectedIndex]
        if (buf?.filePath) void commandRegistry.execute("file.open", { args: [buf.filePath] })
        return
      }
      return
    }

    // Git tab navigation
    if (activeTab === "git") {
      if (keyName === "down" || key.sequence === "j") {
        key.preventDefault?.()
        setGitSelectedIndex(i => Math.min(i + 1, gitFiles.length - 1))
        return
      }
      if (keyName === "up" || key.sequence === "k") {
        key.preventDefault?.()
        setGitSelectedIndex(i => Math.max(i - 1, 0))
        return
      }
      if (keyName === "enter") {
        key.preventDefault?.()
        const file = gitFiles[gitSelectedIndex]
        if (file) void commandRegistry.execute("file.open", { args: [rootPath ? `${rootPath}/${file.path}` : file.path] })
        return
      }
      // s = stage, u = unstage
      if (key.sequence === "s" && rootPath) {
        const file = gitFiles[gitSelectedIndex]
        if (file && file.section !== "staged") {
          import("../../adapters/index.ts").then(({ git }) =>
            git.stage(rootPath, [file.path]).then(() =>
              import("../../application/git-runtime.ts").then(m => m.refreshGitStatus())
            )
          )
        }
        return
      }
      if (key.sequence === "u" && rootPath) {
        const file = gitFiles[gitSelectedIndex]
        if (file && file.section === "staged") {
          import("../../adapters/index.ts").then(({ git }) =>
            git.unstage(rootPath, [file.path]).then(() =>
              import("../../application/git-runtime.ts").then(m => m.refreshGitStatus())
            )
          )
        }
        return
      }
      return
    }

    // File tab — original behavior
    if (visibleItems.length === 0) return

    const selected = selectedPath
      ? visibleItems.find(item => item.tree.entry.path === selectedPath) ?? null
      : null

    if (!selected) return

    const selectedIndex = visibleItems.findIndex(item => item.tree.entry.path === selected.tree.entry.path)
    switch (keyName) {
      case "down":
        key.preventDefault?.()
        moveSelection(1)
        return

      case "up":
        key.preventDefault?.()
        moveSelection(-1)
        return

      case "pageup":
        key.preventDefault?.()
        moveSelection(-10)
        return

      case "pagedown":
        key.preventDefault?.()
        moveSelection(10)
        return

      case "home": {
        key.preventDefault?.()
        const first = visibleItems[0]
        if (first) {
          setSelectedPath(first.tree.entry.path)
        }
        return
      }

      case "end": {
        key.preventDefault?.()
        const last = visibleItems[visibleItems.length - 1]
        if (last) {
          setSelectedPath(last.tree.entry.path)
        }
        return
      }

      case "right":
        key.preventDefault?.()
        if (selected.tree.entry.type === "directory") {
          if (!selected.tree.isExpanded) {
            void toggleDirectory(selected)
          } else {
            const child = visibleItems[selectedIndex + 1]
            if (child && child.parentPath === selected.tree.entry.path) {
              setSelectedPath(child.tree.entry.path)
            }
          }
        } else {
          void openFile(selected.tree.entry.path)
        }
        return

      case "left":
        key.preventDefault?.()
        if (selected.tree.entry.type === "directory" && selected.tree.isExpanded) {
          void toggleDirectory(selected)
        } else if (selected.parentPath) {
          setSelectedPath(selected.parentPath)
        }
        return

      case "enter":
        key.preventDefault?.()
        if (fileOp.type === "create") {
          void handleCreateFile()
        } else if (fileOp.type === "rename") {
          void handleRenameFile()
        } else if (fileOp.type === "delete") {
          void handleDeleteFile()
        } else {
          void activateItem(selected)
        }
        return

      default:
        break
    }

    // File operations (only when no operation is in progress)
    if (!fileOp.type) {
      if (key.sequence === "a") {
        key.preventDefault?.()
        const parentDir = getParentDir(selected.tree.entry.path, selected.tree.entry.type)
        setFileOp({ type: "create", path: parentDir, value: "" })
        return
      }
      if (key.sequence === "r" && !selected.isRoot) {
        key.preventDefault?.()
        const name = selected.tree.entry.name
        setFileOp({ type: "rename", path: selected.tree.entry.path, value: name })
        return
      }
      if (key.sequence === "d" && !selected.isRoot) {
        key.preventDefault?.()
        setFileOp({ type: "delete", path: selected.tree.entry.path, value: "" })
        return
      }
    }

    // Cancel file operation on Escape
    if (keyName === "escape" && fileOp.type) {
      key.preventDefault?.()
      setFileOp({ type: null, path: "", value: "" })
      return
    }
  }

  return (
    <box
      width={width}
      height={height}
      backgroundColor={colors.background}
      borderStyle="single"
      border={["right"]}
      borderColor={borderColor}
      flexDirection="column"
    >
      {/* Tab bar - Neo-tree style: File | Bufs | Git */}
      <box height={1} backgroundColor={colors.lineHighlight} flexDirection="row">
        {(["file", "bufs", "git"] as const).map((tab, i) => {
          const active = activeTab === tab
          const label = tab === "file" ? " File" : tab === "bufs" ? " Bufs" : " Git"
          const switchTab = () => {
            setActiveTab(tab)
            store.dispatch({ type: "SET_EXPLORER_TAB", tab })
          }
          return (
            <box key={tab} onMouseDown={switchTab}>
              <text
                fg={active ? colors.foreground : colors.comment}
                bg={active ? colors.background : colors.lineHighlight}
              >
                {i > 0 ? "│" : " "}
              </text>
              <text
                fg={active ? colors.foreground : colors.comment}
                bg={active ? colors.background : colors.lineHighlight}
              >
                {`${label} `}
              </text>
            </box>
          )
        })}
      </box>

      {/* File Operation Input */}
      {fileOp.type && (
        <box height={1} paddingX={1} backgroundColor={colors.selection}>
          {fileOp.type === "delete" ? (
            <text fg={colors.error}>
              {`Delete ${fileOp.path.split("/").pop()}? [Enter/Esc]`}
            </text>
          ) : (
            <box flexDirection="row">
              <text fg={fileOp.type === "create" ? colors.success : colors.warning}>
                {fileOp.type === "create" ? " " : " "}
              </text>
              <input
                value={fileOp.value}
                placeholder={fileOp.type === "create" ? "filename (/ for dir)" : "new name"}
                focused={true}
                width={width - 6}
                backgroundColor={colors.selection}
                textColor={colors.foreground}
                cursorColor={colors.primary}
                placeholderColor={colors.comment}
                onInput={(val: string) => setFileOp({ ...fileOp, value: val })}
              />
            </box>
          )}
        </box>
      )}

      {/* Sub-header with context */}
      <box height={1} paddingX={1} backgroundColor={colors.background}>
        <text fg={colors.accent}>
          {activeTab === "file" && rootPath
            ? `${rootPath.split("/").pop()}/`
            : activeTab === "bufs"
              ? `OPEN BUFFERS (${openBuffers.length})`
              : activeTab === "git" && gitState?.isRepo
                ? `GIT STATUS  ${gitState.branch}`
                : activeTab === "git"
                  ? "Not a git repo"
                  : ""}
        </text>
      </box>

      {/* Content area */}
      <scrollbox flexGrow={1} focused={focused} onKeyDown={handleKeyDown}>
        {/* File tab */}
        {activeTab === "file" && (
          directoryTree ? (
            <box flexDirection="column">
              {visibleItems.map(item => (
                <TreeItem
                  key={item.tree.entry.path}
                  name={item.tree.entry.name}
                  isDirectory={item.tree.entry.type === "directory"}
                  isExpanded={item.tree.isExpanded}
                  prefix={item.isRoot ? "" : buildPrefix(item)}
                  isRoot={item.isRoot}
                  isSelected={item.tree.entry.path === selectedPath}
                  theme={theme}
                  onSelect={() => setSelectedPath(item.tree.entry.path)}
                  onActivate={() => {
                    void activateItem(item)
                  }}
                />
              ))}
            </box>
          ) : (
            <text fg={colors.comment} paddingLeft={1}>
              {rootPath ? " Loading..." : " No folder open"}
            </text>
          )
        )}

        {/* Bufs tab - open buffers grouped by directory */}
        {activeTab === "bufs" && (
          <box flexDirection="column">
            {openBuffers.length === 0 ? (
              <text fg={colors.comment} paddingLeft={2}>No open buffers</text>
            ) : (
              openBuffers.map((buf, idx) => {
                const isSelected = idx === bufsSelectedIndex
                const name = buf.filePath ? basename(buf.filePath) : "Untitled"
                const dir = buf.filePath ? dirname(buf.filePath).split("/").pop() : ""
                const fileIcon = buf.filePath ? getFileIcon(name) : { icon: "○", color: colors.comment }
                const openBuf = () => {
                  if (buf.filePath) commandRegistry.execute("file.open", { args: [buf.filePath] })
                }
                return (
                  <box key={buf.id} height={1} paddingX={2}
                    backgroundColor={isSelected ? colors.selection : undefined}
                    onMouseDown={openBuf}>
                    <text fg={fileIcon.color}>{`${fileIcon.icon} `}</text>
                    <text fg={colors.foreground}>{name}</text>
                    {buf.isDirty && <text fg={colors.warning}>{" ●"}</text>}
                    <text fg={colors.comment}>{` ${dir}`}</text>
                  </box>
                )
              })
            )}
          </box>
        )}

        {/* Git tab - tree of changed files grouped by directory */}
        {activeTab === "git" && (
          <GitTreeView
            gitFiles={gitFiles}
            selectedIndex={gitSelectedIndex}
            theme={theme}
            rootPath={rootPath}
          />
        )}
      </scrollbox>
    </box>
  )
}

interface TreeItemProps {
  name: string
  isDirectory: boolean
  isExpanded: boolean
  prefix: string
  isRoot: boolean
  isSelected: boolean
  theme: Theme
  onSelect: () => void
  onActivate: () => void
}

function TreeItem({
  name,
  isDirectory,
  isExpanded,
  prefix,
  isRoot,
  isSelected,
  theme,
  onSelect,
  onActivate,
}: TreeItemProps) {
  const { colors } = theme

  let icon: string
  let iconColor: string

  if (isDirectory) {
    icon = getFolderIcon(name, isExpanded)
    iconColor = folderColor
  } else {
    const fileIcon = getFileIcon(name)
    icon = fileIcon.icon
    iconColor = fileIcon.color
  }

  const textColor = isDirectory ? folderColor : colors.foreground
  const bg = isSelected ? colors.selection : colors.background

  const handleMouseDown = () => {
    onSelect()
    onActivate()
  }

  if (isRoot) {
    return (
      <box flexDirection="row" backgroundColor={bg} onMouseDown={handleMouseDown}>
        <text fg={iconColor} bg={bg}>
          {icon}{" "}
        </text>
        <text fg={textColor} bg={bg}>
          {name}
        </text>
      </box>
    )
  }

  return (
    <box flexDirection="row" backgroundColor={bg} onMouseDown={handleMouseDown}>
      <text fg={colors.border} bg={bg}>
        {prefix}
      </text>
      <text fg={iconColor} bg={bg}>
        {icon}{" "}
      </text>
      <text fg={textColor} bg={bg}>
        {name}
      </text>
    </box>
  )
}

// ============================================================================
// Git Tree View - shows changed files grouped by directory like neo-tree
// ============================================================================

interface GitTreeViewProps {
  gitFiles: { path: string; status: string; section: "staged" | "unstaged" | "untracked" }[]
  selectedIndex: number
  theme: Theme
  rootPath: string | null
}

function GitTreeView({ gitFiles, selectedIndex, theme, rootPath }: GitTreeViewProps) {
  const { colors } = theme

  if (gitFiles.length === 0) {
    return <text fg={colors.comment} paddingLeft={2}>Working tree clean</text>
  }

  // Group files by directory, building a tree
  const dirs = new Map<string, typeof gitFiles>()
  for (const file of gitFiles) {
    const dir = dirname(file.path)
    if (!dirs.has(dir)) dirs.set(dir, [])
    dirs.get(dir)!.push(file)
  }

  // Sort directories
  const sortedDirs = Array.from(dirs.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  // Build flat render list for tracking selectedIndex
  let flatIndex = 0

  return (
    <box flexDirection="column">
      {sortedDirs.map(([dir, files]) => {
        const dirParts = dir.split("/")
        const indent = "  "

        return (
          <box key={dir} flexDirection="column">
            {/* Directory header */}
            <box height={1}>
              <text fg={folderColor}>
                {`${indent} ${dirParts[dirParts.length - 1] ?? dir}`}
              </text>
            </box>
            {/* Files in this directory */}
            {files.map((file) => {
              const currentFlatIndex = flatIndex++
              const isSelected = currentFlatIndex === selectedIndex
              const name = basename(file.path)
              const fileIcon = getFileIcon(name)

              const statusChar =
                file.status === "modified" ? "M"
                : file.status === "added" ? "A"
                : file.status === "deleted" ? "D"
                : file.status === "renamed" ? "R"
                : "?"

              const statusColor =
                file.status === "added" || file.status === "untracked" ? colors.success
                : file.status === "deleted" ? colors.error
                : colors.warning

              const bg = isSelected ? colors.selection : colors.background

              const openFile = () => {
                const fullPath = rootPath ? `${rootPath}/${file.path}` : file.path
                commandRegistry.execute("file.open", { args: [fullPath] })
              }

              return (
                <box key={`${file.section}-${file.path}`} height={1} backgroundColor={bg}
                  flexDirection="row" onMouseDown={openFile}>
                  <text fg={colors.border} bg={bg}>{"    "}</text>
                  <text fg={fileIcon.color} bg={bg}>{`${fileIcon.icon} `}</text>
                  <text fg={colors.foreground} bg={bg}>{name}</text>
                  <text fg={statusColor} bg={bg}>{` ${statusChar}`}</text>
                  {file.section === "staged" && (
                    <text fg={colors.success} bg={bg}>{" ✓"}</text>
                  )}
                </box>
              )
            })}
          </box>
        )
      })}
    </box>
  )
}
