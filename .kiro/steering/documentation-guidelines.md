---
inclusion: always
---

# Documentation Guidelines

## Internal Reference Files

When creating markdown files for development reference, debugging guides, or temporary documentation during task execution:

- **Always create them in the `internal/` folder** within the project directory
- These files are for development reference only and should not clutter the main project structure
- Examples of internal documentation:
  - OAuth setup guides
  - Debugging instructions
  - Build configuration notes
  - API reference materials
  - Troubleshooting guides

## Project Documentation Structure

```
project-root/
├── internal/           # Development reference files (temporary/debugging)
│   ├── oauth-setup.md
│   ├── debug-guide.md
│   └── build-notes.md
├── README.md          # Main project documentation
├── CONTRIBUTING.md    # Contribution guidelines (if needed)
└── src/               # Source code
```

## Guidelines

1. **Internal folder**: Use `internal/` for all temporary reference documentation
2. **Main documentation**: Keep only essential docs in the project root
3. **Clean up**: Remove internal docs when no longer needed
4. **Naming**: Use descriptive names for internal reference files

This keeps the project structure clean while providing necessary development references.