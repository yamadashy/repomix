# Line Limit Feature - Product Requirements Document

## Overview

### Problem Statement

Users of Repomix often work with large codebases where individual files contain hundreds or thousands of lines of code. When processing these files for AI analysis, the sheer volume of content can:

1. Exceed context window limits of AI models
2. Increase processing costs unnecessarily
3. Make it difficult to focus on the most relevant code sections
4. Slow down analysis and comprehension

Currently, Repomix lacks a mechanism to limit the number of lines processed per file, forcing users to either:
- Accept full file processing with associated costs and limitations
- Manually preprocess files before using Repomix
- Use complex workarounds to achieve desired line limits

### Solution Overview

This PRD outlines the implementation of a `--line` option for Repomix that allows users to specify a maximum number of lines to include per file in the output. This feature will:

- Add a new CLI option `--line` (or `--line-limit`) to specify maximum lines per file
- Process files intelligently to include the most relevant content within the limit
- Maintain existing functionality while providing granular control over output size
- Support all 12 currently supported programming languages
- Integrate seamlessly with existing configuration and output formats

## User Stories and Acceptance Criteria

### Primary User Stories

#### US1: CLI Line Limit Control
**As a** developer working with large codebases  
**I want to** specify a maximum number of lines per file using the `--line` option  
**So that** I can control the output size and focus on the most relevant code sections

**Acceptance Criteria:**
- CLI accepts `--line <number>` option
- Validates that the line limit is a positive integer
- Applies the limit to all processed files
- Shows clear indication when files are truncated
- Maintains file structure and syntax in truncated output

#### US2: Configuration File Support
**As a** developer who frequently uses Repomix  
**I want to** set a default line limit in my configuration file  
**So that** I don't have to specify it manually for each run

**Acceptance Criteria:**
- Configuration schema includes `lineLimit` property
- Default value is `null` (no limit) for backward compatibility
- CLI option overrides configuration file setting
- Configuration validation ensures line limit is positive integer if specified

#### US3: Intelligent Line Selection
**As a** developer analyzing code  
**I want to** see the most important parts of a file when it's truncated  
**So that** I can understand the file's structure and key functionality

**Acceptance Criteria:**
- Prioritizes function/class definitions and imports
- Includes beginning of file (imports, exports, declarations)
- Distributes remaining lines evenly across major code blocks
- Preserves code syntax and structure
- Adds clear truncation indicators

#### US4: Multi-Format Output Support
**As a** developer using different output formats  
**I want to** have line limits applied consistently across XML, Markdown, and plain text outputs  
**So that** I can use my preferred format without losing functionality

**Acceptance Criteria:**
- Line limiting works with all existing output styles
- Truncation indicators are format-appropriate
- File structure is maintained in all formats
- Line counts are accurate in all formats

### Secondary User Stories

#### US5: Progress Reporting
**As a** developer processing large repositories  
**I want to** see when files are being truncated during processing  
**So that** I'm aware of what content is being excluded

**Acceptance Criteria:**
- Progress indicator shows truncation status
- Summary report includes number of truncated files
- File tree indicates which files were truncated
- Optional verbose mode shows truncation details

#### US6: Token Count Integration
**As a** developer monitoring token usage  
**I want to** see how line limiting affects token counts  
**So that** I can optimize my usage for different AI models

**Acceptance Criteria:**
- Token count reflects truncated content only
- Token count tree shows original vs. truncated sizes
- Reports include both line and token statistics
- Integration with existing token counting features

## Technical Requirements and Specifications

### Functional Requirements

#### FR1: CLI Integration
- Add `--line` option to CLI argument parser
- Support both `--line` and `--line-limit` aliases
- Validate input as positive integer
- Provide helpful error messages for invalid inputs
- Support combination with other options (output style, ignore patterns, etc.)

#### FR2: Configuration Schema Extension
- Extend [`configSchema.ts`](src/config/configSchema.ts) to include lineLimit property
- Implement proper validation and default values
- Ensure backward compatibility with existing configurations
- Support environment variable overrides

