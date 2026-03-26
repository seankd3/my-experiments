import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIBRARY_PATH = join(__dirname, "..", "data", "library.json");

export interface SavedComponent {
  name: string;
  description: string;
  html: string;
  css: string;
  js: string;
  savedAt: string;
}

function ensureDataDir() {
  const dir = dirname(LIBRARY_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function getLibrary(): SavedComponent[] {
  ensureDataDir();
  if (!existsSync(LIBRARY_PATH)) {
    return [];
  }
  const raw = readFileSync(LIBRARY_PATH, "utf-8");
  return JSON.parse(raw);
}

export function saveComponent(component: Omit<SavedComponent, "savedAt">): SavedComponent {
  ensureDataDir();
  const library = getLibrary();

  const existing = library.findIndex((c) => c.name === component.name);
  const saved: SavedComponent = {
    ...component,
    savedAt: new Date().toISOString(),
  };

  if (existing >= 0) {
    library[existing] = saved;
  } else {
    library.push(saved);
  }

  writeFileSync(LIBRARY_PATH, JSON.stringify(library, null, 2));
  return saved;
}

export function getLibraryForPrompt(): string {
  const library = getLibrary();
  if (library.length === 0) return "";

  return library
    .map(
      (c) =>
        `### ${c.name}\n${c.description}\n\`\`\`html\n${c.html}\n\`\`\`\n${c.css ? `\`\`\`css\n${c.css}\n\`\`\`` : ""}${c.js ? `\n\`\`\`js\n${c.js}\n\`\`\`` : ""}`
    )
    .join("\n\n");
}
