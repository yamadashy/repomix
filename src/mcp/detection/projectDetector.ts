import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { logger } from '../../shared/logger.js';

const execFileAsync = promisify(execFile);

/**
 * Supported project types
 */
export type ProjectType = 'rust' | 'typescript' | 'python' | 'go' | 'mixed' | 'generic';

/**
 * Submodule type information
 */
export type SubmoduleType = 'rust' | 'typescript' | 'python' | 'go' | 'generic';

/**
 * Information about a detected submodule
 */
export interface DetectedSubmodule {
  name: string;
  path: string;
  type: SubmoduleType;
  isGitSubmodule: boolean;
  description?: string;
  dependencies: string[];
}

/**
 * Project detection result
 */
export interface ProjectDetectionResult {
  projectType: ProjectType;
  submodules: DetectedSubmodule[];
  gitSubmodulePaths: Set<string>;
}

/**
 * Dependencies for ProjectDetector (for testability)
 */
export interface ProjectDetectorDeps {
  execFileAsync: typeof execFileAsync;
  fsReadFile: typeof fs.readFile;
  fsAccess: typeof fs.access;
  fsStat: typeof fs.stat;
  fsReaddir: typeof fs.readdir;
}

const defaultDeps: ProjectDetectorDeps = {
  execFileAsync,
  fsReadFile: fs.readFile,
  fsAccess: fs.access,
  fsStat: fs.stat,
  fsReaddir: fs.readdir,
};

/**
 * Detects project structure and submodules
 */
export class ProjectDetector {
  private rootDir: string;
  private deps: ProjectDetectorDeps;

  constructor(rootDir: string, deps: ProjectDetectorDeps = defaultDeps) {
    this.rootDir = rootDir;
    this.deps = deps;
  }

  /**
   * Detect project type and submodules
   */
  async detect(): Promise<ProjectDetectionResult> {
    // 1. Detect git submodules first
    const gitSubmodulePaths = await this.detectGitSubmodules();

    // 2. Detect project type
    const projectType = await this.detectProjectType();

    // 3. Detect submodules based on project type
    let submodules: DetectedSubmodule[] = [];

    switch (projectType) {
      case 'rust':
        submodules = await this.detectRustCrates();
        break;
      case 'typescript':
        submodules = await this.detectTypeScriptPackages();
        break;
      case 'python':
        submodules = await this.detectPythonPackages();
        break;
      case 'go':
        submodules = await this.detectGoModules();
        break;
      case 'mixed':
      case 'generic':
        submodules = await this.detectMixedProject();
        break;
    }

    // 4. Mark git submodules
    for (const submodule of submodules) {
      submodule.isGitSubmodule = gitSubmodulePaths.has(submodule.path);
    }

    return { projectType, submodules, gitSubmodulePaths };
  }

  /**
   * Detect git submodules from .gitmodules
   */
  private async detectGitSubmodules(): Promise<Set<string>> {
    const submodules = new Set<string>();

    try {
      const gitmodulesPath = path.join(this.rootDir, '.gitmodules');
      const content = await this.deps.fsReadFile(gitmodulesPath, 'utf-8');

      // Parse [submodule "xxx"] path = xxx
      const pathRegex = /path\s*=\s*(.+)/g;
      let match: RegExpExecArray | null;
      while (true) {
        match = pathRegex.exec(content);
        if (match === null) break;
        submodules.add(match[1].trim());
      }
    } catch {
      // .gitmodules doesn't exist, no submodules
      logger.trace('.gitmodules not found');
    }

    return submodules;
  }

  /**
   * Detect the main project type
   */
  private async detectProjectType(): Promise<ProjectType> {
    const checks: Array<{ file: string; type: ProjectType }> = [
      { file: 'Cargo.toml', type: 'rust' },
      { file: 'package.json', type: 'typescript' },
      { file: 'pyproject.toml', type: 'python' },
      { file: 'go.mod', type: 'go' },
    ];

    const found: ProjectType[] = [];

    for (const check of checks) {
      if (await this.fileExists(path.join(this.rootDir, check.file))) {
        found.push(check.type);
      }
    }

    if (found.length === 0) return 'generic';
    if (found.length === 1) return found[0];
    return 'mixed';
  }

