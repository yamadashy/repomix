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
