/**
 * Dynamic MCP tool registration system for custom commands
 */

import { commandRegistry } from './command-registry.js';
import { CommandRegistryEntry } from './types.js';
import { z } from 'zod';

/**
 * Schema for custom command tool arguments
 */
export const CustomCommandArgsSchema = z.object({
  parameters: z.record(z.any()).optional().describe("Parameters for the custom command template")
});

/**
 * Dynamic tool registry for managing MCP tool registration
 */
export class DynamicToolRegistry {
  private registeredTools: Set<string> = new Set();

  /**
   * Generate MCP tool definitions for all registered commands
   */
  generateToolDefinitions(): Array<{
    name: string;
    description: string;
    inputSchema: any;
  }> {
    const tools: Array<{
      name: string;
      description: string;
      inputSchema: any;
    }> = [];

    // Generate tools for custom commands
    const commands = commandRegistry.getAllCommands();
    for (const [_, entry] of commands) {
      if (entry.toolName) {
        tools.push({
          name: entry.toolName,
          description: this.generateToolDescription(entry),
          inputSchema: this.generateInputSchema(entry)
        });
        this.registeredTools.add(entry.toolName);
      }
    }

    return tools;
  }

  /**
   * Generate hotkey tool definition
   */
  generateHotkeyTool(): {
    name: string;
    description: string;
    inputSchema: any;
  } | null {
    const hotkeys = commandRegistry.getAllHotkeys();
    if (hotkeys.size === 0) {
      return null;
    }

    const hotkeyList = Array.from(hotkeys.entries())
      .map(([key, entry]) => `${key}: ${entry.command.description}`)
      .join(', ');

    return {
      name: 'hotkey',
      description: `Execute hotkey shortcuts. Available hotkeys: ${hotkeyList}`,
      inputSchema: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'Single letter hotkey to execute'
          },
          parameters: {
            type: 'object',
            description: 'Parameters to pass to the delegated tool (if any)',
            additionalProperties: true
          }
        },
        required: ['key']
      }
    };
  }

  /**
   * Check if a tool name is registered as a custom command
   */
  isCustomCommand(toolName: string): boolean {
    return this.registeredTools.has(toolName);
  }

  /**
   * Get the command registry entry for a tool name
   */
  getCommandForTool(toolName: string): CommandRegistryEntry | undefined {
    const commands = commandRegistry.getAllCommands();
    for (const [_, entry] of commands) {
      if (entry.toolName === toolName) {
        return entry;
      }
    }
    return undefined;
  }



  /**
   * Generate tool description for a command
   */
  private generateToolDescription(entry: CommandRegistryEntry): string {
    const { command } = entry;
    let description = command.description;

    if (command.template) {
      description += ` Template: ${command.template}`;
    }

    if (command.parameters) {
      const paramList = Object.entries(command.parameters)
        .map(([name, config]) => {
          let paramDesc = `${name} (${config.type})`;
          if (config.required) {
            paramDesc += ' [required]';
          }
          if (config.enum) {
            paramDesc += ` [options: ${config.enum.join(', ')}]`;
          }
          return paramDesc;
        })
        .join(', ');
      
      if (paramList) {
        description += ` Parameters: ${paramList}`;
      }
    }

    return description;
  }

  /**
   * Generate input schema for a command
   */
  private generateInputSchema(entry: CommandRegistryEntry): any {
    const { command } = entry;
    
    if (!command.parameters || Object.keys(command.parameters).length === 0) {
      // Simple schema for commands without parameters
      return {
        type: 'object',
        properties: {
          parameters: {
            type: 'object',
            description: 'Parameters for the command (optional)',
            additionalProperties: true
          }
        }
      };
    }

    // Generate schema based on parameter configuration
    const properties: any = {};
    const required: string[] = [];

    for (const [paramName, config] of Object.entries(command.parameters)) {
      const paramSchema: any = {
        description: config.description || `${paramName} parameter`
      };

      switch (config.type) {
        case 'string':
          paramSchema.type = 'string';
          if (config.enum) {
            paramSchema.enum = config.enum;
          }
          break;
        case 'number':
          paramSchema.type = 'number';
          break;
        case 'boolean':
          paramSchema.type = 'boolean';
          break;
        case 'enum':
          paramSchema.type = 'string';
          if (config.enum) {
            paramSchema.enum = config.enum;
          }
          break;
      }

      properties[paramName] = paramSchema;

      if (config.required) {
        required.push(paramName);
      }
    }

    return {
      type: 'object',
      properties: {
        parameters: {
          type: 'object',
          properties,
          required: required.length > 0 ? required : undefined,
          additionalProperties: false
        }
      }
    };
  }

  /**
   * Get all registered tool names
   */
  getRegisteredToolNames(): string[] {
    return Array.from(this.registeredTools);
  }

  /**
   * Get statistics about registered tools
   */
  getStats(): {
    customCommandCount: number;
    hotkeyCount: number;
    registeredToolCount: number;
  } {
    const registryStats = commandRegistry.getStats();
    return {
      customCommandCount: registryStats.commandCount,
      hotkeyCount: registryStats.hotkeyCount,
      registeredToolCount: this.registeredTools.size
    };
  }
}

/**
 * Global dynamic tool registry instance
 */
export const dynamicToolRegistry = new DynamicToolRegistry();