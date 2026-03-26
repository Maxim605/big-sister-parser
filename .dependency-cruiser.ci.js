/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
    extends: "dependency-cruiser/configs/recommended-strict",
    forbidden: [
      {
        name: "no-domain-outgoing",
        from: { path: "^src/domain" },
        to: { path: "^src/(application|infrastructure)" },
        severity: "error",
      },
      {
        name: "no-application-to-infrastructure",
        from: { path: "^src/application" },
        to: { path: "^src/infrastructure" },
        severity: "error",
      },
      {
        name: "not-to-unresolvable",
        from: { path: "^src/" },
        severity: "error", 
      },
    ],
    options: {
      tsConfig: { fileName: "tsconfig.json" },
      exclude: [
        "^src/migrations(/|$)",
        "^src/thrift/gen-nodejs(/|$)",
        "\\.spec\\.ts$",
        "\\.test\\.ts$",
      ],
    },
  };