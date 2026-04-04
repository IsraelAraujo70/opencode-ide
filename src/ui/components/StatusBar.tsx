/**
 * StatusBar Component - Bottom status bar showing file info, cursor position, etc.
 */

import type { Theme, BufferState, FocusTarget, EditorMode, Diagnostic, GitState } from "../../domain/types.ts"

interface StatusBarProps {
  theme: Theme
  width: number
  buffer: BufferState | null
  diagnostics: Diagnostic[]
  focusTarget: FocusTarget
  editorMode: EditorMode
  gitState?: GitState
}

export function StatusBar({
  theme,
  width,
  buffer,
  diagnostics,
  focusTarget,
  editorMode,
  gitState,
}: StatusBarProps) {
  const { colors } = theme

  const fileName = buffer?.filePath ? buffer.filePath.split("/").pop() : buffer ? "Untitled" : "No file"
  const modified = buffer?.isDirty ? " [+]" : ""
  const language = buffer?.language ?? "plaintext"

  const cursorInfo = buffer
    ? `Ln ${buffer.cursorPosition.line + 1}, Col ${buffer.cursorPosition.column + 1}`
    : ""

  const mode = getModeLabel(focusTarget, editorMode)
  const modeColor = getModeColor(theme, focusTarget, editorMode)
  const diagnosticSummary = getDiagnosticSummary(diagnostics)
  const diagnosticBadges = buildDiagnosticBadges(theme, diagnosticSummary)

  // Git info
  let gitInfo = ""
  if (gitState?.isRepo && gitState.branch) {
    gitInfo = `  ${gitState.branch}`
    if (gitState.ahead > 0) gitInfo += ` ↑${gitState.ahead}`
    if (gitState.behind > 0) gitInfo += ` ↓${gitState.behind}`
    const changes = gitState.staged.length + gitState.unstaged.length + gitState.untracked.length
    if (changes > 0) gitInfo += ` ~${changes}`
  }

  const rightContent = cursorInfo ? `${language} | ${cursorInfo} ` : `${language} `
  const badgesWidth = diagnosticBadges.reduce((total, badge) => total + badge.label.length, 0)

  const modeTag = ` ${mode} `
  const leftMain = ` ${fileName}${modified}`
  const middleSpaces = Math.max(
    1,
    width - modeTag.length - leftMain.length - gitInfo.length - badgesWidth - rightContent.length
  )

  return (
    <box height={1} width={width} backgroundColor={colors.lineHighlight} flexDirection="row">
      <text fg={colors.background} bg={modeColor}>
        {modeTag}
      </text>
      <text fg={colors.foreground} bg={colors.lineHighlight}>
        {leftMain}
      </text>
      {gitInfo && (
        <text fg={colors.accent} bg={colors.lineHighlight}>
          {gitInfo}
        </text>
      )}
      <text fg={colors.foreground} bg={colors.lineHighlight}>
        {" ".repeat(middleSpaces)}
      </text>
      {diagnosticBadges.map(badge => (
        <text key={badge.label} fg={colors.background} bg={badge.color}>
          {badge.label}
        </text>
      ))}
      <text fg={colors.foreground} bg={colors.lineHighlight}>
        {rightContent}
      </text>
    </box>
  )
}

interface DiagnosticSummary {
  errors: number
  warnings: number
  infos: number
  hints: number
}

interface DiagnosticBadge {
  label: string
  color: string
}

function getDiagnosticSummary(diagnostics: Diagnostic[]): DiagnosticSummary {
  let errors = 0
  let warnings = 0
  let infos = 0
  let hints = 0

  for (const diagnostic of diagnostics) {
    switch (diagnostic.severity) {
      case "error":
        errors += 1
        break
      case "warning":
        warnings += 1
        break
      case "info":
        infos += 1
        break
      case "hint":
        hints += 1
        break
      default:
        break
    }
  }

  return { errors, warnings, infos, hints }
}

function buildDiagnosticBadges(theme: Theme, summary: DiagnosticSummary): DiagnosticBadge[] {
  const badges: DiagnosticBadge[] = []
  const { colors } = theme

  if (summary.errors > 0) {
    badges.push({ label: ` E${summary.errors} `, color: colors.error })
  }
  if (summary.warnings > 0) {
    badges.push({ label: ` W${summary.warnings} `, color: colors.warning })
  }
  if (summary.infos > 0) {
    badges.push({ label: ` I${summary.infos} `, color: colors.info })
  }
  if (summary.hints > 0) {
    badges.push({ label: ` H${summary.hints} `, color: colors.accent })
  }

  return badges
}

function getModeLabel(focus: FocusTarget, editorMode: EditorMode): string {
  switch (focus) {
    case "editor":
      return editorMode === "insert" ? "INSERT" : "NORMAL"
    case "explorer":
      return "EXPLORER"
    case "terminal":
      return "TERMINAL"
    case "commandLine":
      return "COMMAND"
    case "palette":
      return "PALETTE"
    case "gitPanel":
      return "GIT"
    default:
      return "NORMAL"
  }
}

function getModeColor(theme: Theme, focus: FocusTarget, editorMode: EditorMode): string {
  const { colors } = theme

  if (focus === "editor") {
    return editorMode === "insert" ? colors.success : colors.primary
  }

  switch (focus) {
    case "explorer":
      return colors.primary
    case "terminal":
      return colors.warning
    case "commandLine":
      return colors.accent
    case "palette":
      return colors.secondary
    case "gitPanel":
      return colors.warning
    default:
      return colors.primary
  }
}
