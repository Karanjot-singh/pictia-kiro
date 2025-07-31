---
inclusion: always
---

# MCP Tool Usage Guidelines

## Core Principles

- **Document tool selection**: Always explain why a specific MCP was chosen for each task
- **Avoid redundancy**: Don't use multiple tools for the same purpose
- **Rate limit awareness**: Exa and other API-based MCPs have rate limits - use judiciously

## MCP Tool Selection Matrix

### Code & Documentation
- **Context7**: Primary tool for library/framework documentation and API references
- **React Native MCP**: Canonical React Native/Expo patterns and best practices
- **GitMCP**: Repository operations, version control, and codebase analysis

### Problem Solving & Planning
- **Sequential MCP**: Multi-step tasks, complex debugging, and problem decomposition
- **Knowledge-Memory**: Persist project decisions, bugfixes, and patterns across sessions

### External Information
- **Exa MCP**: Real-time web search for current data, package updates, and external resources

### Automation & Visualization
- **Commander MCP**: CLI automation for npm, Expo CLI, git, and terminal tasks
- **Datalayer**: Workflow visualization and debugging complex agent orchestration

## Usage Patterns

### Development Workflow
1. **Start session**: Review Knowledge-Memory for previous decisions and patterns
2. **Code questions**: Use Context7 for documentation, React Native MCP for patterns
3. **Complex tasks**: Use Sequential MCP for planning and step-by-step execution
4. **CLI operations**: Use Commander MCP for automated terminal tasks
5. **External research**: Use Exa MCP for current information outside the codebase

### Pictia-Specific Guidelines
- **Google Photos API**: Use Context7 for API documentation and integration patterns
- **React Native/Expo**: Prefer React Native MCP for mobile-specific implementations
- **State management**: Use Context7 for Redux Toolkit and RTK Query patterns
- **Authentication**: Use Context7 for Expo AuthSession and OAuth implementations

### Error Handling
- **Rate limits**: If Exa returns rate limit errors, avoid using it temporarily
- **Failed operations**: Document failures in Knowledge-Memory for future reference
- **Complex debugging**: Use Sequential MCP to break down problems systematically

## Tool-Specific Guidelines

### Context7 MCP
- **When to use**: Library documentation, API references, code examples
- **Priority**: Default choice for all code/library lookup tasks
- **Example use cases**: React Native components, Redux Toolkit patterns, Expo APIs

### Sequential MCP
- **When to use**: Complex, multi-step tasks requiring planning and rationale
- **Benefits**: Prevents shortcuts, ensures thorough analysis
- **Example use cases**: Large refactors, debugging complex issues, feature planning

### Knowledge-Memory MCP
- **Session start**: Always review stored knowledge for context
- **What to store**: Bugfixes, architectural decisions, patterns, gotchas
- **Recall triggers**: Similar issues, repeated problems, onboarding questions

### React Native MCP
- **When to use**: Mobile-specific implementations, Expo standards
- **Focus areas**: Navigation patterns, platform-specific code, performance optimizations
- **Integration**: Combine with Context7 for comprehensive mobile development guidance

### Commander MCP
- **When to use**: Terminal automation, repetitive CLI tasks
- **Common tasks**: npm scripts, Expo CLI commands, git operations
- **Benefits**: Consistent execution, reduced manual errors

### GitMCP
- **When to use**: Version control operations, repository analysis
- **Capabilities**: Branch management, commit history, diff analysis
- **Security**: Provides audit trail for all git operations

### Exa MCP
- **When to use**: Current information not available in codebase
- **Rate limits**: Use sparingly, respect API limitations
- **Use cases**: Package updates, external documentation, current best practices

### Datalayer MCP
- **When to use**: Complex workflow debugging, agent orchestration issues
- **Benefits**: Visual representation of tool calls and memory relationships
- **Debugging**: Helps identify bottlenecks and optimization opportunities