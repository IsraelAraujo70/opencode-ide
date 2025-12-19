/**
 * File Icons and Colors - Nerd Font icons for file types
 * 
 * Uses Nerd Font icons: https://www.nerdfonts.com/cheat-sheet
 */

export interface FileIconConfig {
  icon: string
  color: string // hex color
}

// Folder icons
export const folderIcons = {
  closed: "", // nf-custom-folder
  open: "", // nf-custom-folder_open
  // Special folders
  src: "",
  node_modules: "",
  git: "",
  github: "",
  vscode: "",
  config: "",
  test: "",
  tests: "",
  dist: "",
  build: "",
  public: "",
  assets: "",
  images: "",
  img: "",
  components: "",
  hooks: "",
  utils: "",
  lib: "",
  types: "",
  styles: "",
  css: "",
}

// Folder colors
export const folderColor = "#e8ab53" // golden/yellow for folders

// File icons by extension
export const fileIcons: Record<string, FileIconConfig> = {
  // TypeScript/JavaScript
  ts: { icon: "", color: "#3178c6" },
  tsx: { icon: "", color: "#3178c6" },
  js: { icon: "", color: "#f7df1e" },
  jsx: { icon: "", color: "#61dafb" },
  mjs: { icon: "", color: "#f7df1e" },
  cjs: { icon: "", color: "#f7df1e" },
  
  // Web
  html: { icon: "", color: "#e34f26" },
  css: { icon: "", color: "#1572b6" },
  scss: { icon: "", color: "#cc6699" },
  sass: { icon: "", color: "#cc6699" },
  less: { icon: "", color: "#1d365d" },
  
  // Data/Config
  json: { icon: "", color: "#cbcb41" },
  yaml: { icon: "", color: "#cb171e" },
  yml: { icon: "", color: "#cb171e" },
  toml: { icon: "", color: "#9c4121" },
  xml: { icon: "謹", color: "#e37933" },
  
  // Markdown/Docs
  md: { icon: "", color: "#519aba" },
  mdx: { icon: "", color: "#519aba" },
  txt: { icon: "", color: "#89e051" },
  
  // Git
  gitignore: { icon: "", color: "#f14e32" },
  gitattributes: { icon: "", color: "#f14e32" },
  
  // Shell
  sh: { icon: "", color: "#89e051" },
  bash: { icon: "", color: "#89e051" },
  zsh: { icon: "", color: "#89e051" },
  fish: { icon: "", color: "#89e051" },
  
  // Python
  py: { icon: "", color: "#3572a5" },
  pyc: { icon: "", color: "#3572a5" },
  pyo: { icon: "", color: "#3572a5" },
  pyd: { icon: "", color: "#3572a5" },
  
  // Rust
  rs: { icon: "", color: "#dea584" },
  
  // Go
  go: { icon: "", color: "#00add8" },
  
  // C/C++
  c: { icon: "", color: "#599eff" },
  cpp: { icon: "", color: "#f34b7d" },
  h: { icon: "", color: "#a074c4" },
  hpp: { icon: "", color: "#a074c4" },
  
  // Java/Kotlin
  java: { icon: "", color: "#cc3e44" },
  kt: { icon: "", color: "#7f52ff" },
  kts: { icon: "", color: "#7f52ff" },
  
  // Ruby
  rb: { icon: "", color: "#cc342d" },
  
  // PHP
  php: { icon: "", color: "#777bb3" },
  
  // Images
  png: { icon: "", color: "#a074c4" },
  jpg: { icon: "", color: "#a074c4" },
  jpeg: { icon: "", color: "#a074c4" },
  gif: { icon: "", color: "#a074c4" },
  svg: { icon: "", color: "#ffb13b" },
  ico: { icon: "", color: "#cbcb41" },
  webp: { icon: "", color: "#a074c4" },
  
  // Fonts
  ttf: { icon: "", color: "#ececec" },
  otf: { icon: "", color: "#ececec" },
  woff: { icon: "", color: "#ececec" },
  woff2: { icon: "", color: "#ececec" },
  
  // Archives
  zip: { icon: "", color: "#eca517" },
  tar: { icon: "", color: "#eca517" },
  gz: { icon: "", color: "#eca517" },
  rar: { icon: "", color: "#eca517" },
  "7z": { icon: "", color: "#eca517" },
  
  // Lock files
  lock: { icon: "", color: "#8bc34a" },
  
  // Docker
  dockerfile: { icon: "", color: "#0db7ed" },
  
  // Misc
  env: { icon: "", color: "#faf743" },
  log: { icon: "", color: "#afb42b" },
  sql: { icon: "", color: "#dad8d8" },
  graphql: { icon: "", color: "#e535ab" },
  gql: { icon: "", color: "#e535ab" },
  prisma: { icon: "", color: "#5a67d8" },
  
  // Default
  default: { icon: "", color: "#6d8086" },
}

// Special filenames (exact match)
export const specialFiles: Record<string, FileIconConfig> = {
  "package.json": { icon: "", color: "#e8274b" },
  "package-lock.json": { icon: "", color: "#7a8b8c" },
  "bun.lock": { icon: "", color: "#fbf0df" },
  "bun.lockb": { icon: "", color: "#fbf0df" },
  "tsconfig.json": { icon: "", color: "#3178c6" },
  "jsconfig.json": { icon: "", color: "#f7df1e" },
  ".gitignore": { icon: "", color: "#f14e32" },
  ".gitattributes": { icon: "", color: "#f14e32" },
  ".env": { icon: "", color: "#faf743" },
  ".env.local": { icon: "", color: "#faf743" },
  ".env.development": { icon: "", color: "#faf743" },
  ".env.production": { icon: "", color: "#faf743" },
  "README.md": { icon: "", color: "#519aba" },
  "LICENSE": { icon: "", color: "#d0bf41" },
  "Dockerfile": { icon: "", color: "#0db7ed" },
  "docker-compose.yml": { icon: "", color: "#0db7ed" },
  "docker-compose.yaml": { icon: "", color: "#0db7ed" },
  ".prettierrc": { icon: "", color: "#56b3b4" },
  ".eslintrc": { icon: "", color: "#4b32c3" },
  ".eslintrc.js": { icon: "", color: "#4b32c3" },
  ".eslintrc.json": { icon: "", color: "#4b32c3" },
  "vite.config.ts": { icon: "", color: "#646cff" },
  "vite.config.js": { icon: "", color: "#646cff" },
  "webpack.config.js": { icon: "󰜫", color: "#8dd6f9" },
  "rollup.config.js": { icon: "", color: "#ec4a3f" },
  "tailwind.config.js": { icon: "󱏿", color: "#38bdf8" },
  "tailwind.config.ts": { icon: "󱏿", color: "#38bdf8" },
}

/**
 * Get icon and color for a file
 */
export function getFileIcon(filename: string): FileIconConfig {
  // Check special files first (exact match)
  const special = specialFiles[filename]
  if (special) {
    return special
  }
  
  // Get extension
  const ext = filename.split(".").pop()?.toLowerCase()
  
  if (ext) {
    const iconConfig = fileIcons[ext]
    if (iconConfig) {
      return iconConfig
    }
  }
  
  return fileIcons.default as FileIconConfig
}

/**
 * Get icon for a folder
 */
export function getFolderIcon(name: string, isOpen: boolean): string {
  const lowerName = name.toLowerCase()
  
  // Check for special folder names
  if (folderIcons[lowerName as keyof typeof folderIcons]) {
    return folderIcons[lowerName as keyof typeof folderIcons]
  }
  
  // Default folder icon
  return isOpen ? folderIcons.open : folderIcons.closed
}
