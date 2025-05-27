/**
 * Configuration loader with hot-reloading for command system
 */

import { configManager } from '../config-manager.js';
import { commandRegistry } from './command-registry.js';
import { dynamicToolRegistry } from './tool-registry.js';
import { ConfigValidator } from './config-validation.js';
import { CommandConfig } from './types.js';
import { mergeWithDefaults } from './defaults.js';

/**
 * Configuration loader with hot-reload capabilities
 */
export class ConfigLoader {
  private static isInitialized = false;

  /**
   * Initialize the command system with configuration
   */
  static async initialize(): Promise<{
    success: boolean;
    errors: string[];
    commandCount: number;
    hotkeyCount: number;
  }> {
    const errors: string[] = [];

    try {
      // Check if custom commands and hotkeys are enabled
      const customCommandsEnabled = await configManager.isCustomCommandsEnabled();
      const hotkeysEnabled = await configManager.isHotkeysEnabled();

      if (!customCommandsEnabled && !hotkeysEnabled) {
        this.isInitialized = true;
        return {
          success: true,
          errors: ['Command system is disabled'],
          commandCount: 0,
          hotkeyCount: 0
        };
      }

      // Load configuration
      const userCommandConfig = await configManager.getCommandConfig();

      // Merge user configuration with defaults
      const mergedConfig = mergeWithDefaults(userCommandConfig);

      // Validate configuration
      const validation = ConfigValidator.validateCommandConfig(mergedConfig);
      if (!validation.valid) {
        errors.push(...validation.errors);
      }

      // Filter configuration based on enabled features
      const filteredConfig: CommandConfig = {};
      
      if (customCommandsEnabled && mergedConfig.commands) {
        filteredConfig.commands = mergedConfig.commands;
      }
      
      if (hotkeysEnabled && mergedConfig.hotkeys) {
        filteredConfig.hotkeys = mergedConfig.hotkeys;
      }

      // Load into command registry
      commandRegistry.loadFromConfig(filteredConfig);

      // Generate tool definitions for custom commands
      dynamicToolRegistry.generateToolDefinitions();

      // Update state
      this.isInitialized = true;

      const stats = commandRegistry.getStats();
      
      return {
        success: errors.length === 0,
        errors,
        commandCount: stats.commandCount,
        hotkeyCount: stats.hotkeyCount
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to initialize command system: ${errorMessage}`);
      
      return {
        success: false,
        errors,
        commandCount: 0,
        hotkeyCount: 0
      };
    }
  }




  /**
   * Get current configuration status
   */
  static getStatus(): {
    initialized: boolean;
    commandCount: number;
    hotkeyCount: number;
  } {
    const stats = commandRegistry.getStats();
    
    return {
      initialized: this.isInitialized,
      commandCount: stats.commandCount,
      hotkeyCount: stats.hotkeyCount
    };
  }

  /**
   * Ensure the system is initialized
   */
  static async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

}