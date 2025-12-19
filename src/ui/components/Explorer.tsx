/**
 * Explorer Component - File tree sidebar
 * 
 * Features:
 * - Nerd Font icons for files and folders
 * - Tree lines (├──, └──) for hierarchy visualization
 * - Color coding by file type
 * - Click to expand/collapse folders
 * - Click to open files
 * - Lazy loading of directory contents
 */

import type { DirectoryTree, Theme } from "../../domain/types.ts"
import { store } from "../../application/store.ts"
import { commandRegistry } from "../../application/commands.ts"
import { fileSystem } from "../../adapters/index.ts"
import { getFileIcon, getFolderIcon, folderColor } from "../../domain/fileIcons.ts"

interface ExplorerProps {
  width: number
  height: number
  directoryTree: DirectoryTree | null
  rootPath: string | null
  theme: Theme
  focused: boolean
}

export function Explorer({ width, height, directoryTree, rootPath, theme, focused }: ExplorerProps) {
  const { colors } = theme
  const borderColor = focused ? colors.primary : colors.border
  
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
      {/* Header */}
      <box height={1} backgroundColor={colors.lineHighlight} paddingLeft={1}>
        <text fg={colors.foreground}>
          <b>EXPLORER</b>
        </text>
      </box>
      
      {/* File Tree */}
      <scrollbox flexGrow={1} focused={focused}>
        {directoryTree ? (
          <TreeView 
            tree={directoryTree} 
            theme={theme}
            isRoot={true}
          />
        ) : rootPath ? (
          <text fg={colors.comment} paddingLeft={1}> Loading...</text>
        ) : (
          <text fg={colors.comment} paddingLeft={1}> No folder open</text>
        )}
      </scrollbox>
    </box>
  )
}

interface TreeViewProps {
  tree: DirectoryTree
  theme: Theme
  isRoot?: boolean
  prefix?: string
  isLast?: boolean
}

function TreeView({ tree, theme, isRoot = false, prefix = "", isLast = true }: TreeViewProps) {
  const { colors } = theme
  
  const isDirectory = tree.entry.type === "directory"
  const isExpanded = tree.isExpanded
  
  // Build the tree line prefix
  let itemPrefix = ""
  
  if (!isRoot) {
    itemPrefix = isLast ? "└── " : "├── "
  }
  
  // Get icon and color
  let icon: string
  let iconColor: string
  
  if (isDirectory) {
    icon = getFolderIcon(tree.entry.name, isExpanded)
    iconColor = folderColor
  } else {
    const fileIcon = getFileIcon(tree.entry.name)
    icon = fileIcon.icon
    iconColor = fileIcon.color
  }
  
  const handleClick = async () => {
    if (isDirectory) {
      // Toggle directory expansion
      store.dispatch({ type: "TOGGLE_DIRECTORY", path: tree.entry.path })
      
      // If expanding and no children loaded, load them
      if (!isExpanded && tree.children.length === 0) {
        try {
          const children = await fileSystem.listDirectory(tree.entry.path)
          // Update the tree with new children
          store.dispatch({ 
            type: "LOAD_DIRECTORY_CHILDREN", 
            path: tree.entry.path,
            children: children.map(entry => ({
              entry,
              children: [],
              isExpanded: false,
            }))
          } as any)
        } catch (error) {
          console.error("Failed to load directory:", error)
        }
      }
    } else {
      // Open file using command registry (this loads the content)
      await commandRegistry.execute("file.open", { args: [tree.entry.path] })
    }
  }
  
  const textColor = isDirectory ? folderColor : colors.foreground
  
  // Calculate child prefix for nested items
  const childPrefix = prefix + (isRoot ? "" : (isLast ? "    " : "│   "))
  
  return (
    <box flexDirection="column">
      {/* Current item */}
      <box flexDirection="row" onMouseDown={handleClick}>
        <text fg={colors.border}>{prefix}{itemPrefix}</text>
        <text fg={iconColor}>{icon} </text>
        <text fg={textColor}>{tree.entry.name}</text>
      </box>
      
      {/* Children (if directory and expanded) */}
      {isDirectory && isExpanded && tree.children.map((child, index) => {
        const isLastChild = index === tree.children.length - 1
        return (
          <TreeView
            key={child.entry.path}
            tree={child}
            theme={theme}
            prefix={childPrefix}
            isLast={isLastChild}
          />
        )
      })}
    </box>
  )
}
