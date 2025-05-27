/**
 * TypeScript interfaces and types for the DevControlMCP command system
 */

/**
 * Parameter validation configuration for command templates
 */
export interface ParameterConfig {
  type: 'string' | 'number' | 'boolean' | 'enum';
  required?: boolean;
  enum?: string[];
  description?: string;
}

/**
 * Core command interface supporting both custom commands and hotkeys
 */
export interface Command {
  /** Command name or hotkey letter */
  name: string;
  
  /** User-facing description of the command */
  description: string;
  
  /** Template string for custom commands (e.g., "npm run {{script}}") */
  template?: string;
  
  /** Tool name to delegate to for hotkeys (e.g., "search_files") */
  delegate?: string;
  
  /** Parameter validation configuration */
  parameters?: Record<string, ParameterConfig>;
}

/**
 * Command configuration without the name field (name is the key)
 */
export interface CommandConfigEntry {
  /** User-facing description of the command */
  description: string;
  
  /** Template string for custom commands (e.g., "npm run {{script}}") */
  template?: string;
  
  /** Tool name to delegate to for hotkeys (e.g., "search_files") */
  delegate?: string;
  
  /** Parameter validation configuration */
  parameters?: Record<string, ParameterConfig>;
}

/**
 * Configuration structure for commands and hotkeys
 */
export interface CommandConfig {
  /** Custom commands with template substitution */
  commands?: Record<string, CommandConfigEntry>;
  
  /** Single-letter hotkeys that delegate to existing tools */
  hotkeys?: Record<string, CommandConfigEntry>;
}

/**
 * Command execution context
 */
export interface CommandContext {
  /** The command being executed */
  command: Command;
  
  /** Provided parameter values */
  parameters: Record<string, any>;
  
  /** Original user input */
  input: string;
}

/**
 * Template processing result
 */
export interface TemplateResult {
  /** Processed command string with parameters substituted */
  command: string;
  
  /** Any validation errors encountered */
  errors: string[];
  
  /** Whether the template processing was successful */
  success: boolean;
}

/**
 * Command validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  
  /** List of validation errors */
  errors: string[];
  
  /** Validated and sanitized parameters */
  parameters: Record<string, any>;
}

/**
 * Command registry entry for internal tracking
 */
export interface CommandRegistryEntry {
  /** The command configuration */
  command: Command;
  
  /** MCP tool name (for custom commands with custom_ prefix) */
  toolName?: string;
  
  /** Whether this is a hotkey or custom command */
  type: 'custom' | 'hotkey';
}