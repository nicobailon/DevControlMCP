# ⚠️ MODIFIED VERSION - PRIVACY ENHANCED ⚠️

> **IMPORTANT DISCLAIMER**: This is a modified version of Desktop Commander MCP where **ALL telemetry and auto-update features have been removed using AI assistance**. No data is sent to external servers, and the software will not automatically update without your explicit permission.

> I have renamed the package globally on the code from @wonderwhy-er/desktop-commander to  @wonderwhy-er/desktop-commander-telemetry-free to avoid accidentally calling the original telemetry-rich project , this new package doesn't exist, so any attempt to use it will fail, follow the steps below to actually install the software.

## The instructions below are for the original repo, to run this modified version:
- Clone the repo 
- cd to the folder 
- run:  npm run setup


> I am not a typescript programmer. If you are and can double check that all the telemetry is gone I will appreciate a lot. :)

> Now the original readme for reference, package name and telemtry info modified to avoid accidental installation of the wrong package.

---

# Desktop Commander MCP
### Search, update, manage files and run terminal commands with AI

[![npm downloads](https://img.shields.io/npm/dw/@wonderwhy-er/desktop-commander-telemetry-free)](https://www.npmjs.com/package/@wonderwhy-er/desktop-commander-telemetry-free)
[![smithery badge](https://smithery.ai/badge/@wonderwhy-er/desktop-commander-telemetry-free)](https://smithery.ai/server/@wonderwhy-er/desktop-commander-telemetry-free)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg)](https://www.buymeacoffee.com/wonderwhyer)


[![Discord](https://img.shields.io/badge/Join%20Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/kQ27sNnZr7)

[![Product Hunt](https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=948854&theme=light)](https://www.producthunt.com/posts/desktop-commander-mcp)

Short version. Four key things. Terminal commands, diff based file editing, ripgrep based text search in folders, ability to read files from urls 


![Desktop Commander MCP](https://raw.githubusercontent.com/wonderwhy-er/ClaudeComputerCommander/main/header.png)
<a href="https://glama.ai/mcp/servers/zempur9oh4">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/zempur9oh4/badge" alt="Desktop Commander MCP" />
</a>

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Handling Long-Running Commands](#handling-long-running-commands)
- [Work in Progress and TODOs](#work-in-progress-and-todos)
- [Media links](#media)
- [Testimonials](#testimonials)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Contributing](#contributing)
- [License](#license)

This is server that allows Claude desktop app to execute long-running terminal commands on your computer and manage processes through Model Context Protocol (MCP) + Built on top of [MCP Filesystem Server](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem) to provide additional search and replace file editing capabilities .

## Features

- Execute terminal commands with output streaming
- Command timeout and background execution support
- Process management (list and kill processes)
- Session management for long-running commands
- Server configuration management:
  - Get/set configuration values
  - Update multiple settings at once
  - Dynamic configuration changes without server restart
- Full filesystem operations:
  - Read/write files
  - Create/list directories
  - Move files/directories
  - Search files
  - Get file metadata
  - Code editing capabilities:
  - Surgical text replacements for small changes
  - Full file rewrites for major changes
  - Multiple file support
  - Pattern-based replacements
  - vscode-ripgrep based recursive code or text search in folders

## Installation
First, ensure you've downloaded and installed the [Claude Desktop app](https://claude.ai/download) and you have [npm installed](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

### Option 1: Install through npx
Just run this in terminal
```
npx @wonderwhy-er/desktop-commander-telemetry-free setup
```

For debugging mode (allows Node.js inspector connection):
```
npx @wonderwhy-er/desktop-commander-telemetry-free setup --debug
```
Restart Claude if running

### Option 2: Using bash script installer (macOS)
For macOS users, you can use our automated bash installer which will check your Node.js version, install it if needed, and automatically configure Desktop Commander:
```
curl -fsSL https://raw.githubusercontent.com/wonderwhy-er/DesktopCommanderMCP/refs/heads/main/install.sh | bash
```
This script handles all dependencies and configuration automatically for a seamless setup experience.

### Option 3: Installing via Smithery

To install Desktop Commander for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@wonderwhy-er/desktop-commander-telemetry-free):

```bash
npx -y @smithery/cli install @wonderwhy-er/desktop-commander-telemetry-free --client claude
```

### Option 4: Add to claude_desktop_config by hand
Add this entry to your claude_desktop_config.json:

- On Mac: `~/Library/Application\ Support/Claude/claude_desktop_config.json`
- On Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- On Linux: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "desktop-commander": {
      "command": "npx",
      "args": [
        "-y",
        "@wonderwhy-er/desktop-commander-telemetry-free"
      ]
    }
  }
}
```
Restart Claude if running

### Option 5: Checkout locally
1. Clone and build:
```bash
git clone https://github.com/wonderwhy-er/DesktopCommanderMCP.git
cd DesktopCommanderMCP
npm run setup
```
Restart Claude if running

The setup command will:
- Install dependencies
- Build the server
- Configure Claude's desktop app
- Add MCP servers to Claude's config if needed

### Updating Desktop Commander

The auto-update feature has been disabled in this modified version. 

To update manually, you can run the setup command again with your desired version:
```bash
npx @wonderwhy-er/desktop-commander-telemetry-free@<version> setup
```

For example, to install version 0.1.35:
```bash
npx @wonderwhy-er/desktop-commander-telemetry-free@0.1.35 setup
```

> **NOTE:** Always use the telemetry-free version to prevent accidental updates to versions that might contain telemetry.

## Usage

The server provides a comprehensive set of tools organized into several categories:

### Available Tools

| Category | Tool | Description |
|----------|------|-------------|
| **Configuration** | `get_config` | Get the complete server configuration as JSON (includes blockedCommands, defaultShell, allowedDirectories) |
| | `set_config_value` | Set a specific configuration value by key. Available settings: <br>• `blockedCommands`: Array of shell commands that cannot be executed<br>• `defaultShell`: Shell to use for commands (e.g., bash, zsh, powershell)<br>• `allowedDirectories`: Array of filesystem paths the server can access for file operations (⚠️ terminal commands can still access files outside these directories) |
| **Terminal** | `execute_command` | Execute a terminal command with configurable timeout and shell selection |
| | `read_output` | Read new output from a running terminal session |
| | `force_terminate` | Force terminate a running terminal session |
| | `list_sessions` | List all active terminal sessions |
| | `list_processes` | List all running processes with detailed information |
| | `kill_process` | Terminate a running process by PID |
| **Filesystem** | `read_file` | Read contents from local filesystem or URLs (supports text and images) |
| | `read_multiple_files` | Read multiple files simultaneously |
| | `write_file` | Completely replace file contents (best for large changes) |
| | `create_directory` | Create a new directory or ensure it exists |
| | `list_directory` | Get detailed listing of files and directories |
| | `move_file` | Move or rename files and directories |
| | `search_files` | Find files by name using case-insensitive substring matching |
| | `search_code` | Search for text/code patterns within file contents using ripgrep |
| | `get_file_info` | Retrieve detailed metadata about a file or directory |
| **Text Editing** | `edit_block` | Apply surgical text replacements (best for changes <20% of file size) |

### Tool Usage Examples

Search/Replace Block Format:
```
filepath.ext
<<<<<<< SEARCH
content to find
=======
new content
>>>>>>> REPLACE
```

Example:
```
src/main.js
<<<<<<< SEARCH
console.log("old message");
=======
console.log("new message");
>>>>>>> REPLACE
```

### URL Support
- `read_file` can now fetch content from both local files and URLs
- Example: `read_file` with `isUrl: true` parameter to read from web resources
- Handles both text and image content from remote sources
- Images (local or from URLs) are displayed visually in Claude's interface, not as text
- Claude can see and analyze the actual image content
- Default 30-second timeout for URL requests

## Handling Long-Running Commands

For commands that may take a while:

## Configuration Management

### ⚠️ Important Security Warnings

1. **Always change configuration in a separate chat window** from where you're doing your actual work. Claude may sometimes attempt to modify configuration settings (like `allowedDirectories`) if it encounters filesystem access restrictions during operation.

2. **The `allowedDirectories` setting currently only restricts filesystem operations**, not terminal commands. Terminal commands can still access files outside allowed directories. Full terminal sandboxing is on the roadmap.

### Configuration Tools

You can manage server configuration using the provided tools:

```javascript
// Get the entire config
get_config({})

// Set a specific config value
set_config_value({ "key": "defaultShell", "value": "/bin/zsh" })

// Set multiple config values using separate calls
set_config_value({ "key": "defaultShell", "value": "/bin/bash" })
set_config_value({ "key": "allowedDirectories", "value": ["/Users/username/projects"] })
```

The configuration is saved to `config.json` in the server's working directory and persists between server restarts.

### Best Practices

1. **Create a dedicated chat for configuration changes**: Make all your config changes in one chat, then start a new chat for your actual work.

2. **Be careful with empty `allowedDirectories`**: Setting this to an empty array (`[]`) grants access to your entire filesystem for file operations.

3. **Use specific paths**: Instead of using broad paths like `/`, specify exact directories you want to access.

4. **Always verify configuration after changes**: Use `get_config({})` to confirm your changes were applied correctly.

## Using Different Shells

You can specify which shell to use for command execution:

```javascript
// Using default shell (bash or system default)
execute_command({ "command": "echo $SHELL" })

// Using zsh specifically
execute_command({ "command": "echo $SHELL", "shell": "/bin/zsh" })

// Using bash specifically
execute_command({ "command": "echo $SHELL", "shell": "/bin/bash" })
```

This allows you to use shell-specific features or maintain consistent environments across commands.

1. `execute_command` returns after timeout with initial output
2. Command continues in background
3. Use `read_output` with PID to get new output
4. Use `force_terminate` to stop if needed

## Debugging

If you need to debug the server, you can install it in debug mode:

```bash
# Using npx
npx @wonderwhy-er/desktop-commander-telemetry-free setup --debug

# Or if installed locally
npm run setup:debug
```

This will:
1. Configure Claude to use a separate "desktop-commander" server
2. Enable Node.js inspector protocol with `--inspect-brk=9229` flag
3. Pause execution at the start until a debugger connects
4. Enable additional debugging environment variables

To connect a debugger:
- In Chrome, visit `chrome://inspect` and look for the Node.js instance
- In VS Code, use the "Attach to Node Process" debug configuration
- Other IDEs/tools may have similar "attach" options for Node.js debugging

Important debugging notes:
- The server will pause on startup until a debugger connects (due to the `--inspect-brk` flag)
- If you don't see activity during debugging, ensure you're connected to the correct Node.js process
- Multiple Node processes may be running; connect to the one on port 9229
- The debug server is identified as "desktop-commander-debug" in Claude's MCP server list

Troubleshooting:
- If Claude times out while trying to use the debug server, your debugger might not be properly connected
- When properly connected, the process will continue execution after hitting the first breakpoint
- You can add additional breakpoints in your IDE once connected

## Model Context Protocol Integration

This project extends the MCP Filesystem Server to enable:
- Local server support in Claude Desktop
- Full system command execution
- Process management
- File operations
- Code editing with search/replace blocks

Created as part of exploring Claude MCPs: https://youtube.com/live/TlbjFDbl5Us

## DONE
- **16-04-2025 Better configurations** - Improved settings for allowed paths, commands and shell environments
- **14-04-2025 Windows environment fixes** - Resolved issues specific to Windows platforms
- **14-04-2025 Linux improvements** - Enhanced compatibility with various Linux distributions
- **12-04-2025 Better allowed directories and blocked commands** - Improved security and path validation for file read/write and terminal command restrictions.
Terminal still can access files ignoring allowed directories.
- **11-04-2025 Shell configuration** - Added ability to configure preferred shell for command execution
- **07-04-2025 Added URL support** - `read_file` command can now fetch content from URLs
- **28-03-2025 Fixed "Watching /" JSON error** - Implemented custom stdio transport to handle non-JSON messages and prevent server crashes
- **25-03-2025 Better code search** ([merged](https://github.com/wonderwhy-er/ClaudeServerCommander/pull/17)) - Enhanced code exploration with context-aware results

## Work in Progress and TODOs

The following features are currently being explored:

- **Support for WSL** - Windows Subsystem for Linux integration
- **Support for SSH** - Remote server command execution
- **Better file support like csv/pdf**
- **Terminal sandboxing for Mac/Linux/Windows for better security**
- **File reading modes** - for example allow to read html as plain text or markdown

## Website

Visit our official website at [https://desktopcommander.app/](https://desktopcommander.app/) for the latest information, documentation, and updates.

## Media
Learn more about this project through these resources:

### Article
[Claude with MCPs replaced Cursor & Windsurf. How did that happen?](https://wonderwhy-er.medium.com/claude-with-mcps-replaced-cursor-windsurf-how-did-that-happen-c1d1e2795e96) - A detailed exploration of how Claude with Model Context Protocol capabilities is changing developer workflows.

### Video
[Claude Desktop Commander Video Tutorial](https://www.youtube.com/watch?v=ly3bed99Dy8) - Watch how to set up and use the Commander effectively.

### Publication at AnalyticsIndiaMag
[![analyticsindiamag.png](testemonials%2Fanalyticsindiamag.png)
This Developer Ditched Windsurf, Cursor Using Claude with MCPs](https://analyticsindiamag.com/ai-features/this-developer-ditched-windsurf-cursor-using-claude-with-mcps/)

### Community
Join our [Discord server](https://discord.gg/kQ27sNnZr7) to get help, share feedback, and connect with other users.

## Testimonials

[![It's a life saver! I paid Claude + Cursor currently which I always feel it's kind of duplicated. This solves the problem ultimately. I am so happy. Thanks so much. Plus today Claude has added the web search support. With this MCP + Internet search, it writes the code with the latest updates. It's so good when Cursor doesn't work sometimes or all the fast requests are used.](https://raw.githubusercontent.com/wonderwhy-er/ClaudeComputerCommander/main/testemonials/img.png) https://www.youtube.com/watch?v=ly3bed99Dy8&lc=UgyyBt6_ShdDX_rIOad4AaABAg
](https://www.youtube.com/watch?v=ly3bed99Dy8&lc=UgyyBt6_ShdDX_rIOad4AaABAg
)

[![This is the first comment I've ever left on a youtube video, THANK YOU! I've been struggling to update an old Flutter app in Cursor from an old pre null-safety version to a current version and implemented null-safety using Claude 3.7. I got most of the way but had critical BLE errors that I spent days trying to resolve with no luck. I tried Augment Code but it didn't get it either. I implemented your MCP in Claude desktop and was able to compare the old and new codebase fully, accounting for the updates in the code, and fix the issues in a couple of hours. A word of advice to people trying this, be sure to stage changes and commit when appropriate to be able to undo unwanted changes. Amazing!](https://raw.githubusercontent.com/wonderwhy-er/ClaudeComputerCommander/main/testemonials/img_1.png)
https://www.youtube.com/watch?v=ly3bed99Dy8&lc=UgztdHvDMqTb9jiqnf54AaABAg](https://www.youtube.com/watch?v=ly3bed99Dy8&lc=UgztdHvDMqTb9jiqnf54AaABAg
)

[![Great! I just used Windsurf, bought license a week ago, for upgrading old fullstack socket project and it works many times good or ok but also many times runs away in cascade and have to revert all changes losing hundereds of cascade tokens. In just a week down to less than 100 tokens and do not want to buy only 300 tokens for 10$. This Claude MCP ,bought claude Pro finally needed but wanted very good reason to also have next to ChatGPT, and now can code as much as I want not worrying about token cost.
Also this is much more than code editing it is much more thank you for great video!](https://raw.githubusercontent.com/wonderwhy-er/ClaudeComputerCommander/main/testemonials/img_2.png)
https://www.youtube.com/watch?v=ly3bed99Dy8&lc=UgyQFTmYLJ4VBwIlmql4AaABAg](https://www.youtube.com/watch?v=ly3bed99Dy8&lc=UgyQFTmYLJ4VBwIlmql4AaABAg)

[![it is a great tool, thank you, I like using it, as it gives claude an ability to do surgical edits, making it more like a human developer.](https://raw.githubusercontent.com/wonderwhy-er/ClaudeComputerCommander/main/testemonials/img_3.png)
https://www.youtube.com/watch?v=ly3bed99Dy8&lc=Ugy4-exy166_Ma7TH-h4AaABAg](https://www.youtube.com/watch?v=ly3bed99Dy8&lc=Ugy4-exy166_Ma7TH-h4AaABAg)

[![You sir are my hero. You've pretty much summed up and described my experiences of late, much better than I could have. Cursor and Windsurf both had me frustrated to the point where I was almost yelling at my computer screen. Out of whimsy, I thought to myself why not just ask Claude directly, and haven't looked back since.
Claude first to keep my sanity in check, then if necessary, engage with other IDEs, frameworks, etc. I thought I was the only one, glad to see I'm not lol.
33
1](https://raw.githubusercontent.com/wonderwhy-er/ClaudeComputerCommander/main/testemonials/img_4.png)
https://medium.com/@pharmx/you-sir-are-my-hero-62cff5836a3e](https://medium.com/@pharmx/you-sir-are-my-hero-62cff5836a3e)

## Contributing

If you find this project useful, please consider giving it a ⭐ star on GitHub! This helps others discover the project and encourages further development.

We welcome contributions from the community! Whether you've found a bug, have a feature request, or want to contribute code, here's how you can help:

- **Found a bug?** Open an issue at [github.com/wonderwhy-er/DesktopCommanderMCP/issues](https://github.com/wonderwhy-er/DesktopCommanderMCP/issues)
- **Have a feature idea?** Submit a feature request in the issues section
- **Want to contribute code?** Fork the repository, create a branch, and submit a pull request
- **Questions or discussions?** Start a discussion in the GitHub Discussions tab

All contributions, big or small, are greatly appreciated!

If you find this tool valuable for your workflow, please consider [supporting the project](https://www.buymeacoffee.com/wonderwhyer).

## Frequently Asked Questions

Here are answers to some common questions. For a more comprehensive FAQ, see our [detailed FAQ document](FAQ.md).

### What is DesktopCommanderMCP?
It's an MCP tool that enables Claude Desktop to access your file system and terminal, turning Claude into a versatile assistant for coding, automation, codebase exploration, and more.

### How is this different from Cursor/Windsurf?
Unlike IDE-focused tools, Claude Desktop Commander provides a solution-centric approach that works with your entire OS, not just within a coding environment. Claude reads files in full rather than chunking them, can work across multiple projects simultaneously, and executes changes in one go rather than requiring constant review.

### Do I need to pay for API credits?
No. This tool works with Claude Desktop's standard Pro subscription ($20/month), not with API calls, so you won't incur additional costs beyond the subscription fee.

### Does Desktop Commander automatically update?
No, the auto-update functionality has been disabled in this version. You need to manually update by specifying the version you want to install.

### What are the most common use cases?
- Exploring and understanding complex codebases
- Generating diagrams and documentation
- Automating tasks across your system
- Working with multiple projects simultaneously
- Making surgical code changes with precise control

### I'm having trouble installing or using the tool. Where can I get help?
Join our [Discord server](https://discord.gg/kQ27sNnZr7) for community support, check the [GitHub issues](https://github.com/wonderwhy-er/DesktopCommanderMCP/issues) for known problems, or review the [full FAQ](FAQ.md) for troubleshooting tips. You can also visit our [website FAQ section](https://desktopcommander.app#faq) for a more user-friendly experience. If you encounter a new issue, please consider [opening a GitHub issue](https://github.com/wonderwhy-er/DesktopCommanderMCP/issues/new) with details about your problem.

## Data Collection

**Note: This is a modified version of Desktop Commander where telemetry and auto-update features have been removed using AI assistance.**

The original version of Desktop Commander collected anonymous usage data during installation and setup. This included:
- Operating system information
- Node.js and NPM versions
- Installation method and shell environment
- Error messages (if any occur during setup)

In this modified version:
1. All Google Analytics telemetry has been disabled
2. Machine ID tracking has been removed
3. Auto-update functionality has been disabled
4. All "calling home" behaviors have been eliminated

These modifications ensure that the application does not send any data to external servers and remains under your complete control regarding updates.

For those interested in the original functionality, the unmodified version can be found in the original repository.

## License

MIT
