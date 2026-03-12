# Repomix Release Note Writing Guidelines

Based on analysis of existing release notes in `.github/releases/`, this document outlines the patterns, style, and format for writing consistent Repomix release notes.

## Reference Material

**Important**: The `.github/releases/` directory contains the actual GitHub release notes used for all past releases. Always reference these files when writing new release notes to maintain consistency with the established patterns, tone, and format. The release notes are organized by version (v0.1.x, v0.2.x, v0.3.x, v1.x) and provide concrete examples of how different types of features and improvements should be presented.

## Overall Structure and Format

### Header Pattern
- Start with a compelling one-line summary that captures the main theme
- Use action words and highlight key benefits for AI analysis/user experience
- End with an exclamation mark for enthusiasm

**Examples:**
- "This release introduces git commit history integration and enhanced binary file detection, making Repomix more informative for AI analysis and user visibility!"
- "This release brings token optimization and MCP Structured Output support, making Repomix more efficient and reliable for AI integration!"
- "This release brings **Bun runtime support** to Repomix!"

## Section Structure

### Required Sections

#### 1. What's New 🚀 or Improvements ⚡
- Use **What's New 🚀** for completely new features or capabilities
- Use **Improvements ⚡** for enhancements to existing features, new options added to existing commands, or incremental improvements
- Use `###` for feature subsections
- Include PR numbers and related issue numbers in parentheses: `(#PR, #issue)`
- Lead with the most significant features first

#### 2. How to Update
- Always the final section before footer
- Use standard npm update command:
  ```bash
  npm update -g repomix
  ```
- Include alternative package managers when relevant (Bun, etc.)

#### 3. Footer
- Consistent closing message:
  ```
  ---
  
  As always, if you have any issues or suggestions, please let us know on GitHub issues or our [Discord community](https://discord.gg/wNYzTwZFku).
  ```

### Optional Sections (Use When Relevant)

#### Internal Changes 🔧
- **Generally avoid including this section** - internal changes are typically not relevant to users
- Only include if the internal change has direct user-visible benefits or impacts
- For infrastructure, CI/CD, or internal improvements that don't affect user experience, omit entirely

#### Website Enhancements 🌐
- For Repomix website updates

#### Documentation 📚
- For documentation improvements
- Include links to the relevant documentation pages (e.g., README sections, website pages)

## Writing Style and Tone

### Language Characteristics
- **Enthusiastic but professional**: Use exclamation marks, emojis, but maintain clarity
- **User-focused**: Emphasize benefits for AI analysis, development workflows, and user experience
- **Technical precision**: Include exact commands, configuration examples, and technical details
- **Concise explanations**: Get to the point quickly, expand with examples when helpful

### Key Phrases and Patterns
- "This release introduces/brings..."
- "Added the powerful `--option-name` option..."
- "Now supports..." 
- "Special thanks to @username for..."
- "making it easier to..." / "making Repomix more..."

## Content Guidelines

### Feature Descriptions
1. **Lead with the benefit**: Start with what the user gains
2. **Include technical details**: Show command examples and configuration options
3. **Provide context**: Explain why the feature matters
4. **Credit contributors**: Always acknowledge PR authors

### Code Examples
- Always use proper markdown code blocks with language specification
- Include both CLI usage and configuration file examples when applicable
- Show realistic examples, not just syntax

**Example Pattern:**
```bash
# Enable the option
repomix --option-name

# Enable in config file
{
  "output": {
    "optionName": true
  }
}
```

### PR References and Credits
- Include PR numbers and related issue numbers for all features: `### Feature Name (#123, #456)`
  - PR number comes first, followed by the issue number it closes/fixes
  - Check PR body for "Closes #xxx", "Fixes #xxx", or "addresses #xxx" to find related issues
- Credit contributors: `Special thanks to @username for this contribution! 🎉`
- For first-time contributors, mention it: `Special thanks to @BBboy01 for their first contribution...`

## Specific Writing Patterns

### Feature Naming
- Use descriptive, benefit-focused titles
- Include technical terms when they add clarity
- **Examples:**
  - "Git Commit History Integration" (not just "Git Integration")
  - "Automatic Base64 Data Truncation for Token Savings" (emphasizes the benefit)
  - "Token Count Summarization" (clear and specific)

### Technical Explanations
- Start with the high-level benefit
- Follow with technical implementation details
- Include practical examples
- End with configuration options

### Version-Specific Patterns
- **Major features**: Get their own subsection with detailed explanation
- **Minor improvements**: Can be listed as bullet points
- **Breaking changes**: Should be highlighted prominently (though rare in recent releases)

## Quality Checklist

Before publishing, verify:

- [ ] Header captures the release theme with enthusiasm
- [ ] All features include PR references and related issue numbers where applicable
- [ ] "What's New" vs "Improvements" is used appropriately (new features vs enhancements)
- [ ] Contributors are credited appropriately  
- [ ] Code examples are properly formatted and realistic
- [ ] Benefits for AI analysis/user workflows are clearly stated
- [ ] Commands can be copy-pasted and work as shown
- [ ] Documentation sections include links to relevant pages
- [ ] Consistent emoji usage across sections
- [ ] Footer message is identical to previous releases
- [ ] Links to Discord and GitHub are correct

## Verification Commands

When writing release notes, use these commands to verify content accuracy:

```bash
# Verify issue content
gh issue view <issue-number>

# Verify PR content  
gh pr view <pr-number>

# Check contributor information
gh pr view <pr-number> --json author
```

This ensures accurate descriptions and proper attribution in release notes.
