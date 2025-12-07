import type { ProcessedFile } from '../../file/fileTypes.js';

interface DependencyInfo {
  name: string;
  version?: string;
  isDev?: boolean;
}

interface TechStackInfo {
  languages: string[];
  frameworks: string[];
  dependencies: DependencyInfo[];
  devDependencies: DependencyInfo[];
  packageManager?: string;
}

// Dependency file patterns and their parsers
const DEPENDENCY_FILES: Record<string, { language: string; parser: (content: string) => Partial<TechStackInfo> }> = {
  'package.json': { language: 'Node.js', parser: parsePackageJson },
  'requirements.txt': { language: 'Python', parser: parseRequirementsTxt },
  'pyproject.toml': { language: 'Python', parser: parsePyprojectToml },
  Pipfile: { language: 'Python', parser: parsePipfile },
  'go.mod': { language: 'Go', parser: parseGoMod },
  'Cargo.toml': { language: 'Rust', parser: parseCargoToml },
  'composer.json': { language: 'PHP', parser: parseComposerJson },
  Gemfile: { language: 'Ruby', parser: parseGemfile },
  'pom.xml': { language: 'Java', parser: parsePomXml },
  'build.gradle': { language: 'Java/Kotlin', parser: parseBuildGradle },
  'build.gradle.kts': { language: 'Kotlin', parser: parseBuildGradle },
};

function parsePackageJson(content: string): Partial<TechStackInfo> {
  try {
    const pkg = JSON.parse(content);
    const dependencies: DependencyInfo[] = [];
    const devDependencies: DependencyInfo[] = [];
    const frameworks: string[] = [];

    // Parse dependencies
    if (pkg.dependencies) {
      for (const [name, version] of Object.entries(pkg.dependencies)) {
        dependencies.push({ name, version: String(version) });

        // Detect frameworks
        if (name === 'react' || name === 'react-dom') frameworks.push('React');
        if (name === 'vue') frameworks.push('Vue');
        if (name === 'next') frameworks.push('Next.js');
        if (name === 'nuxt') frameworks.push('Nuxt');
        if (name === '@angular/core') frameworks.push('Angular');
        if (name === 'express') frameworks.push('Express');
        if (name === 'fastify') frameworks.push('Fastify');
        if (name === 'hono') frameworks.push('Hono');
        if (name === 'svelte') frameworks.push('Svelte');
      }
    }

    // Parse devDependencies
    if (pkg.devDependencies) {
      for (const [name, version] of Object.entries(pkg.devDependencies)) {
        devDependencies.push({ name, version: String(version), isDev: true });

        // Detect TypeScript
        if (name === 'typescript') frameworks.push('TypeScript');
      }
    }

    // Detect package manager
    let packageManager: string | undefined;
    if (pkg.packageManager) {
      const pm = String(pkg.packageManager);
      if (pm.startsWith('pnpm')) packageManager = 'pnpm';
      else if (pm.startsWith('yarn')) packageManager = 'yarn';
      else if (pm.startsWith('npm')) packageManager = 'npm';
      else if (pm.startsWith('bun')) packageManager = 'bun';
    }

    return {
      dependencies,
      devDependencies,
      frameworks: [...new Set(frameworks)],
      packageManager,
    };
  } catch {
    return {};
  }
}

function parseRequirementsTxt(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];
  const frameworks: string[] = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;

    // Parse package==version or package>=version format
    const match = trimmed.match(/^([a-zA-Z0-9_-]+)([=<>!~]+)?(.+)?$/);
    if (match) {
      const name = match[1];
      const version = match[3];
      dependencies.push({ name, version });

      // Detect frameworks
      if (name.toLowerCase() === 'django') frameworks.push('Django');
      if (name.toLowerCase() === 'flask') frameworks.push('Flask');
      if (name.toLowerCase() === 'fastapi') frameworks.push('FastAPI');
      if (name.toLowerCase() === 'pytorch' || name.toLowerCase() === 'torch') frameworks.push('PyTorch');
      if (name.toLowerCase() === 'tensorflow') frameworks.push('TensorFlow');
    }
  }

  return { dependencies, frameworks: [...new Set(frameworks)] };
}

