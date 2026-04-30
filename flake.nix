{
  description = "Repomix — pack repository contents into a single AI-friendly file";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      forAllSystems =
        f:
        nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed (system: f nixpkgs.legacyPackages.${system});
    in
    {
      packages = forAllSystems (pkgs: rec {
        default = repomix;

        repomix = pkgs.buildNpmPackage (finalAttrs: {
          pname = "repomix";
          inherit (builtins.fromJSON (builtins.readFile ./package.json)) version;

          src = ./.;

          npmDepsHash = "sha256-Pw2/w0rn5UloUqPZrze2l1Qi7JEdAXxlpPm7dxEHzWU=";

          # `npm run build` runs as part of buildPhase via the build script in package.json.
          # The `prepare` script is skipped because buildNpmPackage installs with --ignore-scripts.

          meta = {
            description = "Pack repository contents into a single AI-friendly file";
            homepage = "https://github.com/yamadashy/repomix";
            license = pkgs.lib.licenses.mit;
            mainProgram = "repomix";
            maintainers = [ ];
          };
        });
      });

      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShellNoCC {
          packages = [
            pkgs.nodejs_24
            pkgs.git
          ];

          shellHook = ''
            echo "Repomix dev shell"
            echo "  node: $(node --version)"
            echo "  npm:  $(npm --version)"
            echo ""
            echo "Run 'npm ci' to install dependencies, then 'npm run build'."
          '';
        };
      });

      formatter = forAllSystems (pkgs: pkgs.nixfmt);
    };
}
