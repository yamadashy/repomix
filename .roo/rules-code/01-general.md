# Roo Code Mode Rules

## Core Workflow Principles for Automations & Refactoring

1. **Always Analyze Code Context Before Editing**
   - Use semantic codebase search via `codebase_search` to understand usage patterns, related logic, and architectural dependencies.
   - Employ MCP tools (such as ast-grep MCP and memory graph) to traverse code relationships and persist insights.

2. **Multi-Step AI Workflows—Inspired by Augment**
   - Break every code task into clear stages: Search → Understand → Plan → Edit → Validate → Document.
   - For orchestrator mode, coordinate each agent step and checkpoint. Always log actions and results as "memories" for future reference.

3. **Semantic Codebase Search First**
   - Utilize Roo's semantic search before writing/refactoring code:
     - Example queries: "Find all API authentication middleware," "Locate database connection setup in src/data," "Show error handling patterns in src/api."
   - Prefer feature-focused and concept-oriented queries to maximize coverage.

4. **AST-Based Safe Refactoring**
   - For any rewrite, use ast-grep MCP to:
     - Analyze structure (dump syntax tree).
     - Detect patterns using YAML-based rules.
     - Preview and confirm all changes before applying.
   - Back up all modified files and generate diffs.

5. **Memory Graph Integration**
   - Before editing or refactoring, retrieve related entities and observations (e.g. deprecated functions, module ownership, prior bug fixes) from the MCP memory graph.
   - After each major automation or refactor, add or update graph nodes to persist new knowledge/context.

6. **Code Quality and Consistency**
   - Write code in strict accordance with workspace coding guidelines.
   - Use descriptive naming (camelCase for JS, snake_case for Python, etc.).
   - Add inline comments for complex logic and JSDoc/Docstring for public APIs.

7. **Unit and Integration Testing Requirement**
   - For every new function, write unit tests.
   - When refactoring, validate that all affected tests still pass or update them as needed.

8. **Reasoning and Explainability**
   - Always explain your plan before showing code.
   - For orchestrator/ask modes, summarize the context, steps taken, and risks.
   - Document known limitations or assumptions.

9. **Agent and Orchestrator Rules**
   - Agents must independently confirm all assumptions via semantic search, MCP facts, or code reading.
   - Orchestrator coordinates agents, reviews checkpoint outputs, and revises instructions as needed.
   - In ask mode, provide concise answers enriched by semantic context and relevant search results.

10. **Incremental and Reversible Changes**
    - Prefer gradual, reversible edits; apply in small batches with clear rollback/backup options.

11. **Accessibility and Responsiveness**
    - For any UI-related code, ensure it meets accessibility standards and adapts to all device sizes.

## Example Agent Workflow for Code Mode

1. **Start with Semantic Search:**
   - Search for the concept: "user profile update workflow."
   - Review results: implementation files, function names, context.

2. **Context/Memory Scan:**
   - Query MCP memory graph for relevant node: "UserProfileModule."
   - Retrieve documentation, known issues, linked entities.

3. **Plan Refactor/Addition:**
   - Outline planned changes referencing findings from semantic search and memory context.
   - Get orchestrator approval if multi-agent.

4. **Edit Code:**
   - Use ast-grep MCP for safe pattern matching/rewrite if structure edit needed.
   - Annotate important changes.

5. **Validate & Document:**
   - Run all tests or relevant subset (unit/integration).
   - Add observations/links to MCP memory graph.
   - Summarize edits in latest commit message.

## Additional Rules

- Always check if `.rooignore` excludes files/directories before processing them.
- Symbolic links in rules directories are supported; skip temp, cache, and log files.
- Use workspace-wide rules to override global organization standards when necessary.
- Respect AGENTS.md agent rules if present.

