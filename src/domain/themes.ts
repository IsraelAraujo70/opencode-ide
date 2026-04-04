/**
 * Default themes for Open IDE
 */

import type { Theme, ThemeColors } from "./types.ts"

const tokyoNightColors: ThemeColors = {
  background: "#1a1b26",
  foreground: "#c0caf5",
  primary: "#7aa2f7",
  secondary: "#bb9af7",
  accent: "#7dcfff",
  error: "#f7768e",
  warning: "#e0af68",
  success: "#9ece6a",
  info: "#7dcfff",
  border: "#3b4261",
  selection: "#33467c",
  lineHighlight: "#292e42",
  comment: "#565f89",
  keyword: "#bb9af7",
  string: "#9ece6a",
  number: "#ff9e64",
  function: "#7aa2f7",
  variable: "#c0caf5",
  type: "#2ac3de",
  operator: "#89ddff",
}

export const tokyoNight: Theme = {
  id: "tokyo-night",
  name: "Tokyo Night",
  type: "dark",
  colors: tokyoNightColors,
}

const catppuccinMochaColors: ThemeColors = {
  background: "#1e1e2e",
  foreground: "#cdd6f4",
  primary: "#89b4fa",
  secondary: "#cba6f7",
  accent: "#94e2d5",
  error: "#f38ba8",
  warning: "#fab387",
  success: "#a6e3a1",
  info: "#89dceb",
  border: "#45475a",
  selection: "#45475a",
  lineHighlight: "#313244",
  comment: "#6c7086",
  keyword: "#cba6f7",
  string: "#a6e3a1",
  number: "#fab387",
  function: "#89b4fa",
  variable: "#cdd6f4",
  type: "#94e2d5",
  operator: "#89dceb",
}

export const catppuccinMocha: Theme = {
  id: "catppuccin-mocha",
  name: "Catppuccin Mocha",
  type: "dark",
  colors: catppuccinMochaColors,
}

const draculaColors: ThemeColors = {
  background: "#282a36",
  foreground: "#f8f8f2",
  primary: "#bd93f9",
  secondary: "#ff79c6",
  accent: "#8be9fd",
  error: "#ff5555",
  warning: "#ffb86c",
  success: "#50fa7b",
  info: "#8be9fd",
  border: "#44475a",
  selection: "#44475a",
  lineHighlight: "#44475a",
  comment: "#6272a4",
  keyword: "#ff79c6",
  string: "#f1fa8c",
  number: "#bd93f9",
  function: "#50fa7b",
  variable: "#f8f8f2",
  type: "#8be9fd",
  operator: "#ff79c6",
}

export const dracula: Theme = {
  id: "dracula",
  name: "Dracula",
  type: "dark",
  colors: draculaColors,
}

const oneLightColors: ThemeColors = {
  background: "#fafafa",
  foreground: "#383a42",
  primary: "#4078f2",
  secondary: "#a626a4",
  accent: "#0184bc",
  error: "#e45649",
  warning: "#c18401",
  success: "#50a14f",
  info: "#0184bc",
  border: "#d3d3d3",
  selection: "#e5e5e6",
  lineHighlight: "#f0f0f0",
  comment: "#a0a1a7",
  keyword: "#a626a4",
  string: "#50a14f",
  number: "#986801",
  function: "#4078f2",
  variable: "#383a42",
  type: "#0184bc",
  operator: "#383a42",
}

export const oneLight: Theme = {
  id: "one-light",
  name: "One Light",
  type: "light",
  colors: oneLightColors,
}

const nordColors: ThemeColors = {
  background: "#2e3440",
  foreground: "#d8dee9",
  primary: "#88c0d0",
  secondary: "#81a1c1",
  accent: "#5e81ac",
  error: "#bf616a",
  warning: "#ebcb8b",
  success: "#a3be8c",
  info: "#88c0d0",
  border: "#3b4252",
  selection: "#434c5e",
  lineHighlight: "#3b4252",
  comment: "#616e88",
  keyword: "#81a1c1",
  string: "#a3be8c",
  number: "#b48ead",
  function: "#88c0d0",
  variable: "#d8dee9",
  type: "#8fbcbb",
  operator: "#81a1c1",
}

