# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands
- Build: `npm run build` (TypeScript compilation)
- Watch: `npm run watch` (TypeScript compilation in watch mode)
- Start: `npm run start` (run the server)
- Debug: `npm run start:debug` (run with debugging enabled)
- Test all: `npm test` (runs all tests in the test directory)
- Test single: `node test/[test-filename].js` (run a specific test)
- View logs: `npm run logs:view` (view fuzzy search logs)
- Analyze logs: `npm run logs:analyze` (analyze fuzzy search logs)

## Project Structure
- `/src`: Main TypeScript source code
  - `/src/tools`: Core functionality for file operations, command execution, etc.
  - `/src/handlers`: Request handlers for different tool types
  - `/src/utils`: Utility functions including logging mechanisms
- `/scripts`: Utility scripts for log management
- `/test`: Test files 

## Key Features & Implementation Notes
- **Line-based File Reading**: Uses streaming with readline for memory efficiency
- **Binary File Handling**: Enforces size limits (configurable, default 10MB)
- **Audit Logging**: All tool calls logged with automatic rotation and retention
- **Configuration**: User settings stored in `~/.devcontrol-mcp/config.json`
- **Log Files**: Stored in `~/.devcontrol-mcp` directory

## Configuration Options
Key configuration options to be aware of:
- `fileReadLineLimit`: Default number of lines to read (default: 1000)
- `fileWriteLineLimit`: Maximum lines for writing (default: 50)
- `maxLineCountLimit`: Line count limit for reading (default: 1000000)
- `binaryFileSizeLimit`: Maximum binary file size in bytes (default: 10MB)
- `allowedDirectories`: Paths the server can access (empty array for full access)

## Code Style & Conventions
- Use ES Modules (import/export) - project has "type": "module"
- TypeScript strict mode enabled
- Node.js v18+ required
- Zod for schema validation
- Error handling should use try/catch blocks with descriptive error messages
- Use camelCase for variables/functions, PascalCase for types/interfaces
- Maintain consistent indentation (2 spaces)
- Descriptive variable names that reflect purpose
- Prefer async/await over callbacks
- Import statements should be organized by external, then internal dependencies

## Security Considerations
- All file operations should check file paths against allowedDirectories
- All command executions should check against blockedCommands list
- Binary files should be checked against size limits to prevent memory exhaustion
- Validate user input for security issues before passing to filesystem or command tools
- Prefer streaming approaches for handling large files