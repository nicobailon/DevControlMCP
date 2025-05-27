/**
 * Centralized error handling for DevControlMCP command system
 */

import { ServerResult } from '../types.js';
import { createErrorResponse } from '../error-handlers.js';

/**
 * Command system specific error types
 */
export enum CommandErrorType {
  COMMAND_NOT_FOUND = 'COMMAND_NOT_FOUND',
  HOTKEY_NOT_FOUND = 'HOTKEY_NOT_FOUND',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  MISSING_PARAMETERS = 'MISSING_PARAMETERS',
  TEMPLATE_ERROR = 'TEMPLATE_ERROR',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  EXECUTION_ERROR = 'EXECUTION_ERROR',
  DELEGATE_ERROR = 'DELEGATE_ERROR'
}

/**
 * Command system error class
 */
export class CommandError extends Error {
  constructor(
    public type: CommandErrorType,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'CommandError';
  }
}

/**
 * Error handling utilities for command system
 */
export class CommandErrorHandler {
  /**
   * Handle command not found errors
   */
  static handleCommandNotFound(commandName: string): ServerResult {
    return createErrorResponse(
      `Custom command '${commandName}' not found. Use the custom command help tool to see available commands.`
    );
  }

  /**
   * Handle hotkey not found errors
   */
  static handleHotkeyNotFound(key: string, availableHotkeys?: string[]): ServerResult {
    let message = `Hotkey '${key}' not found.`;
    if (availableHotkeys && availableHotkeys.length > 0) {
      message += ` Available hotkeys: ${availableHotkeys.join(', ')}`;
    } else {
      message += ' No hotkeys are currently configured.';
    }

    return createErrorResponse(message);
  }

  /**
   * Handle parameter validation errors
   */
  static handleParameterErrors(
    errors: string[],
    commandName?: string,
    providedParams?: Record<string, any>
  ): ServerResult {
    const message = `Parameter validation failed: ${errors.join(', ')}`;
    
    return createErrorResponse(message);
  }

  /**
   * Handle missing required parameters
   */
  static handleMissingParameters(
    missingParams: string[],
    commandName?: string
  ): ServerResult {
    const message = `Missing required parameters: ${missingParams.join(', ')}`;
    
    return createErrorResponse(message);
  }

  /**
   * Handle template processing errors
   */
  static handleTemplateError(
    templateErrors: string[],
    template?: string,
    parameters?: Record<string, any>
  ): ServerResult {
    const message = `Template processing failed: ${templateErrors.join(', ')}`;
    
    return createErrorResponse(message);
  }

  /**
   * Handle security policy violations
   */
  static handleSecurityViolation(
    reason: string,
    commandName?: string,
    processedCommand?: string
  ): ServerResult {
    const message = `Command blocked by security policy: ${reason}`;
    
    return createErrorResponse(message);
  }

  /**
   * Handle general validation errors
   */
  static handleValidationError(
    validationErrors: string[],
    context?: Record<string, any>
  ): ServerResult {
    const message = `Validation failed: ${validationErrors.join(', ')}`;
    
    return createErrorResponse(message);
  }

  /**
   * Handle configuration errors
   */
  static handleConfigurationError(
    message: string,
    configKey?: string,
    configValue?: any
  ): ServerResult {
    return createErrorResponse(`Configuration error: ${message}`);
  }

  /**
   * Handle command execution errors
   */
  static handleExecutionError(
    error: Error | string,
    commandName?: string,
    processedCommand?: string
  ): ServerResult {
    const message = error instanceof Error ? error.message : String(error);
    
    return createErrorResponse(`Command execution failed: ${message}`);
  }

