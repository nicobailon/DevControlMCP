/**
 * Hotkey system implementation for DevControlMCP
 * Provides single-letter shortcuts that delegate to existing tools
 */

import { commandRegistry } from '../command-system/command-registry.js';
import { CommandValidator } from '../command-system/command-validator.js';
import { CommandSecurity } from '../command-system/security-integration.js';
import { CommandErrorHandler } from '../command-system/error-handling.js';
import { Command } from '../command-system/types.js';
import { createErrorResponse } from '../error-handlers.js';
import { ServerResult } from '../types.js';
import * as handlers from '../handlers/index.js';

/**
 * Map of available MCP tool handlers
 */
const TOOL_HANDLERS: Record<string, (args: any) => Promise<ServerResult>> = {
  // Configuration tools
  'get_config': async () => {
    const { getConfig } = await import('./config.js');
    return getConfig();
  },
  'set_config_value': async (args) => {
    const { setConfigValue } = await import('./config.js');
    return setConfigValue(args);
  },

  // Terminal tools
  'execute_command': handlers.handleExecuteCommand,
  'read_output': handlers.handleReadOutput,
  'force_terminate': handlers.handleForceTerminate,
  'list_sessions': handlers.handleListSessions,

  // Process tools
  'list_processes': handlers.handleListProcesses,
  'kill_process': handlers.handleKillProcess,

  // Filesystem tools
  'read_file': handlers.handleReadFile,
  'read_multiple_files': handlers.handleReadMultipleFiles,
  'write_file': handlers.handleWriteFile,
  'create_directory': handlers.handleCreateDirectory,
  'list_directory': handlers.handleListDirectory,
  'move_file': handlers.handleMoveFile,
  'search_files': handlers.handleSearchFiles,
  'search_code': handlers.handleSearchCode,
  'get_file_info': handlers.handleGetFileInfo,

  // Text editing tools
  'edit_block': handlers.handleEditBlock,

  // Meta-tool
  'claude_code': handlers.handleClaudeCode
};

/**
 * Execute a hotkey command
 */
export async function executeHotkey(args: {
  key: string;
  parameters?: Record<string, any>;
}): Promise<ServerResult> {
  try {
    const { key, parameters = {} } = args;

    // Validate input
    if (!key || typeof key !== 'string') {
      return createErrorResponse('Hotkey key is required and must be a string');
    }

    if (key.length !== 1) {
      return createErrorResponse('Hotkey must be a single character');
    }

    // Get the hotkey from registry
    const hotkeyEntry = commandRegistry.getHotkey(key);
    if (!hotkeyEntry) {
      const availableHotkeys = Array.from(commandRegistry.getAllHotkeys().keys());
      return CommandErrorHandler.handleHotkeyNotFound(key, availableHotkeys);
    }

    const command = hotkeyEntry.command;

    // Validate the hotkey
    const validation = CommandValidator.validateHotkey(key, parameters);
    if (!validation.valid) {
      return CommandErrorHandler.handleValidationError(validation.errors, { key, parameters });
    }

    // Check security policies
    const securityCheck = await CommandSecurity.validateHotkey(command, parameters);
    if (!securityCheck.allowed) {
      return CommandErrorHandler.handleSecurityViolation(
        securityCheck.reason || 'Unknown security violation',
        `hotkey_${key}`
      );
    }

    // Get the delegate target
    const delegateTarget = command.delegate;
    if (!delegateTarget) {
      return createErrorResponse(`Hotkey '${key}' has no delegate target configured`);
    }

    // Execute the delegated tool
    return await executeDelegatedTool(delegateTarget, parameters, key);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Hotkey execution failed: ${errorMessage}`);
  }
}

/**
 * Execute a delegated tool
 */
async function executeDelegatedTool(
  toolName: string,
  parameters: Record<string, any>,
  hotkeyKey: string
): Promise<ServerResult> {
  try {
    // Get the handler for the tool
    const handler = TOOL_HANDLERS[toolName];
    if (!handler) {
      return CommandErrorHandler.handleDelegateError(
        toolName,
        `Tool '${toolName}' is not available for hotkey delegation`,
        hotkeyKey
      );
    }

    // Execute the handler with the provided parameters
    const result = await handler(parameters);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error : String(error);
    return CommandErrorHandler.handleDelegateError(toolName, errorMessage, hotkeyKey);
  }
}

/**
 * Get information about available hotkeys
 */
export async function getHotkeyInfo(): Promise<ServerResult> {
  try {
    const hotkeys = commandRegistry.getAllHotkeys();
    const hotkeyList: Array<{
      key: string;
      description: string;
      delegate: string;
    }> = [];

    for (const [key, entry] of hotkeys) {
      hotkeyList.push({
        key,
        description: entry.command.description,
        delegate: entry.command.delegate || ''
      });
    }

    const stats = commandRegistry.getStats();

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          message: "Hotkey information",
          stats: {
            totalHotkeys: stats.hotkeyCount,
            totalCommands: stats.commandCount
          },
          hotkeys: hotkeyList,
          usage: "Use the 'hotkey' tool with 'key' parameter to execute a hotkey",
          availableTargets: Object.keys(TOOL_HANDLERS)
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to get hotkey info: ${errorMessage}`);
  }
}