#### FR3: File Processing Logic
- Modify [`fileProcessContent.ts`](src/core/file/fileProcessContent.ts) to implement line limiting
- Implement intelligent line selection algorithm
- Preserve code structure and syntax
- Handle edge cases (files shorter than limit, empty files, binary files)
- Maintain performance for large files

#### FR4: Output Generation
- Update output generators to handle truncated content
- Add truncation indicators appropriate to each format
- Ensure proper formatting and indentation
- Maintain compatibility with existing output styles

### Non-Functional Requirements

#### NFR1: Performance
- Line limiting should not significantly impact processing speed
- Memory usage should remain efficient for large files
- Implementation should be scalable for repositories with thousands of files

#### NFR2: Compatibility
- Maintain full backward compatibility with existing functionality
- All existing CLI options should work with line limiting
- Configuration files without lineLimit should continue to work
- Output formats should remain consistent with existing behavior

#### NFR3: Reliability
- Handle malformed files gracefully
- Provide clear error messages for invalid inputs
- Maintain data integrity during truncation
- Ensure consistent behavior across platforms

#### NFR4: Usability
- Clear documentation and help text
- Intuitive behavior that matches user expectations
- Helpful feedback when files are truncated
- Consistent experience across different use cases

## Implementation Approach

### Architecture Integration

Based on the existing Repomix architecture, the line limit feature will integrate with the following components:

#### 1. CLI Layer ([`cliRun.ts`](src/cli/cliRun.ts))
```typescript
// Add line option to CLI configuration
{
  name: 'line',
  alias: 'l',
  type: 'number',
  description: 'Maximum number of lines per file',
  defaultValue: null
}
```

#### 2. Configuration Layer ([`configSchema.ts`](src/config/configSchema.ts))
```typescript
// Extend configuration schema
lineLimit: {
  type: 'number',
  minimum: 1,
  nullable: true,
  default: null,
  description: 'Maximum number of lines to include per file'
}
```

#### 3. Action Layer ([`defaultAction.ts`](src/cli/actions/defaultAction.ts))
- Pass line limit configuration to file processing pipeline
- Handle validation and error reporting
- Integrate with existing option processing

#### 4. Core Processing ([`fileProcessContent.ts`](src/core/file/fileProcessContent.ts))
- Implement line limiting algorithm
- Handle different file types and languages
- Preserve code structure and syntax

### Line Limiting Algorithm

The intelligent line selection will follow this approach:

1. **Header Preservation (30% of limit)**
   - Import statements and dependencies
   - Export declarations
   - Type definitions and interfaces
   - Class and function signatures

2. **Core Logic Distribution (60% of limit)**
   - Even distribution across major functions/methods
   - Priority to functions with more complex logic
   - Include key algorithm implementations
   - Preserve error handling and validation

3. **Footer Preservation (10% of limit)**
   - Module exports
   - Event listeners and initializers
   - Closing statements and cleanup

### Language-Specific Considerations

The implementation will handle language-specific patterns:

#### JavaScript/TypeScript
- Preserve import/export statements
- Include function signatures and key implementations
- Handle JSX/TSX components appropriately
- Maintain type definitions

#### Python
- Preserve import statements and docstrings
- Include class definitions and key methods
- Handle decorators and type hints
- Preserve main execution blocks

#### Java/C#
- Preserve package imports and class declarations
- Include method signatures and key implementations
- Handle annotations and generics
- Maintain interface definitions

#### Go
- Preserve package declarations and imports
- Include function signatures and key implementations
- Handle struct definitions and methods
- Maintain interface definitions

#### Other Languages
- Apply similar principles for Ruby, PHP, Rust, C/C++, Swift, Kotlin, Dart
- Adapt to language-specific syntax and conventions

## Success Metrics and Testing Requirements

### Success Metrics

#### Usage Metrics
- Adoption rate of the `--line` option
- Frequency of line limit configuration in config files
- User satisfaction scores through feedback

