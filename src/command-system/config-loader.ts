/**
 * Configuration loader with hot-reloading for command system
 */

import { configManager } from '../config-manager.js';
import { commandRegistry } from './command-registry.js';
import { dynamicToolRegistry } from './tool-registry.js';
import { ConfigValidator } from './config-validation.js';
import { CommandConfig } from './types.js';

/**
 * Configuration loader with hot-reload capabilities
 */
export class ConfigLoader {
  private static isInitialized = false;
  private static isLoading = false;
  private static lastLoadTime = 0;

  /**
   * Initialize the command system with configuration
   */
  static async initialize(): Promise<{
    success: boolean;
    errors: string[];
    commandCount: number;
    hotkeyCount: number;
  }> {
    if (this.isLoading) {
      return {
        success: false,
        errors: ['Configuration is already being loaded'],
        commandCount: 0,
        hotkeyCount: 0
      };
    }

    this.isLoading = true;
    const errors: string[] = [];

    try {
      // Check if custom commands and hotkeys are enabled
      const customCommandsEnabled = await configManager.isCustomCommandsEnabled();
      const hotkeysEnabled = await configManager.isHotkeysEnabled();

      if (!customCommandsEnabled && !hotkeysEnabled) {
        this.isInitialized = true;
        this.isLoading = false;
        return {
          success: true,
          errors: ['Command system is disabled'],
          commandCount: 0,
          hotkeyCount: 0
        };
      }

      // Load configuration
      const commandConfig = await configManager.getCommandConfig();

      // Validate configuration
      const validation = ConfigValidator.validateCommandConfig(commandConfig);
      if (!validation.valid) {
        errors.push(...validation.errors);
      }

      // Filter configuration based on enabled features
      const filteredConfig: CommandConfig = {};
      
      if (customCommandsEnabled && commandConfig.commands) {
        filteredConfig.commands = commandConfig.commands;
      }
      
      if (hotkeysEnabled && commandConfig.hotkeys) {
        filteredConfig.hotkeys = commandConfig.hotkeys;
      }

      // Load into command registry
      commandRegistry.loadFromConfig(filteredConfig);

      // Refresh dynamic tool registry
      dynamicToolRegistry.refresh();

      // Update state
      this.isInitialized = true;
      this.lastLoadTime = Date.now();

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
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Reload configuration from disk
   */
  static async reload(): Promise<{
    success: boolean;
    errors: string[];
    commandCount: number;
    hotkeyCount: number;
    reloadTime: number;
    userMessage: string;
  }> {
    const startTime = Date.now();
    
    console.log('[DevControlMCP] Reloading command system configuration...');
    
    // Force re-initialization
    this.isInitialized = false;
    
    const result = await this.initialize();
    const reloadTime = Date.now() - startTime;
    
    let userMessage: string;
    if (result.success) {
      userMessage = `Configuration reloaded successfully in ${reloadTime}ms. ` +
        `Loaded ${result.commandCount} custom commands and ${result.hotkeyCount} hotkeys.`;
      console.log(`[DevControlMCP] ${userMessage}`);
    } else {
      userMessage = `Configuration reload failed: ${result.errors.join('; ')}`;
      console.error(`[DevControlMCP] ${userMessage}`);
    }
    
    return {
      ...result,
      reloadTime,
      userMessage
    };
  }

  /**
   * Check if configuration needs reloading (placeholder for file watching)
   */
  static async checkForUpdates(): Promise<{
    hasUpdates: boolean;
    lastModified?: number;
  }> {
    // This is a placeholder implementation
    // In a real implementation, you would check file modification times
    // or implement file system watching
    
    try {
      // For now, we'll just return false
      // Future implementation could watch config file changes
      return {
        hasUpdates: false,
        lastModified: this.lastLoadTime
      };
    } catch (error) {
      return {
        hasUpdates: false
      };
    }
  }

  /**
   * Auto-reload if updates are detected
   */
  static async autoReload(): Promise<{
    reloaded: boolean;
    result?: Awaited<ReturnType<typeof ConfigLoader.reload>>;
  }> {
    const updateCheck = await this.checkForUpdates();
    
    if (!updateCheck.hasUpdates) {
      return { reloaded: false };
    }

    const result = await this.reload();
    return {
      reloaded: true,
      result
    };
  }

  /**
   * Get current configuration status
   */
  static getStatus(): {
    initialized: boolean;
    loading: boolean;
    lastLoadTime: number;
    commandCount: number;
    hotkeyCount: number;
  } {
    const stats = commandRegistry.getStats();
    
    return {
      initialized: this.isInitialized,
      loading: this.isLoading,
      lastLoadTime: this.lastLoadTime,
      commandCount: stats.commandCount,
      hotkeyCount: stats.hotkeyCount
    };
  }

  /**
   * Validate and reload a specific command
   */
  static async reloadCommand(
    name: string,
    command: any,
    type: 'custom' | 'hotkey'
  ): Promise<{
    success: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Validate the command
      const validation = type === 'custom' 
        ? ConfigValidator.validateCustomCommand(command)
        : ConfigValidator.validateHotkey(command);

      if (!validation.valid) {
        errors.push(...validation.errors);
        return { success: false, errors };
      }

      // Update in config manager
      if (type === 'custom') {
        await configManager.setCommand(name, command);
      } else {
        await configManager.setHotkey(name, command);
      }

      // Reload the entire configuration to ensure consistency
      await this.reload();

      return { success: true, errors: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to reload command: ${errorMessage}`);
      return { success: false, errors };
    }
  }

  /**
   * Remove and reload after command deletion
   */
  static async removeCommand(
    name: string,
    type: 'custom' | 'hotkey'
  ): Promise<{
    success: boolean;
    existed: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Remove from config manager
      const existed = type === 'custom'
        ? await configManager.removeCommand(name)
        : await configManager.removeHotkey(name);

      if (existed) {
        // Reload the configuration
        await this.reload();
      }

      return { success: true, existed, errors: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to remove command: ${errorMessage}`);
      return { success: false, existed: false, errors };
    }
  }

  /**
   * Ensure the system is initialized
   */
  static async ensureInitialized(): Promise<void> {
    if (!this.isInitialized && !this.isLoading) {
      await this.initialize();
    }
  }

  /**
   * Get diagnostic information
   */
  static async getDiagnostics(): Promise<{
    status: ReturnType<typeof ConfigLoader.getStatus>;
    configHealth: {
      valid: boolean;
      errors: string[];
    };
    registryHealth: {
      commandsRegistered: number;
      hotkeysRegistered: number;
      toolsRegistered: number;
    };
  }> {
    const status = this.getStatus();
    
    // Check configuration health
    const commandConfig = await configManager.getCommandConfig();
    const configValidation = ConfigValidator.validateCommandConfig(commandConfig);
    
    // Check registry health
    const commandStats = commandRegistry.getStats();
    const toolStats = dynamicToolRegistry.getStats();
    
    return {
      status,
      configHealth: {
        valid: configValidation.valid,
        errors: configValidation.errors
      },
      registryHealth: {
        commandsRegistered: commandStats.commandCount,
        hotkeysRegistered: commandStats.hotkeyCount,
        toolsRegistered: toolStats.registeredToolCount
      }
    };
  }
}