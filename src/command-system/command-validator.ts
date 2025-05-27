/**
 * Command validation and lookup logic for DevControlMCP command system
 */

import { commandRegistry } from './command-registry.js';
import { TemplateEngine } from './template-engine.js';
import { Command, CommandContext, ValidationResult, TemplateResult } from './types.js';

/**
 * Command validation and lookup service
 */
export class CommandValidator {
  /**
   * Validate and prepare a custom command for execution
   */
  static validateCustomCommand(
    commandName: string,
    parameters: Record<string, any> = {}
  ): {
    valid: boolean;
    errors: string[];
    context?: CommandContext;
    processedCommand?: string;
  } {
    const errors: string[] = [];

    // Check if command exists
    const commandEntry = commandRegistry.getCommand(commandName);
    if (!commandEntry) {
      errors.push(`Command '${commandName}' not found`);
      return { valid: false, errors };
    }

    const command = commandEntry.command;

    // Validate that this is a custom command
    if (!command.template) {
      errors.push(`Command '${commandName}' is not a custom command (missing template)`);
      return { valid: false, errors };
    }

    // Process template with parameters
    const templateResult = TemplateEngine.processTemplate(
      command.template,
      parameters,
      command.parameters
    );

    if (!templateResult.success) {
      errors.push(...templateResult.errors);
      return { valid: false, errors };
    }

    // Create command context
    const context: CommandContext = {
      command,
      parameters: templateResult.command === command.template ? parameters : {},
      input: templateResult.command
    };

    return {
      valid: true,
      errors: [],
      context,
      processedCommand: templateResult.command
    };
  }

  /**
   * Validate and prepare a hotkey for execution
   */
  static validateHotkey(
    key: string,
    parameters: Record<string, any> = {}
  ): {
    valid: boolean;
    errors: string[];
    context?: CommandContext;
    delegateTarget?: string;
  } {
    const errors: string[] = [];

    // Check if hotkey exists
    const hotkeyEntry = commandRegistry.getHotkey(key);
    if (!hotkeyEntry) {
      errors.push(`Hotkey '${key}' not found`);
      return { valid: false, errors };
    }

    const command = hotkeyEntry.command;

    // Validate that this is a hotkey
    if (!command.delegate) {
      errors.push(`Hotkey '${key}' is not properly configured (missing delegate)`);
      return { valid: false, errors };
    }

    // Create command context
    const context: CommandContext = {
      command,
      parameters,
      input: key
    };

    return {
      valid: true,
      errors: [],
      context,
      delegateTarget: command.delegate
    };
  }

