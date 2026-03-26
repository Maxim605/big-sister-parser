/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  extends: "dependency-cruiser/configs/recommended-strict",
  forbidden: [
    {
      name: "no-domain-outgoing",
      comment: "Domain слой не должен импортировать application или infrastructure",
      severity: "error",
      from: { path: "^src/domain" },
      to: { path: "^src/(application|infrastructure)" },
    },
    {
      name: "no-application-to-infrastructure",
      comment: "Application слой может зависеть только от domain",
      severity: "error",
      from: { path: "^src/application" },
      to: { path: "^src/infrastructure" },
    },
    {
      name: "not-to-unresolvable",
      severity: "warn",
      comment: "Нерезолвящиеся импорты",
      from: { path: "^src/" },
    },
    {
      name: "no-orphans",
      severity: "warn",
      comment: "Осиротевшие модули",
      from: { orphan: true },
      to: {},
    },
  ],
  allowed: [
    { from: { path: "^src/application" }, to: { path: "^src/domain" } },
    { from: { path: "^src/infrastructure" }, to: { path: "^src/(domain|application)" } },
    { from: { path: "^src/domain/parser" }, to: { path: "^src/application" } },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: {
      fileName: "tsconfig.json",
    },
    baseDir: ".",
    exclude: [
      // migrations
      "^src/migrations(/|$)",
      // CLI entry file
      "^src/cli\\.ts$",
      // Type-only and declaration files
      "\\.types\\.ts$",
      "\\.d\\.ts$",
      // Event DTOs
      "\\.events\\.ts$",
      // Tests, mocks, stories (if present)
      "(^|/)__tests__(/|$)",
      "(^|/)__mocks__(/|$)",
      "\\.spec\\.ts$",
      "\\.test\\.ts$",
      "\\.stories\\.tsx?$",
      // Thrift sources and generated code (skip if not generated)
      "^src/thrift(/|$)",
    ],
    reporterOptions: {
      dot: {
        collapsePattern: "node_modules",
      },
    },
  },
};
