/**
 * Zod schema validation for command system configuration
 */

import { z } from 'zod';

/**
 * Parameter configuration schema
 */
export const ParameterConfigSchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'enum']),
  required: z.boolean().optional(),
  enum: z.array(z.string()).optional(),
  description: z.string().optional(),
  default: z.union([z.string(), z.number(), z.boolean()]).optional()
}).refine(
  (data) => {
    // If type is enum, enum values must be provided
    if (data.type === 'enum' && (!data.enum || data.enum.length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: 'Parameters with type "enum" must provide enum values'
  }
).refine(
  (data) => {
    // If enum is provided, type must be enum
    if (data.enum && data.enum.length > 0 && data.type !== 'enum') {
      return false;
    }
    return true;
  },
  {
    message: 'Parameters with enum values must have type "enum"'
  }
);

/**
 * Command configuration entry schema (without name field)
 */
export const CommandConfigEntrySchema = z.object({
  description: z.string().min(1, 'Description is required'),
  template: z.string().optional(),
  delegate: z.string().optional(),
  parameters: z.record(z.string(), ParameterConfigSchema).optional()
}).refine(
  (data) => {
    // Either template or delegate should be present, but not both
    const hasTemplate = !!data.template;
    const hasDelegate = !!data.delegate;
    return hasTemplate !== hasDelegate; // XOR - exactly one should be true
  },
  {
    message: 'Command must have either template (for custom commands) or delegate (for hotkeys), but not both'
  }
);

/**
 * Custom command specific schema
 */
export const CustomCommandConfigSchema = CommandConfigEntrySchema.refine(
  (data) => !!data.template,
  {
    message: 'Custom commands must have a template'
  }
).refine(
  (data) => !data.delegate,
  {
    message: 'Custom commands should not have a delegate'
  }
);

/**
 * Hotkey command specific schema
 */
export const HotkeyConfigSchema = CommandConfigEntrySchema.refine(
  (data) => !!data.delegate,
  {
    message: 'Hotkeys must have a delegate'
  }
).refine(
  (data) => !data.template,
  {
    message: 'Hotkeys should not have a template'
  }
).refine(
  (data) => !data.parameters,
  {
    message: 'Hotkeys should not define parameters (handled by delegated tool)'
  }
);

/**
 * Command configuration schema
 */
export const CommandConfigSchema = z.object({
  commands: z.record(z.string(), CustomCommandConfigSchema).optional(),
  hotkeys: z.record(z.string(), HotkeyConfigSchema).optional()
});

/**
 * Extended server configuration schema
 */
export const ServerConfigSchema = z.object({
  blockedCommands: z.array(z.string()).optional(),
  defaultShell: z.string().optional(),
  allowedDirectories: z.array(z.string()).optional(),
  claudeCliPath: z.string().optional(),
  claudeCliName: z.string().optional(),
  fileWriteLineLimit: z.number().int().positive().optional(),
  fileReadLineLimit: z.number().int().positive().optional(),
  maxLineCountLimit: z.number().int().positive().optional(),
  binaryFileSizeLimit: z.number().int().positive().optional(),
  
  // Command system configuration
  commandSystem: CommandConfigSchema.optional(),
  enableCustomCommands: z.boolean().optional(),
  enableHotkeys: z.boolean().optional()
}).catchall(z.any()); // Allow additional arbitrary keys

/**
 * Validation utilities
 */
export class ConfigValidator {
  /**
   * Validate complete server configuration
   */
  static validateServerConfig(config: unknown): {
    valid: boolean;
    data?: any;
    errors: string[];
  } {
    const result = ServerConfigSchema.safeParse(config);
    
    if (result.success) {
      return {
        valid: true,
        data: result.data,
        errors: []
      };
    }
    
    return {
      valid: false,
      errors: result.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      )
    };
  }

  /**
   * Validate command system configuration
   */
  static validateCommandConfig(config: unknown): {
    valid: boolean;
    data?: any;
    errors: string[];
  } {
    const result = CommandConfigSchema.safeParse(config);
    
    if (result.success) {
      return {
        valid: true,
        data: result.data,
        errors: []
      };
    }
    
    return {
      valid: false,
      errors: result.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      )
    };
  }

  /**
   * Validate a single custom command configuration
   */
  static validateCustomCommand(config: unknown): {
    valid: boolean;
    data?: any;
    errors: string[];
  } {
    const result = CustomCommandConfigSchema.safeParse(config);
    
    if (result.success) {
      return {
        valid: true,
        data: result.data,
        errors: []
      };
    }
    
    return {
      valid: false,
      errors: result.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      )
    };
  }

  /**
   * Validate a single hotkey configuration
   */
  static validateHotkey(config: unknown): {
    valid: boolean;
    data?: any;
    errors: string[];
  } {
    const result = HotkeyConfigSchema.safeParse(config);
    
    if (result.success) {
      return {
        valid: true,
        data: result.data,
        errors: []
      };
    }
    
    return {
      valid: false,
      errors: result.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      )
    };
  }

  /**
   * Validate command name format
   */
  static validateCommandName(name: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const reservedNames = [
      'get_config', 'set_config_value', 'execute_command', 'read_output', 
      'force_terminate', 'list_sessions', 'list_processes', 'kill_process',
      'read_file', 'write_file', 'create_directory', 'list_directory',
      'move_file', 'search_files', 'search_code', 'get_file_info',
      'read_multiple_files', 'edit_block', 'claude_code', 'hotkey',
      'custom_command', 'command_help', 'hotkey_help'
    ];
    
    if (!name) {
      errors.push('Command name is required');
    } else {
      if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
        errors.push('Command name must start with a letter and contain only letters, numbers, underscores, and hyphens');
      }
      
      if (name.length < 2) {
        errors.push('Command name must be at least 2 characters long');
      }
      
      if (name.length > 50) {
        errors.push('Command name must be no more than 50 characters long');
      }
      
      if (reservedNames.includes(name)) {
        errors.push(`Command name '${name}' is reserved and cannot be used`);
      }
      
      if (name.startsWith('custom_')) {
        errors.push('Command names should not start with "custom_" prefix (this is added automatically)');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate hotkey key format
   */
  static validateHotkeyKey(key: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!key) {
      errors.push('Hotkey key is required');
    } else {
      if (!/^[a-zA-Z]$/.test(key)) {
        errors.push('Hotkey key must be a single letter');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate template syntax
   */
  static validateTemplate(template: string): {
    valid: boolean;
    errors: string[];
    parameters: string[];
  } {
    const errors: string[] = [];
    const parameters: string[] = [];
    
    if (!template) {
      errors.push('Template is required');
      return { valid: false, errors, parameters };
    }
    
    try {
      // Check for balanced braces
      const openBraces = (template.match(/\{\{/g) || []).length;
      const closeBraces = (template.match(/\}\}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        errors.push('Template has unbalanced braces');
      }
      
      // Extract and validate parameter names
      const paramRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
      let match;
      
      while ((match = paramRegex.exec(template)) !== null) {
        const paramName = match[1];
        if (!parameters.includes(paramName)) {
          parameters.push(paramName);
        }
        
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(paramName)) {
          errors.push(`Invalid parameter name '${paramName}': must be alphanumeric with underscores`);
        }
      }
      
      // Check for invalid parameter syntax
      const invalidParams = template.match(/\{\{[^}]*\}\}/g)?.filter(param => 
        !paramRegex.test(param)
      );
      
      if (invalidParams) {
        invalidParams.forEach(param => {
          errors.push(`Invalid parameter syntax: ${param}`);
        });
      }
      
    } catch (error) {
      errors.push(`Template validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      parameters
    };
  }

  /**
   * Validate delegate target
   */
  static validateDelegateTarget(delegate: string, availableTargets: string[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!delegate) {
      errors.push('Delegate target is required');
    } else {
      if (!availableTargets.includes(delegate)) {
        errors.push(`Invalid delegate target '${delegate}'. Available targets: ${availableTargets.join(', ')}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}