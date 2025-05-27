/**
 * Configuration management tools for custom commands and hotkeys
 */

import { configManager } from '../config-manager.js';
import { ConfigLoader } from '../command-system/config-loader.js';
import { commandRegistry } from '../command-system/command-registry.js';
import { createErrorResponse } from '../error-handlers.js';
import { ServerResult } from '../types.js';

/**
 * List all custom commands and hotkeys
 */
export async function commandHelp(): Promise<ServerResult> {
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
 * Get help for hotkeys
 */
export async function hotkeyHelp(): Promise<ServerResult> {
  try {
    await ConfigLoader.ensureInitialized();
    
    const hotkeys = commandRegistry.getAllHotkeys();
    const status = ConfigLoader.getStatus();
    
    const hotkeyList = Array.from(hotkeys.entries()).map(([key, entry]) => ({
      key,
      description: entry.command.description,
      delegate: entry.command.delegate
    }));
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          message: "Available Hotkeys",
          status: {
            initialized: status.initialized,
            hotkeysEnabled: await configManager.isHotkeysEnabled()
          },
          hotkeys: {
            count: hotkeyList.length,
            items: hotkeyList
          },
          usage: "Use the 'hotkey' tool with {\"key\": \"<letter>\"} to execute a hotkey",
          note: "Hotkeys are single-letter shortcuts that delegate to existing MCP tools"
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to get hotkey help: ${errorMessage}`);
  }
}