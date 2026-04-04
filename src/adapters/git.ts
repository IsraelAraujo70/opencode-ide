/**
 * Git Adapter
 *
 * Wraps the git CLI via Bun.spawn to provide git operations.
 */

import type { GitPort } from "../ports/index.ts"
import type { GitState, GitFileChange, GitFileStatus, GitLogEntry, GitBlameLine } from "../domain/types.ts"

export class BunGitAdapter implements GitPort {
  private async run(args: string[], cwd: string): Promise<string> {
    const proc = Bun.spawn(["git", ...args], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    })
    const output = await new Response(proc.stdout).text()
    const exitCode = await proc.exited
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text()
      throw new Error(`git ${args[0]} failed: ${stderr.trim()}`)
    }
    return output.trim()
  }

  async isRepo(path: string): Promise<boolean> {
    try {
      await this.run(["rev-parse", "--is-inside-work-tree"], path)
      return true
    } catch {
      return false
    }
  }

  async status(path: string): Promise<GitState> {
    const isRepo = await this.isRepo(path)
    if (!isRepo) {
      return {
        isRepo: false,
        branch: "",
        ahead: 0,
        behind: 0,
        staged: [],
        unstaged: [],
        untracked: [],
        isLoading: false,
      }
    }

    // Get branch info
    let branch = ""
    let ahead = 0
    let behind = 0
    try {
      branch = await this.run(["branch", "--show-current"], path)
      const trackingOutput = await this.run(
        ["rev-list", "--left-right", "--count", `HEAD...@{upstream}`],
        path
      )
      const parts = trackingOutput.split("\t")
      ahead = parseInt(parts[0] ?? "0", 10)
      behind = parseInt(parts[1] ?? "0", 10)
    } catch {
      // No tracking branch or detached HEAD
    }

    // Get status
    const statusOutput = await this.run(["status", "--porcelain=v1"], path)
    const staged: GitFileChange[] = []
    const unstaged: GitFileChange[] = []
    const untracked: string[] = []

    for (const line of statusOutput.split("\n")) {
      if (!line) continue
      const indexStatus = line[0]!
      const workStatus = line[1]!
      const filePath = line.slice(3).trim()

      // Untracked
      if (indexStatus === "?" && workStatus === "?") {
        untracked.push(filePath)
        continue
      }

      // Staged changes
      if (indexStatus !== " " && indexStatus !== "?") {
        staged.push({ path: filePath, status: parseGitStatus(indexStatus) })
      }

      // Unstaged changes
      if (workStatus !== " " && workStatus !== "?") {
        unstaged.push({ path: filePath, status: parseGitStatus(workStatus) })
      }
    }

    return { isRepo: true, branch, ahead, behind, staged, unstaged, untracked, isLoading: false }
  }

  /**
   * Get file content from HEAD (last committed version)
   */
  async showFile(path: string, file: string, ref = "HEAD"): Promise<string> {
    try {
      return await this.run(["show", `${ref}:${file}`], path)
    } catch {
      return "" // File doesn't exist in ref (new file)
    }
  }

  async diff(path: string, file?: string): Promise<string> {
    const args = ["diff"]
    if (file) args.push("--", file)
    return this.run(args, path)
  }

  async diffStaged(path: string, file?: string): Promise<string> {
    const args = ["diff", "--staged"]
    if (file) args.push("--", file)
    return this.run(args, path)
  }

  async log(path: string, limit = 50): Promise<GitLogEntry[]> {
    const output = await this.run(
      ["log", `--max-count=${limit}`, "--format=%H%n%an%n%aI%n%s%n---"],
      path
    )

    const entries: GitLogEntry[] = []
    const blocks = output.split("\n---\n")
    for (const block of blocks) {
      const lines = block.trim().split("\n")
      if (lines.length < 4) continue
      entries.push({
        hash: lines[0]!,
        author: lines[1]!,
        date: lines[2]!,
        message: lines[3]!,
      })
    }
    return entries
  }

  async stage(path: string, files: string[]): Promise<void> {
    await this.run(["add", "--", ...files], path)
  }

  async unstage(path: string, files: string[]): Promise<void> {
    await this.run(["reset", "HEAD", "--", ...files], path)
  }

  async commit(path: string, message: string): Promise<void> {
    await this.run(["commit", "-m", message], path)
  }

  async push(path: string): Promise<void> {
    await this.run(["push"], path)
  }

  async pull(path: string): Promise<void> {
    await this.run(["pull"], path)
  }

  async blame(path: string, file: string): Promise<GitBlameLine[]> {
    const output = await this.run(
      ["blame", "--porcelain", "--", file],
      path
    )

    const lines: GitBlameLine[] = []
    const blocks = output.split("\n")
    let currentHash = ""
    let currentAuthor = ""
    let currentDate = ""
    let currentLine = 0

    for (const line of blocks) {
      // Header line: hash origLine finalLine [numLines]
      const headerMatch = line.match(/^([0-9a-f]{40}) \d+ (\d+)/)
      if (headerMatch) {
        currentHash = headerMatch[1]!
        currentLine = parseInt(headerMatch[2]!, 10)
        continue
      }
      if (line.startsWith("author ")) {
        currentAuthor = line.slice(7)
        continue
      }
      if (line.startsWith("author-time ")) {
        const ts = parseInt(line.slice(12), 10)
        currentDate = new Date(ts * 1000).toISOString().split("T")[0]!
        continue
      }
      // Content line starts with tab
      if (line.startsWith("\t")) {
        lines.push({
          hash: currentHash.slice(0, 8),
          author: currentAuthor,
          date: currentDate,
          lineNumber: currentLine,
          content: line.slice(1),
        })
      }
    }

    return lines
  }

  async logGraph(path: string, limit = 30): Promise<string> {
    return this.run(
      [
        "log",
        `--max-count=${limit}`,
        "--graph",
        "--oneline",
        "--decorate",
        "--all",
        "--color=never",
      ],
      path
    )
  }
}

function parseGitStatus(char: string): GitFileStatus {
  switch (char) {
    case "M": return "modified"
    case "A": return "added"
    case "D": return "deleted"
    case "R": return "renamed"
    case "C": return "copied"
    default: return "modified"
  }
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`
  if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`
  if (diffWeeks > 0) return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`
  return "just now"
}


export const git = new BunGitAdapter()
