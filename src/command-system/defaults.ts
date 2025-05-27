/**
 * Default configurations for commands and hotkeys
 */

import { CommandConfig, CommandConfigEntry } from './types.js';

/**
 * Default hotkeys that provide quick access to commonly used tools
 * These can be overridden by user configuration
 */
export const DEFAULT_HOTKEYS: Record<string, CommandConfigEntry> = {
  'c': {
    description: 'Show current configuration',
    delegate: 'get_config'
  },
  's': {
    description: 'List all terminal sessions',
    delegate: 'list_sessions'
  },
  'p': {
    description: 'List running processes',
    delegate: 'list_processes'
  },
  'l': {
    description: 'List current directory contents',
    delegate: 'list_directory'
  },
  'h': {
    description: 'Show available commands',
    delegate: 'command_help'
  },
  'k': {
    description: 'Show available hotkeys',
    delegate: 'hotkey_help'
  }
};

/**
 * Default commands (currently empty, can be extended in future)
 */
export const DEFAULT_COMMANDS: Record<string, CommandConfigEntry> = {};

/**
 * Complete default configuration
 */
export const DEFAULT_CONFIG: CommandConfig = {
  commands: DEFAULT_COMMANDS,
  hotkeys: DEFAULT_HOTKEYS
};

/**
 * Merge user configuration with defaults
 * User configuration takes precedence over defaults
 */
export function mergeWithDefaults(userConfig: CommandConfig): Required<CommandConfig> {
  return {
    commands: {
      ...DEFAULT_COMMANDS,
      ...(userConfig.commands || {})
    },
    hotkeys: {
      ...DEFAULT_HOTKEYS,
      ...(userConfig.hotkeys || {})
    }
  };
}