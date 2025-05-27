/**
 * Configuration management tools for custom commands and hotkeys
 */

import { configManager } from '../config-manager.js';
import { ConfigLoader } from '../command-system/config-loader.js';
import { ConfigValidator } from '../command-system/config-validation.js';
import { CommandValidator } from '../command-system/command-validator.js';
import { commandRegistry } from '../command-system/command-registry.js';
import { createErrorResponse } from '../error-handlers.js';
import { ServerResult } from '../types.js';
import { CommandConfigEntry } from '../command-system/types.js';

/**
 * List all custom commands and hotkeys
 */
export async function listCommands(): Promise<ServerResult> {
  try {
    await ConfigLoader.ensureInitialized();
    
    const commands = commandRegistry.getAllCommands();
    const hotkeys = commandRegistry.getAllHotkeys();
    const config = await configManager.getCommandConfig();
    const status = ConfigLoader.getStatus();
    
    const commandList = Array.from(commands.entries()).map(([name, entry]) => ({
      name,
      type: 'custom' as const,
      description: entry.command.description,
      template: entry.command.template,
      parameters: Object.keys(entry.command.parameters || {}),
      toolName: entry.toolName
    }));
    
    const hotkeyList = Array.from(hotkeys.entries()).map(([key, entry]) => ({
      key,
      type: 'hotkey' as const,
      description: entry.command.description,
      delegate: entry.command.delegate
    }));
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          message: "Command System Configuration",
          status: {
            initialized: status.initialized,
            lastLoadTime: new Date(status.lastLoadTime).toISOString(),
            customCommandsEnabled: await configManager.isCustomCommandsEnabled(),
            hotkeysEnabled: await configManager.isHotkeysEnabled()
          },
          commands: {
            count: commandList.length,
            items: commandList
          },
          hotkeys: {
            count: hotkeyList.length,
            items: hotkeyList
          },
          totalConfiguration: {
            commands: Object.keys(config.commands || {}).length,
            hotkeys: Object.keys(config.hotkeys || {}).length
          }
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to list commands: ${errorMessage}`);
  }
}

/**
 * Add or update a custom command
 */
export async function addCommand(args: {
  name: string;
  description: string;
  template: string;
  parameters?: Record<string, any>;
}): Promise<ServerResult> {
  try {
    const { name, description, template, parameters } = args;
    
    // Validate command name
    const nameValidation = ConfigValidator.validateCommandName(name);
    if (!nameValidation.valid) {
      return createErrorResponse(`Invalid command name: ${nameValidation.errors.join(', ')}`);
    }
    
    // Check for conflicts
    const conflictCheck = CommandValidator.checkNameConflict(name);
    if (conflictCheck.hasConflict) {
      return createErrorResponse(
        `Command name '${name}' conflicts with existing ${conflictCheck.conflictType} tool. Suggestion: '${conflictCheck.suggestion}'`
      );
    }
    
    // Create command configuration
    const commandConfig: CommandConfigEntry = {
      description,
      template,
      parameters
    };
    
    // Validate command configuration
    const validation = ConfigValidator.validateCustomCommand(commandConfig);
    if (!validation.valid) {
      return createErrorResponse(`Invalid command configuration: ${validation.errors.join(', ')}`);
    }
    
    // Add to configuration and reload
    const reloadResult = await ConfigLoader.reloadCommand(name, commandConfig, 'custom');
    if (!reloadResult.success) {
      return createErrorResponse(`Failed to add command: ${reloadResult.errors.join(', ')}`);
    }
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: `Custom command '${name}' added successfully`,
          command: {
            name,
            toolName: `custom_${name}`,
            ...commandConfig
          },
          usage: `Use tool 'custom_${name}' to execute this command`
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to add command: ${errorMessage}`);
  }
}

/**
 * Add or update a hotkey
 */
