**Before we start: This thing can completely destroy your system, files , projects and even worse... so be careful. By default this thing has permission to do whatever it wants on your computer.**

# DevControlMCP

> **IMPORTANT NOTE**: This project is originally based on the [wonderwhy-er/DesktopCommanderMCP](https://github.com/wonderwhy-er/DesktopCommanderMCP) project. It started as a telemetry-free version and has been transformed into a full fork, the main difference is that it is telemetry free and the license will always be MIT. no new features or anything, actually we will probably be behind the main version and we may strip some features down to keep the bare minimum and avoid tool bloating.  but no telmetry. no license change.

## Overview

DevControlMCP is an MCP (Model Context Protocol) tool that enables Claude desktop app to execute terminal commands and interact with your file system. It turns Claude into a powerful assistant for coding, system management, and file operations.

## Features

- **Terminal Operations**: Execute commands with output streaming, timeouts, and background execution
- **Process Management**: List and manage running processes
- **File Operations**: Read/write files, create/list directories, move files, and get metadata
- **Advanced Search**: Find files by name or search within file contents using ripgrep
- **Code Editing**: Make surgical text replacements or full file rewrites
- **URL Content**: Fetch and process content from URLs
- **Claude Code Integration**: Delegate complex tasks to Claude Code CLI instances via the `claude_code` meta-tool
- **Line-based File Reading**: Read files with line offset and limits for better handling of large files
- **Audit Logging**: Track all tool calls with automatic log rotation
- **Fuzzy Search Logging**: Comprehensive logging and troubleshooting for search operations
- **Custom Command System**: Create reusable command templates with parameter validation and security integration
- **Hotkey System**: Single-letter shortcuts that delegate to existing MCP tools for quick access

## Installation

### Prerequisites
- Node.js v18 or higher
- Claude Desktop app with Pro subscription
- Claude CLI installed globally (for `claude_code` tool) - install with `npm run install:claude-cli`

### Quick Install

### Local Installation
```bash
git clone https://github.com/regismesquita/DevControlMCP.git
cd DevControlMCP
npm run setup
```

### Claude CLI Setup (Optional)
The `claude_code` tool requires the Claude CLI to be installed and configured:

```bash
# Install Claude CLI
npm run install:claude-cli

# One-time permission acceptance (required)
claude --dangerously-skip-permissions
# Follow the prompts to accept permissions
```

**Note**: The `--dangerously-skip-permissions` flag is required for the `claude_code` tool to function without interactive prompts.

### Logging Utilities

The following npm scripts are available for working with fuzzy search logs:

```bash
# View recent fuzzy search logs with detailed formatting
npm run logs:view

# View more logs by specifying a count
npm run logs:view -- --count 20

# Analyze logs with statistics and recommendations
npm run logs:analyze

# Export logs to JSON or CSV format
npm run logs:export

# Clear logs (with confirmation prompt)
npm run logs:clear

# Clear logs without prompt
npm run logs:clear -- --force
```

#### Audit Logging

All tool calls are automatically logged to `~/.devcontrol-mcp/tool-calls.log` for auditing purposes. The log file is automatically rotated when it reaches 10MB in size. The system retains the 5 most recent log files and automatically removes older logs to prevent unbounded disk usage.

Tool call logs include:
- Timestamp
- Tool name
- Arguments passed to the tool (when applicable)

## Available Tools

| Category | Tool | Description |
|----------|------|-------------|
| **Configuration** | `get_config` | Get the complete server configuration |
| | `set_config_value` | Set a specific configuration value |
| **Terminal** | `execute_command` | Run a terminal command |
| | `read_output` | Read output from a running session |
| | `force_terminate` | Stop a running terminal session |
| | `list_sessions` | List all active terminal sessions |
| | `list_processes` | List all running processes |
| | `kill_process` | Terminate a process by PID |
| **Filesystem** | `read_file` | Read local files or URLs with line offset and limits |
| | `read_multiple_files` | Read multiple files at once |
| | `write_file` | Write to a file (replace contents) |
| | `create_directory` | Create a new directory |
| | `list_directory` | List files/directories |
| | `move_file` | Move or rename files |
| | `search_files` | Find files by name |
| | `search_code` | Search for patterns in file contents |
| | `get_file_info` | Get file metadata |
| **Text Editing** | `edit_block` | Make surgical text replacements |
| **Meta-Tool** | `claude_code` | Execute prompts via Claude Code CLI with full capabilities |
| **Command System** | `custom_command` | Execute custom command templates with parameter substitution |
| | `hotkey` | Execute single-letter shortcuts that delegate to MCP tools |
| | `command_help` | Get help and examples for custom commands |
| | `hotkey_help` | Get help and list of available hotkeys |

## Text Editing Example

```
filepath.ext
<<<<<<< SEARCH
content to find
=======
new content
>>>>>>> REPLACE
```

## Claude Code Meta-Tool

The `claude_code` tool allows you to delegate complex tasks directly to Claude Code CLI instances. This is particularly useful for:

- Complex multi-step coding tasks
- Advanced Git operations  
- Terminal command sequences
- Web research and summarization
- Tasks requiring specialized Claude Code capabilities

### Usage

```json
{
  "prompt": "Refactor this function to use async/await",
  "workFolder": "/path/to/project", 
  "tools": ["Bash", "Read", "Write", "Edit"]
}
```

### Parameters

- **`prompt`** (required): Natural language instruction for Claude Code
- **`workFolder`** (optional): Absolute path to working directory
- **`tools`** (optional): Array of Claude tools to enable (e.g., ["Bash", "Read", "Write"])

### Configuration

Configure Claude CLI paths in your DevControlMCP config:

```json
{
  "claudeCliPath": "/custom/path/to/claude",
  "claudeCliName": "claude-custom"
}
```

### Security Note

⚠️ **IMPORTANT**: The `claude_code` tool bypasses DevControlMCP's internal permission system (`allowedDirectories`, `blockedCommands`) because it delegates to an external Claude CLI process. The Claude CLI operates with its own (skipped) permissions.

## Command System

The DevControlMCP command system allows you to create reusable command templates and single-letter hotkeys for frequently used operations. This system includes comprehensive parameter validation, security integration, and hot-reloading capabilities.

### Custom Commands

Custom commands are reusable templates with parameter substitution that get executed as terminal commands. They support:

- **Template Parameters**: Use `{{parameter}}` syntax for dynamic values
- **Parameter Validation**: String, number, boolean, and enum types with constraints
- **Security Integration**: Automatic checking against `blockedCommands` configuration
- **Risk Analysis**: Templates are analyzed for security risks (high/medium/low)

#### Example Custom Command

```json
{
  "name": "deploy_app",
  "description": "Deploy application to specified environment",
  "template": "npm run deploy --env={{environment}} --version={{version}}",
  "parameters": {
    "environment": {
      "type": "enum",
      "enum": ["staging", "production"],
      "required": true,
      "description": "Target deployment environment"
    },
    "version": {
      "type": "string",
      "required": true,
      "description": "Version to deploy"
    }
  }
}
```

#### Using Custom Commands

Execute with the `custom_command` tool:

```json
{
  "name": "deploy_app",
  "parameters": {
    "environment": "staging",
    "version": "1.2.3"
  }
}
```

### Hotkeys

Hotkeys are single-letter shortcuts that delegate to existing MCP tools. They provide:

- **Quick Access**: Single letter execution (e.g., 'p' for process list)
- **Tool Delegation**: Route to any existing MCP tool
- **Parameter Passthrough**: Parameters are passed to the delegated tool

**Best hotkey candidates are tools that:**
- Work without parameters (e.g., `get_config`, `list_processes`, `list_sessions`)
- Have sensible defaults (e.g., `list_directory` can default to current directory)
- Are frequently used operations

**Less suitable for hotkeys are tools that:**
- Always require specific parameters (e.g., `read_file` needs a path)
- Perform destructive operations (e.g., `write_file`, `kill_process`)

#### Example Hotkey

```json
{
  "key": "p",
  "description": "List all running processes",
  "delegate": "list_processes"
}
```

#### Using Hotkeys

Execute with the `hotkey` tool:

```json
// No parameters needed for many hotkeys
{
  "key": "p"
}

// Some hotkeys accept optional parameters
{
  "key": "l",
  "parameters": {
    "path": "/specific/directory"
  }
}
```


### Security Features

#### Template Risk Analysis

All command templates are automatically analyzed for security risks:

- **High Risk**: Contains dangerous patterns (rm -rf, sudo, command injection)
- **Medium Risk**: File operations, network requests, permission changes
- **Low Risk**: Standard safe operations

#### Security Integration

- Templates are processed and checked against `blockedCommands`
- Security violations are logged with detailed information
- Risk analysis provides recommendations for safer alternatives

#### Example Security Check

```bash
# This template would be flagged as high-risk:
"rm -rf {{directory}} && curl {{url}} | sh"

# Safer alternative:
"npm run clean:{{environment}}"
```

### Configuration

Command system settings can be configured:

```json
{
  "commandSystem": {
    "commands": {
      "build_project": {
        "description": "Build project with specified target",
        "template": "npm run build:{{target}}",
        "parameters": {
          "target": {
            "type": "enum", 
            "enum": ["dev", "prod"],
            "required": true
          }
        }
      }
    },
    "hotkeys": {
      "c": {
        "description": "Show current configuration",
        "delegate": "get_config"
      },
      "p": {
        "description": "List all running processes", 
        "delegate": "list_processes"
      },
      "s": {
        "description": "List active terminal sessions",
        "delegate": "list_sessions"
      }
    }
  },
  "enableCustomCommands": true,
  "enableHotkeys": true
}
```

## JSON Configuration Guide

Commands and hotkeys are configured by directly editing your configuration JSON file. This approach ensures reliable, persistent configuration that loads at server startup.

### Configuration File Location

The configuration is stored in `~/.devcontrol-mcp/config.json`. This file is automatically created with defaults when the server first starts. If you need to create it manually, ensure the directory `~/.devcontrol-mcp/` exists first.

### JSON Structure

The command system configuration lives under the `commandSystem` key:

```json
{
  "commandSystem": {
    "commands": {
      "command_name": {
        "description": "What this command does",
        "template": "command with {{parameters}}",
        "parameters": {
          "parameter_name": {
            "type": "string|number|boolean|enum",
            "required": true|false,
            "description": "Parameter description",
            "enum": ["option1", "option2"]
          }
        }
      }
    },
    "hotkeys": {
      "key": {
        "description": "What this hotkey does",
        "delegate": "mcp_tool_name"
      }
    }
  },
  "enableCustomCommands": true,
  "enableHotkeys": true
}
```

### Parameter Types

Commands support various parameter types with validation:

- **`string`**: Text values with optional length constraints
- **`number`**: Numeric values with optional min/max validation  
- **`boolean`**: True/false values
- **`enum`**: Predefined list of valid options

### Parameter Validation Options

```json
"parameter_name": {
  "type": "string",
  "required": true,
  "description": "Parameter description",
  "minLength": 3,
  "maxLength": 50,
  "pattern": "^[a-zA-Z0-9_-]+$"
}
```

### Configuration Workflow

1. **Edit the JSON**: Modify `~/.devcontrol-mcp/config.json` directly
2. **Restart Claude Desktop**: Configuration loads only at startup
3. **Use Commands**: Custom commands and hotkeys are immediately available

### Validation and Error Handling

- Configuration is validated at startup
- Invalid JSON or command definitions prevent server startup
- Check Claude Desktop logs for specific error details
- Use `command_help` and `hotkey_help` tools to verify loaded configuration

Example validation error in logs:
```
[ERROR] Command system validation failed: Command 'deploy_app' template contains undefined parameter: {{typo_parameter}}. Available parameters: environment, version
```

### Example Configurations

#### Development Commands

```json
{
  "commandSystem": {
    "commands": {
      "test_module": {
        "description": "Run tests for specific project module",
        "template": "npm test -- --testPathPattern={{module}}",
        "parameters": {
          "module": {
            "type": "string",
            "required": true,
            "description": "Module to test",
            "pattern": "^[a-zA-Z0-9_/-]+$"
          }
        }
      },
      "build_env": {
        "description": "Build project for specified environment",
        "template": "npm run build:{{environment}}",
        "parameters": {
          "environment": {
            "type": "enum",
            "enum": ["dev", "staging", "production"],
            "required": true,
            "description": "Target environment"
          }
        }
      },
      "git_push": {
        "description": "Push to remote branch with upstream tracking",
        "template": "git push -u origin {{branch}}",
        "parameters": {
          "branch": {
            "type": "string",
            "required": true,
            "description": "Branch name to push"
          }
        }
      }
    },
    "hotkeys": {
      "p": {
        "description": "List all running processes",
        "delegate": "list_processes"
      },
      "c": {
        "description": "Show current configuration",
        "delegate": "get_config"
      },
      "s": {
        "description": "List active terminal sessions",
        "delegate": "list_sessions"
      },
      "l": {
        "description": "List current directory contents",
        "delegate": "list_directory"
      }
    }
  }
}
```

#### System Administration Commands

```json
{
  "commandSystem": {
    "commands": {
      "service_control": {
        "description": "Control system services",
        "template": "sudo systemctl {{action}} {{service}}",
        "parameters": {
          "action": {
            "type": "enum",
            "enum": ["start", "stop", "restart", "status"],
            "required": true,
            "description": "Service action"
          },
          "service": {
            "type": "string",
            "required": true,
            "description": "Service name"
          }
        }
      },
      "disk_usage": {
        "description": "Check disk usage for directory",
        "template": "du -sh {{directory}}",
        "parameters": {
          "directory": {
            "type": "string",
            "required": false,
            "description": "Directory to check (defaults to current)"
          }
        }
      }
    }
  }
}
```

### Best Practices

#### JSON Editing Guidelines

- **Backup First**: Copy your working config before making changes
- **Use a JSON Validator**: Validate syntax before restarting Claude Desktop
- **Start Small**: Add one command/hotkey at a time to isolate issues
- **Test Parameters**: Verify parameter validation works as expected
- **Use Descriptive Names**: Choose clear, memorable command and parameter names

#### Security Considerations

- **Avoid Dangerous Commands**: Don't create templates with `rm -rf`, `sudo` without constraints
- **Validate Input**: Use `enum` types for limited options, `pattern` for format validation
- **Parameterize Safely**: Don't embed sensitive data directly in templates
- **Check Risk Analysis**: Review security warnings in logs for high-risk templates

#### Performance Tips

- **Minimize Complexity**: Keep parameter validation simple for faster execution
- **Use Required Params**: Mark essential parameters as required to prevent errors
- **Group Related Commands**: Organize similar commands together for easier maintenance
- **Document Purpose**: Include clear descriptions for all commands and parameters

### Migration from Management Tools

If you were previously using the management tools (`add_command`, `add_hotkey`, `remove_command`, etc.), here's how to migrate to the new JSON-based approach:

#### What Changed

- **No More Management Tools**: The `add_command`, `add_hotkey`, `remove_command`, `remove_hotkey`, and `get_command_details` tools have been removed
- **No Hot-Reloading**: Configuration changes require restarting Claude Desktop
- **JSON-Only Configuration**: Commands and hotkeys are configured by editing the JSON file directly

#### Migration Steps

1. **Export Current Configuration**: Use `get_config` tool to see your current command system configuration
2. **Copy to JSON File**: Manually copy the `commandSystem` section to `~/.devcontrol-mcp/config.json`
3. **Restart Claude Desktop**: Configuration is now loaded only at startup
4. **Verify Commands**: Use `command_help` and `hotkey_help` to confirm your commands loaded correctly

#### Benefits of the New Approach

- **Reliability**: No risk of hot-reload failures or partial updates
- **Simplicity**: Fewer tools and concepts to understand
- **Performance**: Faster startup without hot-reload monitoring
- **Predictability**: Configuration state is always known and consistent

## Configuration Options

The following configuration options can be set using the `set_config_value` tool:

| Option | Description | Default |
|--------|-------------|---------|
| `allowedDirectories` | Directories that can be accessed (empty array for full access) | `[]` |
| `blockedCommands` | Commands that cannot be executed | Various system commands |
| `defaultShell` | Shell to use for command execution | `bash` (Unix) or `powershell.exe` (Windows) |
| `fileReadLineLimit` | Maximum number of lines to read from a file | `1000` |
| `fileWriteLineLimit` | Maximum number of lines to write to a file | `50` |
| `maxLineCountLimit` | Maximum line count for file reading (prevents memory issues on very large files) | `1000000` |
| `binaryFileSizeLimit` | Maximum size for binary files in bytes | `10485760` (10MB) |
| `claudeCliPath` | Absolute path to Claude CLI executable | `undefined` |
| `claudeCliName` | Name of Claude CLI binary | `'claude'` |
| `enableCustomCommands` | Enable/disable custom command system | `true` |
| `enableHotkeys` | Enable/disable hotkey system | `true` |
| `commandSystem` | Configuration object for custom commands and hotkeys | `{}` |

## Customizing Tool Descriptions

You can customize the descriptions of any tool by setting environment variables. This allows you to tailor tool descriptions to your specific needs without modifying the code.

The environment variable pattern is:

```
MCP_DESC_<TOOL_NAME>="Your custom tool description"
```

Where `<TOOL_NAME>` is the uppercase name of the tool with any non-alphanumeric characters replaced by underscores.

Examples:

```bash
# Custom description for get_config tool
export MCP_DESC_GET_CONFIG="View the current configuration settings for the DevControlMCP server"

# Custom description for execute_command tool
export MCP_DESC_EXECUTE_COMMAND="Run a command in the terminal, with output streaming and timeout support"

# Custom description for read_file tool with more specific details for your environment
export MCP_DESC_READ_FILE="Read a file from your project directory or fetch content from a URL"
```

These environment variables can be set in your shell profile for persistence or right before launching the server.

## Security Notes

- Set `allowedDirectories` to control filesystem access for most tools
- Be cautious when running terminal commands as they have full access to your system
- Use a separate chat for configuration changes
- **`claude_code` tool**: Bypasses internal permission controls and delegates to Claude CLI with `--dangerously-skip-permissions`
- Monitor the audit logs regularly to track tool usage
- Set appropriate limits for binary file size and line reading to prevent memory exhaustion
- This tool can completely destroy your system, files, projects and even worse... so be careful. By default, DevControlMCP tools have broad permissions. The `claude_code` tool, in particular, operates with full system access by design, bypassing DevControlMCP's specific permission settings.

## What's New in v0.2.0

This release includes several improvements from the upstream project:

- **Line-based File Reading**: Files are now read line by line instead of character by character, with configurable limits
- **Streaming File Reading**: Using readline for memory-efficient processing of large files
- **Binary File Protection**: Size limits for binary files to prevent memory exhaustion
- **Audit Logging**: All tool calls are now logged with timestamps and arguments
- **Log Retention Policy**: Automatic cleanup of old log files to prevent unbounded disk usage
- **Fuzzy Search Logging**: Comprehensive logging for edit operations with similarity scores and execution times
- **Logging Utilities**: New npm scripts for viewing, analyzing, exporting, and clearing logs
- **Levenshtein Distance**: Added fastest-levenshtein library for improved string comparison
- **Enhanced Configuration Options**: New options for controlling line limits, binary file size limits, and maximum line counts
- **Customizable Tool Descriptions**: Easily change tool descriptions using environment variables with length validation
- **Claude Code Integration**: New meta-tool for delegating complex tasks to Claude Code CLI instances
- **Custom Command System**: Create reusable command templates with parameter validation, security integration, and risk analysis
- **Hotkey System**: Single-letter shortcuts that delegate to existing MCP tools for quick access
- **Advanced Security Features**: Template risk analysis, security violation reporting, and comprehensive parameter validation

All features have been implemented without telemetry, maintaining our commitment to privacy.

## License

This project is licensed under the MIT License.

Original work by Eduard Ruzga.

Modifications (Mostly removal of stuff) starting from commit 3bdaa965b4a77f64a9f8b751680bd1d90e651851 by RDSM.
