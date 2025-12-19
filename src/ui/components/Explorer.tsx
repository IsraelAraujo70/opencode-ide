/**
 * Explorer Component - File tree sidebar
 */

import type { DirectoryTree, Theme } from "../../domain/types.ts"
import { store } from "../../application/store.ts"

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
      <box height={1} backgroundColor={colors.lineHighlight}>
        <text fg={colors.foreground}>
          <b> EXPLORER</b>
        </text>
      </box>
      
      {/* File Tree */}
      <scrollbox flexGrow={1} focused={focused}>
        {directoryTree ? (
          <TreeNode node={directoryTree} depth={0} theme={theme} />
        ) : rootPath ? (
          <text fg={colors.comment}> Loading...</text>
        ) : (
          <text fg={colors.comment}> No folder open</text>
        )}
      </scrollbox>
      
      {/* Help hint */}
      <box height={1}>
        <text fg={colors.comment}> :open &lt;path&gt;</text>
      </box>
    </box>
  )
}

interface TreeNodeProps {
  node: DirectoryTree
  depth: number
  theme: Theme
}

function TreeNode({ node, depth, theme }: TreeNodeProps) {
  const { colors } = theme
  const indent = "  ".repeat(depth)
  const isDirectory = node.entry.type === "directory"
  
  const icon = isDirectory 
    ? (node.isExpanded ? "▼ " : "▶ ")
    : "  "
  
  const fg = isDirectory ? colors.keyword : colors.foreground
  
  const handleClick = () => {
    if (isDirectory) {
      store.dispatch({ type: "TOGGLE_DIRECTORY", path: node.entry.path })
    } else {
      store.dispatch({ type: "OPEN_FILE", path: node.entry.path })
    }
  }
  
  return (
    <box flexDirection="column">
      <text
        fg={fg}
        onMouseDown={handleClick}
      >
        {indent}{icon}{node.entry.name}
      </text>
      
      {isDirectory && node.isExpanded && node.children.map((child) => (
        <TreeNode
          key={child.entry.path}
          node={child}
          depth={depth + 1}
          theme={theme}
        />
      ))}
    </box>
  )
}
