/**
 * Search Adapter
 *
 * In-file search (pure string/regex matching) and project-wide grep
 * using ripgrep (rg) with fallback to native JS search.
 */

import type { SearchPort, SearchOptions } from "../ports/index.ts"
import type { SearchMatch, ProjectSearchResult } from "../domain/types.ts"

export class SearchAdapter implements SearchPort {
  searchInFile(content: string, query: string, options: SearchOptions): SearchMatch[] {
    if (!query) return []

    const matches: SearchMatch[] = []
    const lines = content.split("\n")

    let pattern: RegExp
    try {
      let source = options.isRegex ? query : escapeRegex(query)
      if (options.isWholeWord) {
        source = `\\b${source}\\b`
      }
      pattern = new RegExp(source, options.isCaseSensitive ? "g" : "gi")
    } catch {
      return []
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!
      let match: RegExpExecArray | null
      pattern.lastIndex = 0
      while ((match = pattern.exec(line)) !== null) {
        matches.push({
          line: i,
          column: match.index,
          length: match[0].length,
        })
        // Prevent infinite loop on zero-length matches
        if (match[0].length === 0) pattern.lastIndex++
      }
    }

    return matches
  }

  async searchInProject(
    rootPath: string,
    query: string,
    options: SearchOptions
  ): Promise<ProjectSearchResult[]> {
    if (!query) return []

    try {
      return await this.searchWithRipgrep(rootPath, query, options)
    } catch {
      return this.searchWithFallback(rootPath, query, options)
    }
  }

  private async searchWithRipgrep(
    rootPath: string,
    query: string,
    options: SearchOptions
  ): Promise<ProjectSearchResult[]> {
    const args = [
      "--json",
      "--max-count=100",
      "--max-filesize=1M",
    ]

    if (!options.isCaseSensitive) args.push("-i")
    if (options.isWholeWord) args.push("-w")
    if (!options.isRegex) args.push("-F")

    args.push("--", query, rootPath)

    const proc = Bun.spawn(["rg", ...args], {
      stdout: "pipe",
      stderr: "pipe",
    })

    const output = await new Response(proc.stdout).text()
    await proc.exited

    const results = new Map<string, ProjectSearchResult>()

    for (const line of output.split("\n")) {
      if (!line.trim()) continue
      try {
        const entry = JSON.parse(line)
        if (entry.type === "match") {
          const filePath = entry.data.path.text
          const lineNumber = entry.data.line_number - 1
          const lineText = entry.data.lines.text.trimEnd()

          if (!results.has(filePath)) {
            results.set(filePath, { filePath, matches: [], preview: lineText })
          }

          const result = results.get(filePath)!
          for (const submatch of entry.data.submatches) {
            result.matches.push({
              line: lineNumber,
              column: submatch.start,
              length: submatch.end - submatch.start,
            })
          }
        }
      } catch {
        // Skip malformed JSON lines
      }
    }

    return Array.from(results.values()).slice(0, 200)
  }

  private async searchWithFallback(
    rootPath: string,
    query: string,
    options: SearchOptions
  ): Promise<ProjectSearchResult[]> {
    // Simple fallback using grep
    const args = ["-rn", "--include=*.{ts,tsx,js,jsx,py,go,rs,md,json,yaml,yml,html,css,sh}"]

    if (!options.isCaseSensitive) args.push("-i")
    if (options.isWholeWord) args.push("-w")
    if (options.isRegex) args.push("-E")
    else args.push("-F")

    args.push("--", query, rootPath)

    try {
      const proc = Bun.spawn(["grep", ...args], {
        stdout: "pipe",
        stderr: "pipe",
      })

      const output = await new Response(proc.stdout).text()
      await proc.exited

      const results = new Map<string, ProjectSearchResult>()

      for (const line of output.split("\n").slice(0, 500)) {
        const colonIdx = line.indexOf(":")
        if (colonIdx === -1) continue
        const filePath = line.slice(0, colonIdx)
        const rest = line.slice(colonIdx + 1)
        const secondColon = rest.indexOf(":")
        if (secondColon === -1) continue

        const lineNum = parseInt(rest.slice(0, secondColon), 10) - 1
        const lineText = rest.slice(secondColon + 1)

        if (!results.has(filePath)) {
          results.set(filePath, { filePath, matches: [], preview: lineText.trim() })
        }

        // Find match positions in line
        const fileResult = results.get(filePath)!
        let pat: RegExp
        try {
          const src = options.isRegex ? query : escapeRegex(query)
          pat = new RegExp(src, options.isCaseSensitive ? "g" : "gi")
        } catch {
          continue
        }

        let m: RegExpExecArray | null
        while ((m = pat.exec(lineText)) !== null) {
          fileResult.matches.push({ line: lineNum, column: m.index, length: m[0].length })
          if (m[0].length === 0) break
        }
      }

      return Array.from(results.values()).slice(0, 200)
    } catch {
      return []
    }
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export const search = new SearchAdapter()