  /**
   * Validate command name format
   */
  static isValidCommandName(name: string): boolean {
    // Command names should be alphanumeric with underscores and hyphens
    return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name);
  }

  /**
   * Validate hotkey format
   */
  static isValidHotkeyKey(key: string): boolean {
    // Hotkeys should be single letters
    return /^[a-zA-Z]$/.test(key);
  }

  /**
   * Check if a command name conflicts with existing MCP tools
   */
  static checkNameConflict(name: string): {
    hasConflict: boolean;
    conflictType?: 'builtin' | 'custom' | 'hotkey';
    suggestion?: string;
  } {
    // List of built-in MCP tool names
    const builtinTools = [
      'get_config', 'set_config_value',
      'execute_command', 'read_output', 'force_terminate', 'list_sessions',
      'list_processes', 'kill_process',
      'read_file', 'read_multiple_files', 'write_file', 'create_directory',
      'list_directory', 'move_file', 'search_files', 'search_code', 'get_file_info',
      'edit_block', 'claude_code', 'hotkey'
    ];

    // Check builtin conflicts
    if (builtinTools.includes(name)) {
      return {
        hasConflict: true,
        conflictType: 'builtin',
        suggestion: `${name}_custom`
      };
    }

    // Check custom command conflicts
    if (commandRegistry.hasCommand(name)) {
      return {
        hasConflict: true,
        conflictType: 'custom',
        suggestion: `${name}_alt`
      };
    }

    // Check hotkey conflicts (for single letter names)
    if (name.length === 1 && commandRegistry.hasHotkey(name)) {
      return {
        hasConflict: true,
        conflictType: 'hotkey',
        suggestion: `${name}_cmd`
      };
    }

    return { hasConflict: false };
  }

  /**
   * Validate a complete command configuration before registration
   */
  static validateCommandConfig(
    name: string,
    command: Command,
    type: 'custom' | 'hotkey'
  ): ValidationResult {
    const errors: string[] = [];

    // Validate name
    if (type === 'custom') {
      if (!this.isValidCommandName(name)) {
        errors.push(`Invalid command name '${name}': must start with a letter and contain only letters, numbers, underscores, and hyphens`);
      }
    } else {
      if (!this.isValidHotkeyKey(name)) {
        errors.push(`Invalid hotkey '${name}': must be a single letter`);
      }
    }

    // Check for name conflicts
    const conflictCheck = this.checkNameConflict(name);
    if (conflictCheck.hasConflict) {
      errors.push(`Name '${name}' conflicts with existing ${conflictCheck.conflictType} tool. Suggestion: '${conflictCheck.suggestion}'`);
    }

    // Validate command structure based on type
    if (type === 'custom') {
      if (!command.template) {
        errors.push('Custom commands must have a template');
      } else {
        // Validate template syntax
        if (!TemplateEngine.isValidTemplate(command.template)) {
          errors.push('Invalid template syntax');
        }

        // Check template parameters match configuration
        const templateParams = TemplateEngine.extractParameters(command.template);
        const configParams = Object.keys(command.parameters || {});

        for (const param of templateParams) {
          if (!configParams.includes(param)) {
            errors.push(`Template parameter '${param}' is not defined in parameters configuration`);
          }
        }
      }

      if (command.delegate) {
        errors.push('Custom commands should not have a delegate (use template instead)');
      }
    } else {
      if (!command.delegate) {
        errors.push('Hotkeys must have a delegate');
      }

      if (command.template) {
        errors.push('Hotkeys should not have a template (use delegate instead)');
      }

      if (command.parameters) {
        errors.push('Hotkeys should not define parameters (handled by delegated tool)');
      }
    }

    // Validate description
    if (!command.description || command.description.trim() === '') {
      errors.push('Command must have a description');
    }

    // Validate parameter configurations
    if (command.parameters) {
      for (const [paramName, config] of Object.entries(command.parameters)) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(paramName)) {
          errors.push(`Invalid parameter name '${paramName}': must be alphanumeric with underscores`);
        }

        if (config.type === 'enum' && (!config.enum || config.enum.length === 0)) {
          errors.push(`Enum parameter '${paramName}' must have at least one value in enum array`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      parameters: {} // Not used in this context
    };
  }

  /**
   * Get available commands and hotkeys summary
   */
  static getAvailableCommands(): {
    commands: Array<{ name: string; description: string; template: string; parameterCount: number }>;
    hotkeys: Array<{ key: string; description: string; delegate: string }>;
  } {
    const commands = Array.from(commandRegistry.getAllCommands().entries()).map(([name, entry]) => ({
      name,
      description: entry.command.description,
      template: entry.command.template || '',
      parameterCount: Object.keys(entry.command.parameters || {}).length
    }));

    const hotkeys = Array.from(commandRegistry.getAllHotkeys().entries()).map(([key, entry]) => ({
      key,
      description: entry.command.description,
      delegate: entry.command.delegate || ''
    }));

    return { commands, hotkeys };
  }

  /**
   * Search for commands by name or description
   */
  static searchCommands(query: string): {
    commands: Array<{ name: string; description: string; relevance: number }>;
    hotkeys: Array<{ key: string; description: string; relevance: number }>;
  } {
    const queryLower = query.toLowerCase();
    const commands: Array<{ name: string; description: string; relevance: number }> = [];
    const hotkeys: Array<{ key: string; description: string; relevance: number }> = [];

    // Search custom commands
    for (const [name, entry] of commandRegistry.getAllCommands()) {
      const nameMatch = name.toLowerCase().includes(queryLower);
      const descMatch = entry.command.description.toLowerCase().includes(queryLower);
      
      if (nameMatch || descMatch) {
        const relevance = nameMatch ? 10 : 5; // Name matches are more relevant
        commands.push({
          name,
          description: entry.command.description,
          relevance
        });
      }
    }

    // Search hotkeys
    for (const [key, entry] of commandRegistry.getAllHotkeys()) {
      const keyMatch = key.toLowerCase().includes(queryLower);
      const descMatch = entry.command.description.toLowerCase().includes(queryLower);
      
      if (keyMatch || descMatch) {
        const relevance = keyMatch ? 10 : 5;
        hotkeys.push({
          key,
          description: entry.command.description,
          relevance
        });
      }
    }

    // Sort by relevance
    commands.sort((a, b) => b.relevance - a.relevance);
    hotkeys.sort((a, b) => b.relevance - a.relevance);

    return { commands, hotkeys };
  }
}