  /**
   * Handle hotkey delegation errors
   */
  static handleDelegateError(
    delegateTarget: string,
    error: Error | string,
    hotkeyKey?: string
  ): ServerResult {
    const message = error instanceof Error ? error.message : String(error);
    
    // Log detailed error information for troubleshooting
    console.error(`[DevControlMCP] Hotkey delegation failure:`, {
      hotkeyKey,
      delegateTarget,
      error: message,
      timestamp: new Date().toISOString()
    });
    
    // Provide user-friendly error message with context
    const userMessage = hotkeyKey 
      ? `Hotkey '${hotkeyKey}' failed to execute delegate tool '${delegateTarget}': ${message}`
      : `Failed to execute delegate tool '${delegateTarget}': ${message}`;
    
    const fullMessage = `${userMessage}\n\nSuggestions:\n- Check if the delegated tool exists and is properly configured\n- Verify the parameters match the expected format for the delegated tool\n- Review hotkey configuration for correct delegate target\n- Use the hotkey help tool to see available delegate targets`;
    
    return createErrorResponse(fullMessage);
  }

  /**
   * Handle generic command system errors
   */
  static handleGenericError(
    error: Error | string,
    context?: Record<string, any>
  ): ServerResult {
    const message = error instanceof Error ? error.message : String(error);
    
    return createErrorResponse(`Command system error: ${message}`);
  }

  /**
   * Create a helpful error response with suggestions
   */
  static createHelpfulError(
    message: string,
    suggestions: string[],
    errorType?: CommandErrorType,
    details?: Record<string, any>
  ): ServerResult {
    const fullMessage = `${message}\n\nSuggestions:\n${suggestions.map(s => `- ${s}`).join('\n')}`;
    
    return createErrorResponse(fullMessage);
  }

  /**
   * Validate and format error response for MCP
   */
  static formatMCPError(
    error: CommandError | Error | string,
    context?: Record<string, any>
  ): ServerResult {
    if (error instanceof CommandError) {
      return createErrorResponse(error.message);
    }
    
    if (error instanceof Error) {
      return createErrorResponse(error.message);
    }
    
    return createErrorResponse(String(error));
  }

  /**
   * Create user-friendly error messages with corrective guidance
   */
  static createUserFriendlyError(
    errorType: CommandErrorType,
    details: Record<string, any>
  ): ServerResult {
    switch (errorType) {
      case CommandErrorType.COMMAND_NOT_FOUND:
        return this.createHelpfulError(
          `Command '${details.commandName}' not found.`,
          [
            'Check available commands with the custom command help tool',
            'Verify the command name spelling',
            'Make sure the command is properly configured'
          ],
          errorType,
          details
        );

      case CommandErrorType.MISSING_PARAMETERS:
        return this.createHelpfulError(
          `Missing required parameters: ${details.missingParameters?.join(', ')}`,
          [
            'Check command documentation for required parameters',
            'Use the command preview tool to test parameter combinations',
            'Ensure all required parameters are provided in the parameters object'
          ],
          errorType,
          details
        );

      case CommandErrorType.SECURITY_VIOLATION:
        return this.createHelpfulError(
          `Command blocked by security policy: ${details.securityReason}`,
          [
            'Review the command template for dangerous operations',
            'Check blocked commands configuration',
            'Consider using safer alternatives or breaking into smaller commands',
            'Contact administrator if this command should be allowed'
          ],
          errorType,
          details
        );

      case CommandErrorType.TEMPLATE_ERROR:
        return this.createHelpfulError(
          `Template processing failed: ${details.templateErrors?.join(', ')}`,
          [
            'Check template syntax for proper {{parameter}} format',
            'Ensure all template parameters are defined in parameters configuration',
            'Verify parameter values match expected types',
            'Use template validation tool to check syntax'
          ],
          errorType,
          details
        );

      case CommandErrorType.HOTKEY_NOT_FOUND:
        return this.createHelpfulError(
          `Hotkey '${details.key}' not found.`,
          [
            'Check available hotkeys with hotkey help',
            'Verify the hotkey letter is correct',
            'Make sure hotkeys are properly configured'
          ],
          errorType,
          details
        );

      default:
        return this.formatMCPError(`Unknown error type: ${errorType}`, details);
    }
  }
}