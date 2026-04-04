/**
 * Git Runtime
 *
 * Manages git status polling. Subscribes to the store and
 * periodically checks git status, dispatching updates.
 * Follows the same pattern as lsp-runtime.ts.
 */

import { store } from "./store.ts"
import { git } from "../adapters/index.ts"

let pollInterval: ReturnType<typeof setInterval> | null = null
let isPolling = false
let lastRootPath: string | null = null

const POLL_INTERVAL_MS = 3000

async function pollGitStatus() {
  if (isPolling) return
  isPolling = true

  try {
    const state = store.getState()
    const rootPath = state.workspace.rootPath
    if (!rootPath) return

    const gitStatus = await git.status(rootPath)
    store.dispatch({ type: "SET_GIT_STATUS", git: gitStatus })
  } catch (error) {
    console.error("Git status poll failed:", error)
  } finally {
    isPolling = false
  }
}

export async function initializeGitRuntime(): Promise<void> {
  const state = store.getState()
  const rootPath = state.workspace.rootPath

  if (rootPath) {
    lastRootPath = rootPath
    await pollGitStatus()
  }

  // Poll on interval
  pollInterval = setInterval(pollGitStatus, POLL_INTERVAL_MS)

  // Re-poll when workspace changes or file is saved
  store.subscribe((newState) => {
    const newRootPath = newState.workspace.rootPath
    if (newRootPath !== lastRootPath) {
      lastRootPath = newRootPath
      pollGitStatus()
    }
  })
}

export function shutdownGitRuntime(): void {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

/**
 * Trigger an immediate git status refresh.
 * Useful after staging, committing, etc.
 */
export function refreshGitStatus(): void {
  pollGitStatus()
}