export async function addHotkey(args: {
  key: string;
  description: string;
  delegate: string;
}): Promise<ServerResult> {
  try {
    const { key, description, delegate } = args;
    
    // Validate hotkey key
    const keyValidation = ConfigValidator.validateHotkeyKey(key);
    if (!keyValidation.valid) {
      return createErrorResponse(`Invalid hotkey key: ${keyValidation.errors.join(', ')}`);
    }
    
    // Validate delegate target
    const availableTargets = [
      'get_config', 'set_config_value',
      'execute_command', 'read_output', 'force_terminate', 'list_sessions',
      'list_processes', 'kill_process',
      'read_file', 'read_multiple_files', 'write_file', 'create_directory',
      'list_directory', 'move_file', 'search_files', 'search_code', 'get_file_info',
      'edit_block', 'claude_code'
    ];
    
    const delegateValidation = ConfigValidator.validateDelegateTarget(delegate, availableTargets);
    if (!delegateValidation.valid) {
      return createErrorResponse(`Invalid delegate target: ${delegateValidation.errors.join(', ')}`);
    }
    
    // Create hotkey configuration
    const hotkeyConfig: CommandConfigEntry = {
      description,
      delegate
    };
    
    // Validate hotkey configuration
    const validation = ConfigValidator.validateHotkey(hotkeyConfig);
    if (!validation.valid) {
      return createErrorResponse(`Invalid hotkey configuration: ${validation.errors.join(', ')}`);
    }
    
    // Add to configuration and reload
    const reloadResult = await ConfigLoader.reloadCommand(key, hotkeyConfig, 'hotkey');
    if (!reloadResult.success) {
      return createErrorResponse(`Failed to add hotkey: ${reloadResult.errors.join(', ')}`);
    }
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: `Hotkey '${key}' added successfully`,
          hotkey: {
            key,
            ...hotkeyConfig
          },
          usage: `Use tool 'hotkey' with parameter {"key": "${key}"} to execute this hotkey`
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to add hotkey: ${errorMessage}`);
  }
}

/**
 * Remove a custom command
 */
export async function removeCommand(args: { name: string }): Promise<ServerResult> {
  try {
    const { name } = args;
    
    if (!name) {
      return createErrorResponse('Command name is required');
    }
    
    const result = await ConfigLoader.removeCommand(name, 'custom');
    
    if (!result.success) {
      return createErrorResponse(`Failed to remove command: ${result.errors.join(', ')}`);
    }
    
    if (!result.existed) {
      return createErrorResponse(`Command '${name}' not found`);
    }
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: `Custom command '${name}' removed successfully`
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to remove command: ${errorMessage}`);
  }
}

/**
 * Remove a hotkey
 */
export async function removeHotkey(args: { key: string }): Promise<ServerResult> {
  try {
    const { key } = args;
    
    if (!key) {
      return createErrorResponse('Hotkey key is required');
    }
    
    const result = await ConfigLoader.removeCommand(key, 'hotkey');
    
    if (!result.success) {
      return createErrorResponse(`Failed to remove hotkey: ${result.errors.join(', ')}`);
    }
    
    if (!result.existed) {
      return createErrorResponse(`Hotkey '${key}' not found`);
    }
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: `Hotkey '${key}' removed successfully`
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to remove hotkey: ${errorMessage}`);
  }
}

/**
 * Get detailed information about a specific command or hotkey
 */
export async function getCommandDetails(args: {
  name?: string;
  key?: string;
}): Promise<ServerResult> {
  try {
    const { name, key } = args;
    
    if (name) {
      // Get custom command details
      const commandEntry = commandRegistry.getCommand(name);
      if (!commandEntry) {
        return createErrorResponse(`Custom command '${name}' not found`);
      }
      
      const command = commandEntry.command;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            type: 'custom',
            name,
            description: command.description,
            template: command.template,
            parameters: command.parameters || {},
            toolName: commandEntry.toolName,
            usage: {
              tool: commandEntry.toolName,
              example: `{"parameters": {${Object.keys(command.parameters || {}).map(p => `"${p}": "value"`).join(', ')}}}`
            }
          }, null, 2)
        }],
        isError: false
      };
    } else if (key) {
      // Get hotkey details
      const hotkeyEntry = commandRegistry.getHotkey(key);
      if (!hotkeyEntry) {
        return createErrorResponse(`Hotkey '${key}' not found`);
      }
      
      const command = hotkeyEntry.command;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            type: 'hotkey',
            key,
            description: command.description,
            delegate: command.delegate,
            usage: {
              tool: 'hotkey',
              example: `{"key": "${key}", "parameters": {...}}`
            }
          }, null, 2)
        }],
        isError: false
      };
    } else {
      return createErrorResponse('Either name (for custom command) or key (for hotkey) is required');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to get command details: ${errorMessage}`);
  }
}

/**
 * Enable or disable the command system features
 */
export async function toggleCommandSystem(args: {
  enableCustomCommands?: boolean;
  enableHotkeys?: boolean;
}): Promise<ServerResult> {
  try {
    const { enableCustomCommands, enableHotkeys } = args;
    
    if (enableCustomCommands !== undefined) {
      await configManager.setCustomCommandsEnabled(enableCustomCommands);
    }
    
    if (enableHotkeys !== undefined) {
      await configManager.setHotkeysEnabled(enableHotkeys);
    }
    
    // Reload configuration to apply changes
    const reloadResult = await ConfigLoader.reload();
    
    const currentSettings = {
      customCommandsEnabled: await configManager.isCustomCommandsEnabled(),
      hotkeysEnabled: await configManager.isHotkeysEnabled()
    };
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: 'Command system settings updated',
          settings: currentSettings,
          reloadResult: {
            success: reloadResult.success,
            commandCount: reloadResult.commandCount,
            hotkeyCount: reloadResult.hotkeyCount,
            errors: reloadResult.errors
          }
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to toggle command system: ${errorMessage}`);
  }
}

/**
 * Get command system diagnostics
 */
export async function getCommandSystemDiagnostics(): Promise<ServerResult> {
  try {
    const diagnostics = await ConfigLoader.getDiagnostics();
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          message: "Command System Diagnostics",
          diagnostics,
          timestamp: new Date().toISOString()
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to get diagnostics: ${errorMessage}`);
  }
}