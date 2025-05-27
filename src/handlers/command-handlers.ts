/**
 * Handlers for command management tools
 */

import { commandHelp, hotkeyHelp } from '../tools/command-management.js';
import { executeCustomCommand } from '../tools/custom-commands.js';
import { executeHotkey } from '../tools/hotkeys.js';
import { createErrorResponse } from '../error-handlers.js';
import { ServerResult } from '../types.js';

export async function handleCommandHelp(_args: any): Promise<ServerResult> {
  try {
    return await commandHelp();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to get command help: ${errorMessage}`);
  }
}

export async function handleHotkeyHelp(_args: any): Promise<ServerResult> {
  try {
    return await hotkeyHelp();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to get hotkey help: ${errorMessage}`);
  }
}

export async function handleCustomCommand(args: any): Promise<ServerResult> {
  try {
    const { name, parameters } = args;
    return await executeCustomCommand(name, parameters || {});
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to execute custom command: ${errorMessage}`);
  }
}

export async function handleHotkey(args: any): Promise<ServerResult> {
  try {
    return await executeHotkey(args);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to execute hotkey: ${errorMessage}`);
  }
}