  /**
   * Detect Rust crates using cargo metadata
   */
  private async detectRustCrates(): Promise<DetectedSubmodule[]> {
    try {
      const { stdout } = await this.deps.execFileAsync('cargo', ['metadata', '--format-version=1', '--no-deps'], {
        cwd: this.rootDir,
        maxBuffer: 50 * 1024 * 1024,
      });

      const metadata = JSON.parse(stdout);
      const workspaceRoot = metadata.workspace_root || this.rootDir;
      const workspaceMembers = new Set<string>(metadata.workspace_members || []);
      const crates: DetectedSubmodule[] = [];

      // Build a map of package names for dependency resolution
      const packageNames = new Set<string>();
      for (const pkg of metadata.packages || []) {
        packageNames.add(pkg.name);
      }

      for (const pkg of metadata.packages || []) {
        // Check if this package is a workspace member
        const isWorkspaceMember =
          workspaceMembers.size === 0 ||
          Array.from(workspaceMembers).some(
            (member) => member.includes(pkg.name) || member.includes(path.dirname(pkg.manifest_path)),
          );

        if (!isWorkspaceMember) continue;

        const manifestDir = path.dirname(pkg.manifest_path);
        const relativePath = path.relative(workspaceRoot, manifestDir);

        // Skip root package (empty path)
        if (!relativePath) continue;

        // Extract workspace-internal dependencies
        const dependencies: string[] = [];
        for (const dep of pkg.dependencies || []) {
          if (packageNames.has(dep.name) && dep.path) {
            dependencies.push(dep.name);
          }
        }

        crates.push({
          name: pkg.name,
          path: relativePath,
          type: 'rust',
          isGitSubmodule: false,
          description: pkg.description,
          dependencies,
        });
      }

      return crates;
    } catch (error) {
      logger.trace('Failed to detect Rust crates:', (error as Error).message);
      return [];
    }
  }

