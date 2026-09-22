// Regenerates THIRD-PARTY-NOTICES.md from the dependency graph.
//
//   npm run notices
//
// Frontend licences come from node_modules, Rust licences from `cargo metadata`
// and the licence files kept in the cargo registry cache. Run it after
// dependency changes.

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

/** Direct frontend dependencies, with their licence files where shipped. */
function frontendDependencies() {
  const manifest = readJson(join(root, "package.json"));
  const names = Object.keys(manifest.dependencies ?? {}).sort();
  const licences = new Map();

  const entries = names.map((name) => {
    const directory = join(root, "node_modules", name);
    const pkg = readJson(join(directory, "package.json"));
    const license = pkg.license ?? "see package";

    if (!licences.has(license)) {
      for (const candidate of ["LICENSE", "LICENSE.md", "LICENSE.txt", "license"]) {
        try {
          licences.set(license, readFileSync(join(directory, candidate), "utf8").trim());
          break;
        } catch {
          // No licence file next to the package.
        }
      }
    }

    return { name, version: pkg.version, license, repository: pkg.repository?.url };
  });

  return { entries, licences };
}

/** Crates actually linked into the binary: non-dev edges from our package. */
function rustDependencies() {
  const metadata = JSON.parse(
    execFileSync("cargo", ["metadata", "--format-version", "1"], {
      cwd: join(root, "src-tauri"),
      maxBuffer: 256 * 1024 * 1024,
    }),
  );

  const packages = new Map(metadata.packages.map((pkg) => [pkg.id, pkg]));
  const nodes = new Map(metadata.resolve.nodes.map((node) => [node.id, node]));
  const ours = metadata.packages.find((pkg) => pkg.name === "markdown-viewer");

  const linked = new Set();
  const queue = [ours.id];

  while (queue.length > 0) {
    const id = queue.pop();
    if (linked.has(id)) continue;
    linked.add(id);

    for (const dependency of nodes.get(id)?.deps ?? []) {
      const kinds = new Set((dependency.dep_kinds ?? []).map((kind) => kind.kind));
      if (kinds.size > 0 && [...kinds].every((kind) => kind === "dev")) continue;
      queue.push(dependency.pkg);
    }
  }

  return [...linked]
    .map((id) => packages.get(id))
    .filter((pkg) => pkg && pkg.name !== "markdown-viewer")
    .map((pkg) => ({
      name: pkg.name,
      version: pkg.version,
      license: pkg.license ?? "unknown",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Finds a licence file for a licence id somewhere in the registry cache. */
function registryLicenseTexts(crates) {
  const registry = join(homedir(), ".cargo", "registry", "src");
  const wanted = new Map([
    ["Apache-2.0", ["LICENSE-APACHE", "LICENSE-APACHE-2.0", "LICENSE"]],
    ["MIT", ["LICENSE-MIT", "LICENSE"]],
    ["ISC", ["LICENSE", "LICENSE.md"]],
    ["BSD-3-Clause", ["LICENSE", "LICENSE.md", "LICENSE-BSD"]],
    ["BSD-2-Clause", ["LICENSE", "LICENSE.md"]],
    ["MPL-2.0", ["LICENSE", "LICENSE.md"]],
    ["Unicode-3.0", ["LICENSE", "LICENSE-UNICODE", "LICENSE.md"]],
    ["Zlib", ["LICENSE", "LICENSE.md"]],
    ["Unlicense", ["UNLICENSE", "LICENSE", "LICENSE.md"]],
    ["0BSD", ["LICENSE", "LICENSE.md"]],
    ["CC0-1.0", ["LICENSE", "LICENSE.md"]],
    ["LLVM-exception", ["LICENSE", "LICENSE.md"]],
  ]);

  const found = new Map();

  for (const crate of crates) {
    for (const [id, candidates] of wanted) {
      if (found.has(id) || !crate.license.includes(id)) continue;

      for (const candidate of candidates) {
        const path = join(registry, crate.directory, candidate);
        try {
          const text = readFileSync(path, "utf8").trim();
          if (text.length > 100) {
            found.set(id, { text, from: `${crate.name}-${crate.version}/${candidate}` });
            break;
          }
        } catch {
          // Try the next candidate name.
        }
      }
    }
  }

  return found;
}

/** The copyright line each crate ships in its licence files. */
function copyrightNotices(crates) {
  const registry = join(homedir(), ".cargo", "registry", "src");
  const notices = [];

  for (const crate of crates) {
    if (!crate.directory) continue;

    const directory = join(registry, crate.directory);
    let found;

    for (const name of readdirSync(directory)) {
      if (!/^(LICENSE|LICENCE|COPYING|UNLICENSE)/i.test(name)) continue;

      try {
        const text = readFileSync(join(directory, name), "utf8");
        const line = text
          .split("\n")
          .find((candidate) => /copyright/i.test(candidate))
          ?.trim();

        if (line && line.length < 200) {
          found = line;
          break;
        }
      } catch {
        // Unreadable licence file, try the next one.
      }
    }

    if (found) notices.push({ crate: `${crate.name}-${crate.version}`, notice: found });
  }

  return notices.sort((a, b) => a.crate.localeCompare(b.crate));
}

function registryDirectories() {
  const registry = join(homedir(), ".cargo", "registry", "src");
  const directories = new Map();

  for (const index of readdirSync(registry)) {
    const indexDirectory = join(registry, index);
    if (!statSync(indexDirectory).isDirectory()) continue;

    for (const crate of readdirSync(indexDirectory)) {
      const versions = [];
      const parts = crate.split("-");
      for (let cut = 1; cut < parts.length; cut += 1) {
        const name = parts.slice(0, cut).join("-");
        const version = parts.slice(cut).join("-");
        if (/^\d/.test(version)) versions.push({ name, version });
      }

      directories.set(crate, `${index}/${crate}`);
    }
  }

  return directories;
}

const { entries: frontend, licences } = frontendDependencies();
const rust = rustDependencies();

const directories = registryDirectories();
const crates = rust.map((crate) => ({
  ...crate,
  directory: directories.get(`${crate.name}-${crate.version}`) ?? "",
}));

const texts = registryLicenseTexts(crates);
const notices = copyrightNotices(crates);

const lines = [
  "# Third-party notices",
  "",
  "Markdown Viewer is MIT licensed (see [LICENSE](LICENSE)). It is built with",
  "open source software, and the licences of everything linked into a release",
  "build are reproduced below.",
  "",
  "Regenerate with `npm run notices` after changing dependencies.",
  "",
  "## Frontend dependencies",
  "",
  "| Package | Version | Licence |",
  "| --- | --- | --- |",
  ...frontend.map((entry) => `| ${entry.name} | ${entry.version} | ${entry.license} |`),
  "",
  "## Rust crates linked into the application",
  "",
  `Generated from \`cargo metadata\` for ${rust.length} crates.`,
  "",
  "| Crate | Version | Licence |",
  "| --- | --- | --- |",
  ...rust.map((crate) => `| ${crate.name} | ${crate.version} | ${crate.license} |`),
  "",
  "## Copyright notices",
  "",
  `Taken from the licence files of ${notices.length} crates.`,
  "",
  ...notices.map((entry) => `- \`${entry.crate}\` — ${entry.notice}`),
  "",
  "## Licence texts",
  "",
  "Copyright notices for each package are kept in its own distribution; the",
  "standard texts follow.",
  "",
];

for (const [id, { text, from }] of [...texts].sort((a, b) => a[0].localeCompare(b[0]))) {
  lines.push(`### ${id}`, "", `Reproduced from \`${from}\`.`, "", "```text", text, "```", "");
}

for (const [license, text] of licences) {
  if (!text) continue;
  const id = license.replace(/[^A-Za-z0-9.-]/g, "-");
  if (texts.has(id)) continue;
  lines.push(`### Frontend: ${license}`, "", "```text", text, "```", "");
}

writeFileSync(join(root, "THIRD-PARTY-NOTICES.md"), `${lines.join("\n").trimEnd()}\n`);

console.log(
  `THIRD-PARTY-NOTICES.md written: ${frontend.length} frontend packages, ${rust.length} crates, ` +
    `${notices.length} copyright notices, ${texts.size} licence texts`,
);
