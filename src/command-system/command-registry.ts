/**
 * Command registry for DevControlMCP command system
 * Handles loading, storing, and managing custom commands and hotkeys
 */

import { Command, CommandConfig, CommandConfigEntry, CommandRegistryEntry } from './types.js';
import { TemplateEngine } from './template-engine.js';

/**
 * Central registry for managing custom commands and hotkeys
 */
export class CommandRegistry {
  private commands: Map<string, CommandRegistryEntry> = new Map();
  private hotkeys: Map<string, CommandRegistryEntry> = new Map();

  /**
   * Load commands from configuration
   */
  loadFromConfig(config: CommandConfig): void {
    this.clear();

    // Load custom commands
    if (config.commands) {
      for (const [name, commandConfig] of Object.entries(config.commands)) {
        const command: Command = { ...commandConfig, name };
        this.registerCommand(name, command);
      }
    }

    // Load hotkeys
    if (config.hotkeys) {
      for (const [key, commandConfig] of Object.entries(config.hotkeys)) {
        const command: Command = { ...commandConfig, name: key };
        this.registerHotkey(key, command);
      }
    }
  }

  /**
   * Register a custom command
   */
  registerCommand(name: string, command: Command): void {
    // Validate command
    const validation = this.validateCommand(command);
    if (!validation.valid) {
      throw new Error(`Invalid command '${name}': ${validation.errors.join(', ')}`);
    }

    // Create registry entry
    const entry: CommandRegistryEntry = {
      command: { ...command, name },
      toolName: `custom_${name}`,
      type: 'custom'
    };

    this.commands.set(name, entry);
  }

  /**
   * Register a hotkey
   */
  registerHotkey(key: string, command: Command): void {
    // Validate hotkey key
    if (!this.isValidHotkeyKey(key)) {
      throw new Error(`Invalid hotkey key '${key}': must be a single letter`);
    }

    // Validate command
    const validation = this.validateHotkey(command);
    if (!validation.valid) {
      throw new Error(`Invalid hotkey '${key}': ${validation.errors.join(', ')}`);
    }

    // Create registry entry
    const entry: CommandRegistryEntry = {
      command: { ...command, name: key },
      type: 'hotkey'
    };

    this.hotkeys.set(key, entry);
  }

  /**
   * Get a command by name
   */
  getCommand(name: string): CommandRegistryEntry | undefined {
    return this.commands.get(name);
  }

  /**
   * Get a hotkey by key
   */
  getHotkey(key: string): CommandRegistryEntry | undefined {
    return this.hotkeys.get(key);
  }

  /**
   * Get all registered commands
   */
  getAllCommands(): Map<string, CommandRegistryEntry> {
    return new Map(this.commands);
  }

  /**
   * Get all registered hotkeys
   */
  getAllHotkeys(): Map<string, CommandRegistryEntry> {
    return new Map(this.hotkeys);
  }

  /**
   * Get all command names for MCP tool registration
   */
  getCustomToolNames(): string[] {
    return Array.from(this.commands.values())
      .map(entry => entry.toolName)
      .filter((name): name is string => name !== undefined);
  }

  /**
   * Check if a command exists
   */
  hasCommand(name: string): boolean {
    return this.commands.has(name);
  }

  /**
   * Check if a hotkey exists
   */
  hasHotkey(key: string): boolean {
    return this.hotkeys.has(key);
  }

  /**
   * Remove a command
   */
  removeCommand(name: string): boolean {
    return this.commands.delete(name);
  }

  /**
   * Remove a hotkey
   */
  removeHotkey(key: string): boolean {
    return this.hotkeys.delete(key);
  }

  /**
   * Clear all commands and hotkeys
   */
  clear(): void {
    this.commands.clear();
    this.hotkeys.clear();
  }

  /**
   * Get command statistics
   */
  getStats(): { commandCount: number; hotkeyCount: number } {
    return {
      commandCount: this.commands.size,
      hotkeyCount: this.hotkeys.size
    };
  }

  /**
   * Validate a custom command configuration
   */
  private validateCommand(command: Command): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!command.description) {
      errors.push('Command must have a description');
    }

    if (!command.template) {
      errors.push('Custom command must have a template');
    }

    // Validate template if present
    if (command.template) {
      if (!TemplateEngine.isValidTemplate(command.template)) {
        errors.push('Invalid template syntax');
      }

      // Check if template parameters match parameter configuration
      const templateParams = TemplateEngine.extractParameters(command.template);
      const configParams = Object.keys(command.parameters || {});

      for (const param of templateParams) {
        if (!configParams.includes(param)) {
          errors.push(`Template parameter '${param}' is not defined in parameters configuration`);
        }
      }
    }

    // Validate parameter configurations
    if (command.parameters) {
      for (const [paramName, config] of Object.entries(command.parameters)) {
        if (!this.isValidParameterName(paramName)) {
          errors.push(`Invalid parameter name '${paramName}': must be alphanumeric with underscores`);
        }

        if (config.type === 'enum' && (!config.enum || config.enum.length === 0)) {
          errors.push(`Enum parameter '${paramName}' must have at least one value in enum array`);
        }
      }
    }

    // Custom commands should not have delegate
    if (command.delegate) {
      errors.push('Custom commands should not have a delegate property (use template instead)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a hotkey configuration
   */
  private validateHotkey(command: Command): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!command.description) {
      errors.push('Hotkey must have a description');
    }

    if (!command.delegate) {
      errors.push('Hotkey must have a delegate tool name');
    }

    // Hotkeys should not have templates
    if (command.template) {
      errors.push('Hotkeys should not have a template property (use delegate instead)');
    }

    // Hotkeys should not have parameters (they delegate to tools that handle their own parameters)
    if (command.parameters) {
      errors.push('Hotkeys should not have parameters (parameters are handled by the delegated tool)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if a hotkey key is valid (single letter)
   */
  private isValidHotkeyKey(key: string): boolean {
    return /^[a-zA-Z]$/.test(key);
  }

  /**
   * Check if a parameter name is valid
   */
  private isValidParameterName(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  /**
   * Export current configuration
   */
  exportConfig(): CommandConfig {
    const config: CommandConfig = {};

    // Export commands
    if (this.commands.size > 0) {
      config.commands = {};
      for (const [name, entry] of this.commands) {
        const { name: _, ...command } = entry.command; // Remove name from exported command
        config.commands[name] = command;
      }
    }

    // Export hotkeys
    if (this.hotkeys.size > 0) {
      config.hotkeys = {};
      for (const [key, entry] of this.hotkeys) {
        const { name: _, ...command } = entry.command; // Remove name from exported command
        config.hotkeys[key] = command;
      }
    }

    return config;
  }

  /**
   * Get help information for all commands and hotkeys
   */
  getHelp(): { commands: Array<{name: string, description: string, template?: string}>; hotkeys: Array<{key: string, description: string, delegate: string}> } {
    const commands = Array.from(this.commands.entries()).map(([name, entry]) => ({
      name,
      description: entry.command.description,
      template: entry.command.template
    }));

    const hotkeys = Array.from(this.hotkeys.entries()).map(([key, entry]) => ({
      key,
      description: entry.command.description,
      delegate: entry.command.delegate || ''
    }));

    return { commands, hotkeys };
  }
}

/**
 * Global command registry instance
 */
export const commandRegistry = new CommandRegistry();