export const nord: Theme = {
  id: "nord",
  name: "Nord",
  type: "dark",
  colors: nordColors,
}

const gruvboxDarkColors: ThemeColors = {
  background: "#282828",
  foreground: "#ebdbb2",
  primary: "#458588",
  secondary: "#b16286",
  accent: "#689d6a",
  error: "#cc241d",
  warning: "#d79921",
  success: "#98971a",
  info: "#458588",
  border: "#3c3836",
  selection: "#504945",
  lineHighlight: "#3c3836",
  comment: "#928374",
  keyword: "#fb4934",
  string: "#b8bb26",
  number: "#d3869b",
  function: "#fabd2f",
  variable: "#ebdbb2",
  type: "#8ec07c",
  operator: "#fe8019",
}

export const gruvboxDark: Theme = {
  id: "gruvbox-dark",
  name: "Gruvbox Dark",
  type: "dark",
  colors: gruvboxDarkColors,
}

const gruvboxLightColors: ThemeColors = {
  background: "#fbf1c7",
  foreground: "#3c3836",
  primary: "#076678",
  secondary: "#8f3f71",
  accent: "#427b58",
  error: "#9d0006",
  warning: "#b57614",
  success: "#79740e",
  info: "#076678",
  border: "#d5c4a1",
  selection: "#ebdbb2",
  lineHighlight: "#f2e5bc",
  comment: "#928374",
  keyword: "#9d0006",
  string: "#79740e",
  number: "#8f3f71",
  function: "#b57614",
  variable: "#3c3836",
  type: "#427b58",
  operator: "#af3a03",
}

export const gruvboxLight: Theme = {
  id: "gruvbox-light",
  name: "Gruvbox Light",
  type: "light",
  colors: gruvboxLightColors,
}

const solarizedDarkColors: ThemeColors = {
  background: "#002b36",
  foreground: "#839496",
  primary: "#268bd2",
  secondary: "#6c71c4",
  accent: "#2aa198",
  error: "#dc322f",
  warning: "#b58900",
  success: "#859900",
  info: "#268bd2",
  border: "#073642",
  selection: "#073642",
  lineHighlight: "#073642",
  comment: "#586e75",
  keyword: "#859900",
  string: "#2aa198",
  number: "#d33682",
  function: "#268bd2",
  variable: "#839496",
  type: "#b58900",
  operator: "#93a1a1",
}

export const solarizedDark: Theme = {
  id: "solarized-dark",
  name: "Solarized Dark",
  type: "dark",
  colors: solarizedDarkColors,
}

const solarizedLightColors: ThemeColors = {
  background: "#fdf6e3",
  foreground: "#657b83",
  primary: "#268bd2",
  secondary: "#6c71c4",
  accent: "#2aa198",
  error: "#dc322f",
  warning: "#b58900",
  success: "#859900",
  info: "#268bd2",
  border: "#eee8d5",
  selection: "#eee8d5",
  lineHighlight: "#eee8d5",
  comment: "#93a1a1",
  keyword: "#859900",
  string: "#2aa198",
  number: "#d33682",
  function: "#268bd2",
  variable: "#657b83",
  type: "#b58900",
  operator: "#586e75",
}

export const solarizedLight: Theme = {
  id: "solarized-light",
  name: "Solarized Light",
  type: "light",
  colors: solarizedLightColors,
}

const oneDarkColors: ThemeColors = {
  background: "#282c34",
  foreground: "#abb2bf",
  primary: "#61afef",
  secondary: "#c678dd",
  accent: "#56b6c2",
  error: "#e06c75",
  warning: "#e5c07b",
  success: "#98c379",
  info: "#61afef",
  border: "#3e4451",
  selection: "#3e4451",
  lineHighlight: "#2c313c",
  comment: "#5c6370",
  keyword: "#c678dd",
  string: "#98c379",
  number: "#d19a66",
  function: "#61afef",
  variable: "#abb2bf",
  type: "#56b6c2",
  operator: "#56b6c2",
}

export const oneDark: Theme = {
  id: "one-dark",
  name: "One Dark",
  type: "dark",
  colors: oneDarkColors,
}