#### Performance Metrics
- Processing time with line limiting vs. full processing
- Memory usage comparison
- Token count reduction efficiency
- File processing throughput

#### Quality Metrics
- Accuracy of intelligent line selection
- Preservation of code structure and syntax
- User-reported truncation quality
- Error rate and bug reports

### Testing Requirements

#### Unit Tests
- CLI option parsing and validation
- Configuration schema validation
- Line limiting algorithm accuracy
- File processing edge cases
- Language-specific pattern handling

#### Integration Tests
- End-to-end CLI workflows with line limiting
- Configuration file integration
- Output format compatibility
- Multi-file repository processing
- Performance benchmarks

#### Regression Tests
- Backward compatibility verification
- Existing functionality preservation
- Configuration file compatibility
- Output format consistency

#### User Acceptance Tests
- Real-world repository testing
- Large file processing scenarios
- Multi-language codebase testing
- Performance under load

## Documentation Requirements

### User Documentation
- CLI help text updates
- Configuration file documentation
- Usage examples and best practices
- Troubleshooting guide for common issues

### Developer Documentation
- Implementation details and architecture
- Algorithm explanation and rationale
- Testing guidelines and procedures
- Contribution guidelines for feature extensions

### API Documentation
- Configuration schema updates
- New function and type definitions
- Integration points and extensions
- Migration guide for existing users

## Release Plan

### Phase 1: Core Implementation (Sprint 1)
- CLI option integration
- Configuration schema extension
- Basic line limiting algorithm
- Unit test coverage

### Phase 2: Enhancement and Refinement (Sprint 2)
- Intelligent line selection algorithm
- Language-specific optimizations
- Performance improvements
- Integration testing

### Phase 3: Polish and Documentation (Sprint 3)
- User experience refinements
- Comprehensive documentation
- Performance benchmarking
- Release preparation

## Risk Assessment and Mitigation

### Technical Risks

#### Risk 1: Performance Impact
**Description**: Line limiting may significantly slow down file processing
**Mitigation**: Implement efficient algorithms, use streaming processing, add performance benchmarks

#### Risk 2: Code Structure Corruption
**Description**: Truncation may break code syntax or structure
**Mitigation**: Implement syntax-aware truncation, extensive testing with various file types

#### Risk 3: Compatibility Issues
**Description**: New feature may break existing functionality
**Mitigation**: Comprehensive regression testing, backward compatibility verification

### User Experience Risks

#### Risk 1: Confusing Truncation Behavior
**Description**: Users may not understand how lines are selected
**Mitigation**: Clear documentation, visual indicators, verbose mode options

#### Risk 2: Inadequate Line Selection
**Description**: Algorithm may not select most relevant lines
**Mitigation**: User feedback collection, iterative algorithm improvement, customizable strategies

## Dependencies and Research

### Technical Dependencies
- Existing CLI framework and argument parser
- Configuration schema validation system
- File processing pipeline
- Output generation system
- Tree-sitter language parsers

### External Research
- Analysis of similar features in competing tools
- User feedback on preferred truncation behavior
- Performance benchmarks for large file processing
- Best practices for code summarization techniques

## Future Enhancements

### Short-term (Post-Release)
- Customizable line selection strategies
- Integration with AI-powered code summarization
- Advanced filtering options for line selection
- Performance optimizations for very large files

### Long-term (Future Releases)
- Machine learning-based intelligent line selection
- Context-aware truncation based on file relationships
- Advanced visualization of truncated content
- Integration with code analysis tools

## Conclusion

The line limit feature addresses a significant user need for controlling output size when processing large codebases with Repomix. By implementing intelligent line selection and seamless integration with existing functionality, this feature will enhance the tool's usability and effectiveness for AI-assisted code analysis.

The implementation approach leverages the existing architecture while adding minimal complexity, ensuring a maintainable and scalable solution. Comprehensive testing and documentation will ensure a smooth release and positive user experience.