  /**
   * Detect TypeScript/JavaScript packages from npm/pnpm/yarn workspaces
   */
  private async detectTypeScriptPackages(): Promise<DetectedSubmodule[]> {
    try {
      const packageJsonPath = path.join(this.rootDir, 'package.json');
      const content = await this.deps.fsReadFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      // Get workspace patterns
      let workspacePatterns: string[] = [];
      if (Array.isArray(packageJson.workspaces)) {
        workspacePatterns = packageJson.workspaces;
      } else if (packageJson.workspaces?.packages) {
        workspacePatterns = packageJson.workspaces.packages;
      }

      if (workspacePatterns.length === 0) {
        // Check for pnpm-workspace.yaml
        try {
          const pnpmWorkspacePath = path.join(this.rootDir, 'pnpm-workspace.yaml');
          const pnpmContent = await this.deps.fsReadFile(pnpmWorkspacePath, 'utf-8');
          // Simple YAML parsing for packages array
          const packagesMatch = pnpmContent.match(/packages:\s*\n((?:\s+-\s+.+\n?)+)/);
          if (packagesMatch) {
            const items = packagesMatch[1].match(/-\s+(.+)/g);
            if (items) {
              workspacePatterns = items.map((item) => item.replace(/^-\s+/, '').trim().replace(/['"]/g, ''));
            }
          }
        } catch {
          // No pnpm-workspace.yaml
        }
      }

      if (workspacePatterns.length === 0) {
        return [];
      }

      const packages: DetectedSubmodule[] = [];
      const packageNames = new Map<string, string>(); // name -> path

      // Expand glob patterns and find packages
      for (const pattern of workspacePatterns) {
        const dirs = await this.expandWorkspacePattern(pattern);

        for (const dir of dirs) {
          try {
            const pkgJsonPath = path.join(this.rootDir, dir, 'package.json');
            const pkgContent = await this.deps.fsReadFile(pkgJsonPath, 'utf-8');
            const pkgJson = JSON.parse(pkgContent);

            if (pkgJson.name) {
              packageNames.set(pkgJson.name, dir);
            }
          } catch {
            // package.json doesn't exist
          }
        }
      }

      // Second pass: resolve dependencies
      for (const [name, pkgPath] of packageNames) {
        try {
          const pkgJsonPath = path.join(this.rootDir, pkgPath, 'package.json');
          const pkgContent = await this.deps.fsReadFile(pkgJsonPath, 'utf-8');
          const pkgJson = JSON.parse(pkgContent);

          const allDeps = {
            ...pkgJson.dependencies,
            ...pkgJson.devDependencies,
            ...pkgJson.peerDependencies,
          };

          const workspaceDeps = Object.keys(allDeps).filter((dep) => packageNames.has(dep));

          packages.push({
            name,
            path: pkgPath,
            type: 'typescript',
            isGitSubmodule: false,
            description: pkgJson.description,
            dependencies: workspaceDeps,
          });
        } catch {
          // Skip if can't read package.json
        }
      }

      return packages;
    } catch (error) {
      logger.trace('Failed to detect TypeScript packages:', (error as Error).message);
      return [];
    }
  }

  /**
   * Expand workspace glob pattern to actual directories
   */
  private async expandWorkspacePattern(pattern: string): Promise<string[]> {
    const dirs: string[] = [];

    // Handle simple patterns like "packages/*" or "apps/*"
    if (pattern.endsWith('/*')) {
      const baseDir = pattern.slice(0, -2);
      const fullPath = path.join(this.rootDir, baseDir);

      try {
        const entries = await this.deps.fsReaddir(fullPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            dirs.push(path.join(baseDir, entry.name));
          }
        }
      } catch {
        // Directory doesn't exist
      }
    } else if (pattern.includes('*')) {
      // More complex patterns - use fast-glob if available
      try {
        const fg = await import('fast-glob');
        const matches = await fg.default(pattern, {
          cwd: this.rootDir,
          onlyDirectories: true,
        });
        dirs.push(...matches);
      } catch {
        // fast-glob not available, skip complex patterns
        logger.trace(`Skipping complex pattern: ${pattern}`);
      }
    } else {
      // Exact path
      if (await this.directoryExists(path.join(this.rootDir, pattern))) {
        dirs.push(pattern);
      }
    }

    return dirs;
  }

  /**
   * Detect Python packages (poetry workspaces, src layout, etc.)
   */
  private async detectPythonPackages(): Promise<DetectedSubmodule[]> {
    const packages: DetectedSubmodule[] = [];

    // Check for pyproject.toml with workspace config
    try {
      const pyprojectPath = path.join(this.rootDir, 'pyproject.toml');
      await this.deps.fsAccess(pyprojectPath);

      // Look for common Python monorepo patterns
      const commonDirs = ['packages', 'libs', 'src', 'apps'];

      for (const dir of commonDirs) {
        const fullPath = path.join(this.rootDir, dir);
        if (await this.directoryExists(fullPath)) {
          const entries = await this.deps.fsReaddir(fullPath, { withFileTypes: true });

          for (const entry of entries) {
            if (entry.isDirectory()) {
              const subPath = path.join(dir, entry.name);
              // Check if it has pyproject.toml or setup.py
              const hasPyproject = await this.fileExists(path.join(this.rootDir, subPath, 'pyproject.toml'));
              const hasSetupPy = await this.fileExists(path.join(this.rootDir, subPath, 'setup.py'));

              if (hasPyproject || hasSetupPy) {
                packages.push({
                  name: entry.name,
                  path: subPath,
                  type: 'python',
                  isGitSubmodule: false,
                  description: `Python package: ${entry.name}`,
                  dependencies: [],
                });
              }
            }
          }
        }
      }
    } catch {
      // No pyproject.toml
    }

    return packages;
  }

  /**
   * Detect Go modules (go.work workspaces)
   */
  private async detectGoModules(): Promise<DetectedSubmodule[]> {
    const modules: DetectedSubmodule[] = [];

    try {
      // Check for go.work file (Go 1.18+ workspaces)
      const goWorkPath = path.join(this.rootDir, 'go.work');
      const content = await this.deps.fsReadFile(goWorkPath, 'utf-8');

      // Parse use directives
      const useRegex = /use\s+\(\s*([\s\S]*?)\s*\)|use\s+(\S+)/g;
      let match: RegExpExecArray | null;

      while (true) {
        match = useRegex.exec(content);
        if (match === null) break;

        const paths = match[1]
          ? match[1]
              .split('\n')
              .map((l) => l.trim())
              .filter((l) => l && !l.startsWith('//'))
          : [match[2]];

        for (const modulePath of paths) {
          const cleanPath = modulePath.replace(/^\.\//, '');
          if (await this.directoryExists(path.join(this.rootDir, cleanPath))) {
            // Read go.mod to get module name
            try {
              const goModPath = path.join(this.rootDir, cleanPath, 'go.mod');
              const goModContent = await this.deps.fsReadFile(goModPath, 'utf-8');
              const moduleMatch = goModContent.match(/module\s+(\S+)/);
              const moduleName = moduleMatch ? moduleMatch[1] : path.basename(cleanPath);

              modules.push({
                name: moduleName,
                path: cleanPath,
                type: 'go',
                isGitSubmodule: false,
                description: `Go module: ${moduleName}`,
                dependencies: [],
              });
            } catch {
              // No go.mod, skip
            }
          }
        }
      }
    } catch {
      // No go.work file, try to find go modules in common directories
      const commonDirs = ['cmd', 'pkg', 'internal', 'apps', 'services'];

      for (const dir of commonDirs) {
        const fullPath = path.join(this.rootDir, dir);
        if (await this.directoryExists(fullPath)) {
          const entries = await this.deps.fsReaddir(fullPath, { withFileTypes: true });

          for (const entry of entries) {
            if (entry.isDirectory()) {
              const subPath = path.join(dir, entry.name);
              const hasGoMod = await this.fileExists(path.join(this.rootDir, subPath, 'go.mod'));

              if (hasGoMod) {
                modules.push({
                  name: entry.name,
                  path: subPath,
                  type: 'go',
                  isGitSubmodule: false,
                  description: `Go module: ${entry.name}`,
                  dependencies: [],
                });
              }
            }
          }
        }
      }
    }

    return modules;
  }

  /**
   * Detect submodules in mixed or generic projects
   */
  private async detectMixedProject(): Promise<DetectedSubmodule[]> {
    const submodules: DetectedSubmodule[] = [];
    const commonDirs = ['packages', 'crates', 'libs', 'apps', 'services', 'modules', 'components'];

    for (const dir of commonDirs) {
      const fullPath = path.join(this.rootDir, dir);
      if (!(await this.directoryExists(fullPath))) continue;

      const entries = await this.deps.fsReaddir(fullPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const subPath = path.join(dir, entry.name);
        const type = await this.detectSubmoduleType(path.join(this.rootDir, subPath));

        submodules.push({
          name: entry.name,
          path: subPath,
          type,
          isGitSubmodule: false,
          description: `${type} package: ${entry.name}`,
          dependencies: [],
        });
      }
    }

    return submodules;
  }

  /**
   * Detect the type of a specific submodule directory
   */
  private async detectSubmoduleType(dir: string): Promise<SubmoduleType> {
    if (await this.fileExists(path.join(dir, 'Cargo.toml'))) return 'rust';
    if (await this.fileExists(path.join(dir, 'package.json'))) return 'typescript';
    if (await this.fileExists(path.join(dir, 'pyproject.toml'))) return 'python';
    if (await this.fileExists(path.join(dir, 'setup.py'))) return 'python';
    if (await this.fileExists(path.join(dir, 'go.mod'))) return 'go';
    return 'generic';
  }

  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await this.deps.fsAccess(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await this.deps.fsStat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
}