function parsePyprojectToml(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];
  const frameworks: string[] = [];

  // Simple TOML parsing for dependencies
  const depsMatch = content.match(/\[project\.dependencies\]([\s\S]*?)(?=\[|$)/);
  if (depsMatch) {
    const depsSection = depsMatch[1];
    const depLines = depsSection.match(/"([^"]+)"/g);
    if (depLines) {
      for (const dep of depLines) {
        const name = dep
          .replace(/"/g, '')
          .split(/[=<>!~]/)[0]
          .trim();
        if (name) {
          dependencies.push({ name });
          if (name.toLowerCase() === 'django') frameworks.push('Django');
          if (name.toLowerCase() === 'flask') frameworks.push('Flask');
          if (name.toLowerCase() === 'fastapi') frameworks.push('FastAPI');
        }
      }
    }
  }

  return { dependencies, frameworks: [...new Set(frameworks)] };
}

function parsePipfile(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];

  // Simple parsing for [packages] section
  const packagesMatch = content.match(/\[packages\]([\s\S]*?)(?=\[|$)/);
  if (packagesMatch) {
    const lines = packagesMatch[1].split('\n');
    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9_-]+)\s*=/);
      if (match) {
        dependencies.push({ name: match[1] });
      }
    }
  }

  return { dependencies };
}

function parseGoMod(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];
  const frameworks: string[] = [];

  // Parse require block
  const requireMatch = content.match(/require\s*\(([\s\S]*?)\)/);
  if (requireMatch) {
    const lines = requireMatch[1].split('\n');
    for (const line of lines) {
      const match = line.trim().match(/^([^\s]+)\s+([^\s]+)/);
      if (match) {
        const name = match[1];
        const version = match[2];
        dependencies.push({ name, version });

        if (name.includes('gin-gonic/gin')) frameworks.push('Gin');
        if (name.includes('labstack/echo')) frameworks.push('Echo');
        if (name.includes('gofiber/fiber')) frameworks.push('Fiber');
      }
    }
  }

  return { dependencies, frameworks: [...new Set(frameworks)] };
}

function parseCargoToml(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];
  const frameworks: string[] = [];

  // Parse [dependencies] section
  const depsMatch = content.match(/\[dependencies\]([\s\S]*?)(?=\[|$)/);
  if (depsMatch) {
    const lines = depsMatch[1].split('\n');
    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9_-]+)\s*=/);
      if (match) {
        const name = match[1];
        dependencies.push({ name });

        if (name === 'actix-web') frameworks.push('Actix');
        if (name === 'axum') frameworks.push('Axum');
        if (name === 'rocket') frameworks.push('Rocket');
        if (name === 'tokio') frameworks.push('Tokio');
      }
    }
  }

  return { dependencies, frameworks: [...new Set(frameworks)] };
}

function parseComposerJson(content: string): Partial<TechStackInfo> {
  try {
    const composer = JSON.parse(content);
    const dependencies: DependencyInfo[] = [];
    const frameworks: string[] = [];

    if (composer.require) {
      for (const [name, version] of Object.entries(composer.require)) {
        if (name !== 'php') {
          dependencies.push({ name, version: String(version) });

          if (name.startsWith('laravel/')) frameworks.push('Laravel');
          if (name.startsWith('symfony/')) frameworks.push('Symfony');
        }
      }
    }

    return { dependencies, frameworks: [...new Set(frameworks)] };
  } catch {
    return {};
  }
}

function parseGemfile(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];
  const frameworks: string[] = [];

  const gemMatches = content.matchAll(/gem\s+['"]([^'"]+)['"]/g);
  for (const match of gemMatches) {
    const name = match[1];
    dependencies.push({ name });

    if (name === 'rails') frameworks.push('Rails');
    if (name === 'sinatra') frameworks.push('Sinatra');
  }

  return { dependencies, frameworks: [...new Set(frameworks)] };
}

function parsePomXml(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];
  const frameworks: string[] = [];

  // Simple XML parsing for dependencies
  const depMatches = content.matchAll(/<dependency>[\s\S]*?<artifactId>([^<]+)<\/artifactId>[\s\S]*?<\/dependency>/g);
  for (const match of depMatches) {
    const name = match[1];
    dependencies.push({ name });

    if (name.includes('spring')) frameworks.push('Spring');
  }

  return { dependencies, frameworks: [...new Set(frameworks)] };
}

