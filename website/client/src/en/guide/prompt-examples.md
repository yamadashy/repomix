# Prompt Examples

## Code Review

### Architecture Review
```
Analyze this codebase's architecture:
1. Evaluate the overall structure and patterns
2. Identify potential architectural issues
3. Suggest improvements for scalability
4. Note areas that follow best practices

Focus on maintainability and modularity.
```

### Security Review
```
Perform a security review of this codebase:
1. Identify potential security vulnerabilities
2. Check for common security anti-patterns
3. Review error handling and input validation
4. Assess dependency security

Provide specific examples and remediation steps.
```

### Performance Review
```
Review the codebase for performance:
1. Identify performance bottlenecks
2. Check resource utilization
3. Review algorithmic efficiency
4. Assess caching strategies

Include specific optimization recommendations.
```

## Documentation Generation

### API Documentation
```
Generate comprehensive API documentation:
1. List and describe all public endpoints
2. Document request/response formats
3. Include usage examples
4. Note any limitations or constraints
```

### Developer Guide
```
Create a developer guide covering:
1. Setup instructions
2. Project structure overview
3. Development workflow
4. Testing approach
5. Common troubleshooting steps
```

### Architecture Documentation
```
Document the system architecture:
1. High-level overview
2. Component interactions
3. Data flow diagrams
4. Design decisions and rationale
5. System constraints and limitations
```

## Analysis and Improvement

### Dependency Analysis
```
Analyze the project dependencies:
1. Identify outdated packages
2. Check for security vulnerabilities
3. Suggest alternative packages
4. Review dependency usage patterns

Include specific upgrade recommendations.
```

### Test Coverage
```
Review the test coverage:
1. Identify untested components
2. Suggest additional test cases
3. Review test quality
4. Recommend testing strategies
```

### Code Quality
```
Assess code quality and suggest improvements:
1. Review naming conventions
2. Check code organization
3. Evaluate error handling
4. Review commenting practices

Provide specific examples of good and problematic patterns.
```

## Tips for Better Results

1. **Be Specific**: Include clear objectives and evaluation criteria
2. **Set Context**: Specify your role and expertise level needed
3. **Request Format**: Define how you want the response structured
4. **Prioritize**: Indicate which aspects are most important

## Model-Specific Notes

### Claude
- Use XML output format
- Place important instructions at the end
- Specify response structure

### ChatGPT
- Use Markdown format
- Break large codebases into sections
- Include system role prompts

### Gemini
- Works with all formats
- Focus on specific areas per request
- Use step-by-step analysis

## Model-Specific Optimizations

### For Claude

Claude performs well with XML-formatted input. Use these strategies:

```
<instructions>
Analyze this codebase packaged by Repomix. Focus on:
<objectives>
- Overall architecture evaluation
- Code quality assessment
- Potential security issues
- Performance optimizations
</objectives>

Please structure your response with clear sections for each objective.
</instructions>
```

Key tips for Claude:
- Place important instructions at the beginning and end of your prompt
- Use XML tags to clearly separate parts of your prompt
- Specify exactly how you want the response structured
- Use the `--style xml` option with Repomix for optimal results

### For ChatGPT/GPT-4

GPT models work well with both XML and Markdown formats. Effective prompting strategies:

```
# Code Analysis Request

I'm sharing a codebase packaged with Repomix. Please analyze it and provide insights on:

1. Architecture patterns used
2. Code quality and maintainability
3. Potential performance bottlenecks
4. Recommendations for improvement

Focus particularly on the src/core modules as they contain the most critical logic.

## Response Format
Please structure your analysis with clear headings and bullet points for easy reading.
```

Key tips for GPT models:
- Use numbered lists for multiple requests
- Start with a clear task description
- Specify which parts of the codebase are most important
- Use the `--style markdown` option with Repomix

### For Gemini

Gemini works well with structured prompts and supports both XML and Markdown:

```
TASK: Analyze the provided codebase packaged by Repomix

FOCUS AREAS:
- Code organization and structure
- API design and implementation
- Error handling patterns
- Testing coverage

CONTEXT:
This is a TypeScript project using Express for the backend.
I'm particularly interested in improving the error handling.

OUTPUT FORMAT:
1. Executive summary (2-3 paragraphs)
2. Section for each focus area with specific examples
3. Prioritized recommendations
```

Key tips for Gemini:
- Use clear section headings in ALL CAPS
- Be explicit about the technologies used
- Specify exactly what kind of output you want
- Works well with both `--style markdown` and `--style xml` options

## Real-World Scenarios

### Refactoring Legacy Code

```
I'm sharing my legacy JavaScript application packaged with Repomix. 
I want to refactor it to modern standards with TypeScript and React.

Please analyze the codebase and:
1. Identify the main components that need to be converted to React
2. Suggest a step-by-step migration strategy
3. Provide examples of how key parts could be rewritten in TypeScript
4. Highlight any potential challenges in the migration

The application is currently using jQuery and a custom MVC pattern.
```

### Improving Test Coverage

```
This is our backend service codebase packaged with Repomix.
We currently have low test coverage (around 30%) and want to improve it.

Please:
1. Identify critical components that should be tested first
2. Suggest testing strategies for different types of components
3. Provide sample test cases for 2-3 key functions
4. Recommend tools and libraries that could help us improve our testing

We're using Express, MongoDB, and currently Jest for testing.
```

### Security Audit

```
I need a security audit of our web application packaged with Repomix.

Please analyze the codebase for:
1. Potential security vulnerabilities (OWASP Top 10)
2. Insecure data handling practices
3. Authentication and authorization weaknesses
4. API security issues

For each issue found, please provide:
- Severity rating
- Description of the vulnerability
- Location in the code
- Recommended fix with code example if possible
```
