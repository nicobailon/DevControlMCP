/**
 * MCP tool implementations for custom commands
 */

import { commandRegistry } from '../command-system/command-registry.js';
import { CommandValidator } from '../command-system/command-validator.js';
import { CommandSecurity } from '../command-system/security-integration.js';
import { TemplateEngine } from '../command-system/template-engine.js';
import { createErrorResponse } from '../error-handlers.js';
import { ServerResult } from '../types.js';
import { handleExecuteCommand } from '../handlers/terminal-handlers.js';

/**
 * Execute a custom command by name
 */
export async function executeCustomCommand(
  commandName: string,
  args: { parameters?: Record<string, any> } = {}
): Promise<ServerResult> {
  try {
    const parameters = args.parameters || {};

    // Get the command from registry
    const commandEntry = commandRegistry.getCommand(commandName);
    if (!commandEntry) {
      return createErrorResponse(`Custom command '${commandName}' not found`);
    }

    const command = commandEntry.command;

    // Validate the command execution
    const validation = CommandValidator.validateCustomCommand(commandName, parameters);
    if (!validation.valid) {
      return createErrorResponse(`Command validation failed: ${validation.errors.join(', ')}`);
    }

    // Check security policies
    const securityCheck = await CommandSecurity.validateCustomCommand(command, parameters);
    if (!securityCheck.allowed) {
      return createErrorResponse(`Command blocked by security policy: ${securityCheck.reason}`);
    }

    // Execute the processed command
    if (!securityCheck.processedCommand) {
      return createErrorResponse('Failed to process command template');
    }

    // Use the existing terminal execution handler
    const result = await handleExecuteCommand({
      command: securityCheck.processedCommand,
      timeout: 30000 // Default 30 second timeout
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Custom command execution failed: ${errorMessage}`);
  }
}

/**
 * Get information about available custom commands
 */
export async function getCustomCommandInfo(): Promise<ServerResult> {
  try {
    const commands = commandRegistry.getAllCommands();
    const commandList: Array<{
      name: string;
      description: string;
      template: string;
      parameters: Record<string, any>;
      toolName: string;
    }> = [];

    for (const [name, entry] of commands) {
      commandList.push({
        name,
        description: entry.command.description,
        template: entry.command.template || '',
        parameters: entry.command.parameters || {},
        toolName: entry.toolName || ''
      });
    }

    const stats = commandRegistry.getStats();

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          message: "Custom commands information",
          stats: {
            totalCommands: stats.commandCount,
            totalHotkeys: stats.hotkeyCount
          },
          commands: commandList
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to get custom command info: ${errorMessage}`);
  }
}

/**
 * Validate a custom command configuration
 */
export async function validateCustomCommandConfig(args: {
  name: string;
  command: {
    description: string;
    template: string;
    parameters?: Record<string, any>;
  };
}): Promise<ServerResult> {
  try {
    const { name, command } = args;

    // Validate the command configuration
    const validation = CommandValidator.validateCommandConfig(name, command, 'custom');
    
    if (!validation.valid) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            valid: false,
            errors: validation.errors,
            message: `Command '${name}' configuration is invalid`
          }, null, 2)
        }],
        isError: false
      };
    }

    // Generate security report
    const securityReport = CommandSecurity.generateSecurityReport(command);

    // Analyze template
    let templateAnalysis;
    if (command.template) {
      templateAnalysis = {
        parameters: TemplateEngine.extractParameters(command.template),
        isValid: TemplateEngine.isValidTemplate(command.template)
      };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          valid: true,
          message: `Command '${name}' configuration is valid`,
          analysis: {
            template: templateAnalysis,
            security: securityReport,
            parameters: Object.keys(command.parameters || {}).length
          }
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to validate command configuration: ${errorMessage}`);
  }
}

/**
 * Preview what a custom command would execute (without actually executing it)
 */
export async function previewCustomCommand(args: {
  commandName: string;
  parameters?: Record<string, any>;
}): Promise<ServerResult> {
  try {
    const { commandName, parameters = {} } = args;

    // Get the command from registry
    const commandEntry = commandRegistry.getCommand(commandName);
    if (!commandEntry) {
      return createErrorResponse(`Custom command '${commandName}' not found`);
    }

    const command = commandEntry.command;

    // Validate the command
    const validation = CommandValidator.validateCustomCommand(commandName, parameters);
    if (!validation.valid) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            errors: validation.errors,
            message: "Command validation failed"
          }, null, 2)
        }],
        isError: false
      };
    }

    // Process the template
    if (!command.template) {
      return createErrorResponse('Command missing template');
    }

    const templateResult = TemplateEngine.processTemplate(
      command.template,
      parameters,
      command.parameters
    );

    if (!templateResult.success) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            errors: templateResult.errors,
            message: "Template processing failed"
          }, null, 2)
        }],
        isError: false
      };
    }

    // Check security
    const securityCheck = await CommandSecurity.validateCustomCommand(command, parameters);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          preview: {
            originalTemplate: command.template,
            processedCommand: templateResult.command,
            parameters: parameters,
            security: {
              allowed: securityCheck.allowed,
              reason: securityCheck.reason
            }
          },
          message: securityCheck.allowed 
            ? "Command preview generated successfully" 
            : "Command would be blocked by security policy"
        }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to preview command: ${errorMessage}`);
  }
}

/**
 * Get help for custom commands
 */
export async function getCustomCommandHelp(args: { commandName?: string } = {}): Promise<ServerResult> {
  try {
    const { commandName } = args;

    if (commandName) {
      // Get help for a specific command
      const commandEntry = commandRegistry.getCommand(commandName);
      if (!commandEntry) {
        return createErrorResponse(`Custom command '${commandName}' not found`);
      }

      const command = commandEntry.command;
      const parameterInfo = Object.entries(command.parameters || {}).map(([name, config]) => ({
        name,
        type: config.type,
        required: config.required || false,
        description: config.description || '',
        enum: config.enum || undefined
      }));

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            command: commandName,
            description: command.description,
            template: command.template,
            parameters: parameterInfo,
            usage: `Use tool 'custom_${commandName}' with parameters object`,
            example: parameterInfo.length > 0 
              ? `{"parameters": {${parameterInfo.map(p => `"${p.name}": "value"`).join(', ')}}}`
              : '{"parameters": {}}'
          }, null, 2)
        }],
        isError: false
      };
    } else {
      // Get help for all commands
      const help = commandRegistry.getHelp();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            message: "Custom Commands Help",
            commands: help.commands.map(cmd => ({
              name: cmd.name,
              description: cmd.description,
              toolName: `custom_${cmd.name}`,
              template: cmd.template
            })),
            usage: "Each custom command is available as a tool with name 'custom_<command_name>'",
            note: "Use parameters object to pass values for template substitution"
          }, null, 2)
        }],
        isError: false
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to get command help: ${errorMessage}`);
  }
}