function parseBuildGradle(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];
  const frameworks: string[] = [];

  // Parse implementation/compile dependencies
  const depMatches = content.matchAll(/(?:implementation|compile)\s*['"(]([^'"()]+)['"]/g);
  for (const match of depMatches) {
    const dep = match[1];
    const parts = dep.split(':');
    const name = parts.length >= 2 ? parts[1] : dep;
    dependencies.push({ name });

    if (dep.includes('spring')) frameworks.push('Spring');
    if (dep.includes('ktor')) frameworks.push('Ktor');
  }

  return { dependencies, frameworks: [...new Set(frameworks)] };
}

/**
 * Detects tech stack from processed files.
 * Only checks root-level dependency files.
 */
export const detectTechStack = (processedFiles: ProcessedFile[]): TechStackInfo | null => {
  const result: TechStackInfo = {
    languages: [],
    frameworks: [],
    dependencies: [],
    devDependencies: [],
  };

  let foundAny = false;

  for (const file of processedFiles) {
    // Only check root-level files (no directory separator in path)
    const fileName = file.path.split('/').pop() || file.path;
    if (file.path !== fileName && !file.path.startsWith('./')) {
      // Skip files in subdirectories
      const dirDepth = file.path.split('/').length - 1;
      if (dirDepth > 0) continue;
    }

    const config = DEPENDENCY_FILES[fileName];
    if (config) {
      foundAny = true;
      result.languages.push(config.language);

      const parsed = config.parser(file.content);
      if (parsed.dependencies) {
        result.dependencies.push(...parsed.dependencies);
      }
      if (parsed.devDependencies) {
        result.devDependencies.push(...parsed.devDependencies);
      }
      if (parsed.frameworks) {
        result.frameworks.push(...parsed.frameworks);
      }
      if (parsed.packageManager) {
        result.packageManager = parsed.packageManager;
      }
    }
  }

  if (!foundAny) {
    return null;
  }

  // Deduplicate
  result.languages = [...new Set(result.languages)];
  result.frameworks = [...new Set(result.frameworks)];

  return result;
};

/**
 * Generates tech-stack.md content from detected tech stack.
 */
export const generateTechStackMd = (techStack: TechStackInfo): string => {
  const lines: string[] = ['# Tech Stack', ''];

  // Languages
  if (techStack.languages.length > 0) {
    lines.push('## Languages');
    lines.push('');
    for (const lang of techStack.languages) {
      lines.push(`- ${lang}`);
    }
    lines.push('');
  }

  // Frameworks
  if (techStack.frameworks.length > 0) {
    lines.push('## Frameworks');
    lines.push('');
    for (const fw of techStack.frameworks) {
      lines.push(`- ${fw}`);
    }
    lines.push('');
  }

  // Package Manager
  if (techStack.packageManager) {
    lines.push('## Package Manager');
    lines.push('');
    lines.push(`- ${techStack.packageManager}`);
    lines.push('');
  }

  // Dependencies (limit to top 20 for readability)
  if (techStack.dependencies.length > 0) {
    lines.push('## Dependencies');
    lines.push('');
    const deps = techStack.dependencies.slice(0, 20);
    for (const dep of deps) {
      const version = dep.version ? ` (${dep.version})` : '';
      lines.push(`- ${dep.name}${version}`);
    }
    if (techStack.dependencies.length > 20) {
      lines.push(`- ... and ${techStack.dependencies.length - 20} more`);
    }
    lines.push('');
  }

  // Dev Dependencies (limit to top 10)
  if (techStack.devDependencies.length > 0) {
    lines.push('## Dev Dependencies');
    lines.push('');
    const devDeps = techStack.devDependencies.slice(0, 10);
    for (const dep of devDeps) {
      const version = dep.version ? ` (${dep.version})` : '';
      lines.push(`- ${dep.name}${version}`);
    }
    if (techStack.devDependencies.length > 10) {
      lines.push(`- ... and ${techStack.devDependencies.length - 10} more`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
};
