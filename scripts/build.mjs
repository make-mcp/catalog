#!/usr/bin/env node
// Validates entries/*.json and generates everything derived from them:
//   index.json                              search index for `make-mcp catalog`
//   plugins/<name>/.claude-plugin/plugin.json + .mcp.json   one Claude Code plugin per entry
//   .claude-plugin/marketplace.json         the Claude Code marketplace listing those plugins
// Usage: node scripts/build.mjs          write the files
//        node scripts/build.mjs --check  fail if entries are invalid or generated files are out of date
//        node scripts/build.mjs --args <name>   print `make-mcp generate` flags for one entry (used by CI)
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

/** CLI version the plugins start; `make-mcp run` needs ≥ 0.4.0. */
const CLI = "@make-mcp/cli@^0.4.0";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const ANSWERS = {
  mode: ["docs", "api", "both"],
  auth: ["none", "apiKey", "bearer", "basic", "oauth2"],
  language: ["ts", "py"],
  transport: ["stdio", "http"],
  tools: ["endpoints", "grouped"],
  docsSource: "string",
  codeSource: "string",
  scope: "string",
};
const FLAGS = { mode: "--mode", auth: "--auth", language: "--lang", transport: "--transport", tools: "--tools", docsSource: "--docs", codeSource: "--code", scope: "--scope" };
const FIELDS = new Set(["$schema", "name", "title", "description", "target", "tags", "maintainers", "answers", "notes"]);

function validate(entry, file) {
  const errors = [];
  const require = (key, ok) => ok || errors.push(`${file}: ${key} is missing or invalid`);
  require("name", typeof entry.name === "string" && /^[a-z0-9][a-z0-9-]{0,62}$/.test(entry.name));
  if (typeof entry.name === "string" && `${entry.name}.json` !== file) errors.push(`${file}: file name must be ${entry.name}.json`);
  require("title", typeof entry.title === "string" && entry.title.length > 0);
  require("description", typeof entry.description === "string" && entry.description.length > 0 && entry.description.length <= 300);
  require("target", typeof entry.target === "string" && entry.target.length > 0);
  require("maintainers", Array.isArray(entry.maintainers) && entry.maintainers.length > 0 && entry.maintainers.every((m) => typeof m === "string"));
  require("tags", entry.tags === undefined || (Array.isArray(entry.tags) && entry.tags.every((t) => typeof t === "string")));
  for (const [key, value] of Object.entries(entry.answers ?? {})) {
    const allowed = ANSWERS[key];
    if (!allowed) errors.push(`${file}: answers.${key} is not allowed in the catalog (personal or unknown setting)`);
    else if (allowed === "string" ? typeof value !== "string" || !value : !allowed.includes(value)) errors.push(`${file}: answers.${key} has an invalid value`);
  }
  for (const key of Object.keys(entry)) if (!FIELDS.has(key)) errors.push(`${file}: unknown field ${key}`);
  return errors;
}

function loadEntries() {
  const dir = join(ROOT, "entries");
  const errors = [];
  const entries = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    try {
      const entry = JSON.parse(readFileSync(join(dir, file), "utf8"));
      errors.push(...validate(entry, file));
      entries.push(entry);
    } catch (err) {
      errors.push(`${file}: ${err.message}`);
    }
  }
  return { entries, errors };
}

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function outputs(entries) {
  const files = {
    "index.json": json({ entries: entries.map(({ name, title, description, target, tags = [] }) => ({ name, title, description, target, tags })) }),
  };
  for (const e of entries) {
    files[`plugins/${e.name}/.claude-plugin/plugin.json`] = json({
      name: e.name,
      description: `${e.title} MCP server for the version your project uses – ${e.description}`,
      version: "1.0.0",
      author: { name: "make-mcp community" },
      homepage: `https://github.com/make-mcp/catalog/blob/main/entries/${e.name}.json`,
      license: "Apache-2.0",
      keywords: ["mcp", "make-mcp", ...(e.tags ?? [])],
    });
    files[`plugins/${e.name}/.mcp.json`] = json({ mcpServers: { [e.name]: { command: "npx", args: ["-y", CLI, "run", `catalog:${e.name}`] } } });
  }
  files[".claude-plugin/marketplace.json"] = json({
    name: "make-mcp-catalog",
    owner: { name: "make-mcp", url: "https://make-mcp.net" },
    metadata: { description: "MCP servers for free software, generated on your machine for the version your project uses." },
    plugins: entries.map((e) => ({ name: e.name, source: `./plugins/${e.name}`, description: e.description })),
  });
  return files;
}

function generateArgs(entry) {
  const args = ["--target", entry.target];
  for (const [key, value] of Object.entries(entry.answers ?? {})) args.push(FLAGS[key], value);
  return args;
}

const [flag, arg] = process.argv.slice(2);
const { entries, errors } = loadEntries();
if (errors.length) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exit(1);
}

if (flag === "--args") {
  const entry = entries.find((e) => e.name === arg);
  if (!entry) {
    process.stderr.write(`unknown entry ${arg}\n`);
    process.exit(1);
  }
  process.stdout.write(`${generateArgs(entry).join("\n")}\n`);
} else if (flag === "--check") {
  const files = outputs(entries);
  const stale = Object.entries(files).filter(([path, content]) => !existsSync(join(ROOT, path)) || readFileSync(join(ROOT, path), "utf8") !== content);
  const orphaned = existsSync(join(ROOT, "plugins")) ? readdirSync(join(ROOT, "plugins")).filter((name) => !entries.some((e) => e.name === name)) : [];
  if (stale.length || orphaned.length) {
    const lines = [...stale.map(([path]) => path), ...orphaned.map((name) => `plugins/${name} (no entry)`)];
    process.stderr.write(`Out of date – run \`node scripts/build.mjs\`:\n${lines.join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`${entries.length} entries valid, generated files up to date\n`);
} else {
  const files = outputs(entries);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(ROOT, path)), { recursive: true });
    writeFileSync(join(ROOT, path), content);
  }
  process.stdout.write(`${entries.length} entries → ${Object.keys(files).length} files\n`);
}