const monokaiColors: ThemeColors = {
  background: "#272822",
  foreground: "#f8f8f2",
  primary: "#66d9ef",
  secondary: "#ae81ff",
  accent: "#a6e22e",
  error: "#f92672",
  warning: "#fd971f",
  success: "#a6e22e",
  info: "#66d9ef",
  border: "#3e3d32",
  selection: "#49483e",
  lineHighlight: "#3e3d32",
  comment: "#75715e",
  keyword: "#f92672",
  string: "#e6db74",
  number: "#ae81ff",
  function: "#a6e22e",
  variable: "#f8f8f2",
  type: "#66d9ef",
  operator: "#f92672",
}

export const monokai: Theme = {
  id: "monokai",
  name: "Monokai",
  type: "dark",
  colors: monokaiColors,
}

const githubDarkColors: ThemeColors = {
  background: "#0d1117",
  foreground: "#e6edf3",
  primary: "#58a6ff",
  secondary: "#d2a8ff",
  accent: "#79c0ff",
  error: "#ff7b72",
  warning: "#d29922",
  success: "#3fb950",
  info: "#58a6ff",
  border: "#30363d",
  selection: "#264f78",
  lineHighlight: "#161b22",
  comment: "#8b949e",
  keyword: "#ff7b72",
  string: "#a5d6ff",
  number: "#79c0ff",
  function: "#d2a8ff",
  variable: "#e6edf3",
  type: "#ff7b72",
  operator: "#79c0ff",
}

export const githubDark: Theme = {
  id: "github-dark",
  name: "GitHub Dark",
  type: "dark",
  colors: githubDarkColors,
}

const rosePineColors: ThemeColors = {
  background: "#191724",
  foreground: "#e0def4",
  primary: "#c4a7e7",
  secondary: "#ebbcba",
  accent: "#9ccfd8",
  error: "#eb6f92",
  warning: "#f6c177",
  success: "#31748f",
  info: "#9ccfd8",
  border: "#26233a",
  selection: "#403d52",
  lineHighlight: "#26233a",
  comment: "#6e6a86",
  keyword: "#31748f",
  string: "#f6c177",
  number: "#eb6f92",
  function: "#ebbcba",
  variable: "#e0def4",
  type: "#9ccfd8",
  operator: "#908caa",
}

export const rosePine: Theme = {
  id: "rose-pine",
  name: "Rose Pine",
  type: "dark",
  colors: rosePineColors,
}

const everforestColors: ThemeColors = {
  background: "#2d353b",
  foreground: "#d3c6aa",
  primary: "#7fbbb3",
  secondary: "#d699b6",
  accent: "#83c092",
  error: "#e67e80",
  warning: "#dbbc7f",
  success: "#a7c080",
  info: "#7fbbb3",
  border: "#475258",
  selection: "#543a48",
  lineHighlight: "#343f44",
  comment: "#859289",
  keyword: "#e67e80",
  string: "#a7c080",
  number: "#d699b6",
  function: "#7fbbb3",
  variable: "#d3c6aa",
  type: "#83c092",
  operator: "#e69875",
}

export const everforest: Theme = {
  id: "everforest",
  name: "Everforest",
  type: "dark",
  colors: everforestColors,
}

const kanagawaColors: ThemeColors = {
  background: "#1f1f28",
  foreground: "#dcd7ba",
  primary: "#7e9cd8",
  secondary: "#957fb8",
  accent: "#6a9589",
  error: "#c34043",
  warning: "#ff9e3b",
  success: "#76946a",
  info: "#7fb4ca",
  border: "#2a2a37",
  selection: "#2d4f67",
  lineHighlight: "#2a2a37",
  comment: "#727169",
  keyword: "#957fb8",
  string: "#98bb6c",
  number: "#d27e99",
  function: "#7e9cd8",
  variable: "#dcd7ba",
  type: "#7aa89f",
  operator: "#c0a36e",
}

export const kanagawa: Theme = {
  id: "kanagawa",
  name: "Kanagawa",
  type: "dark",
  colors: kanagawaColors,
}

export const defaultThemes: Theme[] = [
  tokyoNight,
  catppuccinMocha,
  dracula,
  oneLight,
  nord,
  gruvboxDark,
  gruvboxLight,
  solarizedDark,
  solarizedLight,
  oneDark,
  monokai,
  githubDark,
  rosePine,
  everforest,
  kanagawa,
]

export const defaultTheme = tokyoNight