/**
 * Get help for a specific hotkey or all hotkeys
 */
export async function getHotkeyHelp(args: { key?: string } = {}): Promise<ServerResult> {
  try {
    const { key } = args;

    if (key) {
      // Get help for a specific hotkey
      const hotkeyEntry = commandRegistry.getHotkey(key);
      if (!hotkeyEntry) {
        const availableHotkeys = Array.from(commandRegistry.getAllHotkeys().keys());
        return CommandErrorHandler.handleHotkeyNotFound(key, availableHotkeys);
      }

      const command = hotkeyEntry.command;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            hotkey: key,
            description: command.description,
            delegate: command.delegate,
            usage: `{"key": "${key}", "parameters": {...}}`,
            note: "Parameters are passed directly to the delegated tool"
          }, null, 2)
        }],
        isError: false
      };
    } else {
      // Get help for all hotkeys
      const help = commandRegistry.getHelp();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            message: "Hotkey System Help",
            hotkeys: help.hotkeys,
            usage: "Use the 'hotkey' tool with 'key' parameter to execute any hotkey",
            examples: help.hotkeys.slice(0, 3).map(h => ({
              key: h.key,
              usage: `{"key": "${h.key}", "parameters": {}}`
            })),
            note: "Hotkeys delegate to existing tools - check tool documentation for parameter requirements"
          }, null, 2)
        }],
        isError: false
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to get hotkey help: ${errorMessage}`);
  }
}

/**
 * Validate a hotkey configuration
 */
export async function validateHotkeyConfig(args: {
  key: string;
  command: {
    description: string;
    delegate: string;
  };
}): Promise<ServerResult> {
  try {
    const { key, command } = args;

    // Create command object with name
    const commandWithName: Command = {
      name: key,
      ...command
    };
    
    // Validate the hotkey configuration
    const validation = CommandValidator.validateCommandConfig(key, commandWithName, 'hotkey');
    
    if (!validation.valid) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            valid: false,
            errors: validation.errors,
            message: `Hotkey '${key}' configuration is invalid`
          }, null, 2)
        }],
        isError: false
      };
    }

    // Check if delegate target is available
    const availableTargets = Object.keys(TOOL_HANDLERS);
    const isValidDelegate = availableTargets.includes(command.delegate);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          valid: true && isValidDelegate,
          message: isValidDelegate 
            ? `Hotkey '${key}' configuration is valid`
            : `Hotkey '${key}' has invalid delegate target`,
          analysis: {
            key: {
              valid: /^[a-zA-Z]$/.test(key),
              message: /^[a-zA-Z]$/.test(key) ? 'Valid single letter' : 'Must be single letter'
            },
            delegate: {
              valid: isValidDelegate,
              target: command.delegate,
              message: isValidDelegate 
                ? 'Valid delegate target' 
                : `Invalid target. Available: ${availableTargets.join(', ')}`
            }
          }
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to validate hotkey configuration: ${errorMessage}`);
  }
}

/**
 * Get available delegate targets for hotkeys
 */
export async function getAvailableDelegateTargets(): Promise<ServerResult> {
  try {
    const targets = Object.keys(TOOL_HANDLERS);
    const targetInfo = targets.map(target => {
      // Get basic info about each tool
      let category = 'other';
      if (['get_config', 'set_config_value'].includes(target)) {
        category = 'configuration';
      } else if (['execute_command', 'read_output', 'force_terminate', 'list_sessions'].includes(target)) {
        category = 'terminal';
      } else if (['list_processes', 'kill_process'].includes(target)) {
        category = 'process';
      } else if (['read_file', 'write_file', 'create_directory', 'list_directory', 'move_file', 'search_files', 'search_code', 'get_file_info', 'read_multiple_files'].includes(target)) {
        category = 'filesystem';
      } else if (['edit_block'].includes(target)) {
        category = 'editing';
      } else if (['claude_code'].includes(target)) {
        category = 'meta';
      }

      return { target, category };
    });

    // Group by category
    const groupedTargets = targetInfo.reduce((acc, { target, category }) => {
      if (!acc[category]) acc[category] = [];
      acc[category].push(target);
      return acc;
    }, {} as Record<string, string[]>);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          message: "Available delegate targets for hotkeys",
          totalTargets: targets.length,
          targets: groupedTargets,
          usage: "Use any of these tool names as 'delegate' in hotkey configuration",
          note: "Parameters are passed through to the delegated tool"
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to get delegate targets: ${errorMessage}`);
  }
}