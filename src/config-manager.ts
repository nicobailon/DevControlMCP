import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import os from 'os';
import { CommandConfig, CommandConfigEntry } from './command-system/types.js';

export interface ServerConfig {
  blockedCommands?: string[];
  defaultShell?: string;
  allowedDirectories?: string[];
  claudeCliPath?: string; // Absolute path to the Claude CLI executable
  claudeCliName?: string; // Name of the Claude CLI binary (e.g., 'claude', 'claude-custom')
  fileWriteLineLimit?: number; // Line limit for file write operations
  fileReadLineLimit?: number; // Default line limit for file read operations
  maxLineCountLimit?: number; // Maximum line count in files (prevents memory issues)
  binaryFileSizeLimit?: number; // Maximum size for binary files in bytes
  
  // Command system configuration
  commandSystem?: CommandConfig; // Custom commands and hotkeys configuration
  enableCustomCommands?: boolean; // Enable/disable custom command system
  enableHotkeys?: boolean; // Enable/disable hotkey system
  
  [key: string]: any; // Allow for arbitrary configuration keys
}

/**
 * Singleton config manager for the server
 */
class ConfigManager {
  private configPath: string;
  private config: ServerConfig = {};
  private initialized = false;

  constructor() {
    // Get user's home directory
    const homeDir = os.homedir();
    // Define config directory and file paths
    const configDir = path.join(homeDir, '.devcontrol-mcp');
    this.configPath = path.join(configDir, 'config.json');
  }

  /**
   * Initialize configuration - load from disk or create default
   */
  async init() {
    if (this.initialized) return;

    try {
      // Ensure config directory exists
      const configDir = path.dirname(this.configPath);
      if (!existsSync(configDir)) {
        await mkdir(configDir, { recursive: true });
      }

      // Check if config file exists
      try {
        await fs.access(this.configPath);
        // Load existing config
        const configData = await fs.readFile(this.configPath, 'utf8');
        this.config = JSON.parse(configData);
      } catch (error) {
        // Config file doesn't exist, create default
        this.config = this.getDefaultConfig();
        await this.saveConfig();
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize config:', error);
      // Fall back to default config in memory
      this.config = this.getDefaultConfig();
      this.initialized = true;
    }
  }

  /**
   * Alias for init() to maintain backward compatibility
   */
  async loadConfig() {
    return this.init();
  }

  /**
   * Create default configuration
   */
  private getDefaultConfig(): ServerConfig {
    return {
      blockedCommands: [

        // Disk and partition management
        "mkfs",      // Create a filesystem on a device
        "format",    // Format a storage device (cross-platform)
        "mount",     // Mount a filesystem
        "umount",    // Unmount a filesystem
        "fdisk",     // Manipulate disk partition tables
        "dd",        // Convert and copy files, can write directly to disks
        "parted",    // Disk partition manipulator
        "diskpart",  // Windows disk partitioning utility
        
        // System administration and user management
        "sudo",      // Execute command as superuser
        "su",        // Substitute user identity
        "passwd",    // Change user password
        "adduser",   // Add a user to the system
        "useradd",   // Create a new user
        "usermod",   // Modify user account
        "groupadd",  // Create a new group
        "chsh",      // Change login shell
        "visudo",    // Edit the sudoers file
        
        // System control
        "shutdown",  // Shutdown the system
        "reboot",    // Restart the system
        "halt",      // Stop the system
        "poweroff",  // Power off the system
        "init",      // Change system runlevel
        
        // Network and security
        "iptables",  // Linux firewall administration
        "firewall",  // Generic firewall command
        "netsh",     // Windows network configuration
        
        // Windows system commands
        "sfc",       // System File Checker
        "bcdedit",   // Boot Configuration Data editor
        "reg",       // Windows registry editor
        "net",       // Network/user/service management
        "sc",        // Service Control manager
        "runas",     // Execute command as another user
        "cipher",    // Encrypt/decrypt files or wipe data
        "takeown"    // Take ownership of files
      ],
      defaultShell: os.platform() === 'win32' ? 'powershell.exe' : 'bash',
      allowedDirectories: [],
      claudeCliPath: undefined,
      claudeCliName: 'claude',
      fileWriteLineLimit: 50,  // Default line limit for file write operations
      fileReadLineLimit: 1000,  // Default line limit for file read operations
      maxLineCountLimit: 1000000, // Maximum line count (1 million lines)
      binaryFileSizeLimit: 10 * 1024 * 1024, // 10 MB limit for binary files
      
      // Command system defaults
      enableCustomCommands: true, // Enable custom command system by default
      enableHotkeys: true, // Enable hotkey system by default
      commandSystem: {
        commands: {
          // Example custom command
          npm_install: {
            description: "Install npm packages",
            template: "npm install {{package}}",
            parameters: {
              package: {
                type: "string",
                required: true,
                description: "Package name to install"
              }
            }
          }
        },
        hotkeys: {
          // Example hotkeys - these work without parameters or have sensible defaults
          c: {
            description: "Show current configuration",
            delegate: "get_config"
          },
          p: {
            description: "List all running processes",
            delegate: "list_processes"
          },
          s: {
            description: "List active terminal sessions",
            delegate: "list_sessions"
          }
        }
      }
    };
  }

  /**
   * Save config to disk
   */
  private async saveConfig() {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  }

  /**
   * Get the entire config
   */
  async getConfig(): Promise<ServerConfig> {
    await this.init();
    return { ...this.config };
  }

  /**
   * Get a specific configuration value
   */
  async getValue(key: string): Promise<any> {
    await this.init();
    return this.config[key];
  }

  /**
   * Validate configuration values
   * @param key Configuration key
   * @param value Value to validate
   * @returns Validated and possibly corrected value
   */
  private validateConfigValue(key: string, value: any): any {
    // Validate line limits to ensure they are positive integers
    if (key === 'fileReadLineLimit' || key === 'fileWriteLineLimit' || key === 'maxLineCountLimit' || key === 'binaryFileSizeLimit') {
      // Convert to number if not already
      const numValue = Number(value);
      
      // Check if it's a positive integer
      if (isNaN(numValue) || !Number.isInteger(numValue) || numValue <= 0) {
        console.warn(`Invalid value for ${key}: ${value}. Must be a positive integer. Using default.`);
        // Return default values
        return key === 'fileReadLineLimit' ? 1000 : 50;
      }
      return numValue;
    }
    
    // Validate claudeCliPath to ensure it's absolute if provided
    if (key === 'claudeCliPath' && value != null) {
      if (typeof value !== 'string') {
        console.warn(`Invalid value for ${key}: ${value}. Must be a string. Using default.`);
        return undefined;
      }
      if (value && !path.isAbsolute(value)) {
        console.warn(`Invalid value for ${key}: ${value}. Must be an absolute path. Using default.`);
        return undefined;
      }
    }
    
    // For all other keys, return value as-is
    return value;
  }

  /**
   * Set a specific configuration value
   */
  async setValue(key: string, value: any): Promise<void> {
    await this.init();
    const validatedValue = this.validateConfigValue(key, value);
    this.config[key] = validatedValue;
    await this.saveConfig();
  }

  /**
   * Update multiple configuration values at once
   */
  async updateConfig(updates: Partial<ServerConfig>): Promise<ServerConfig> {
    await this.init();
    
    // Validate each update value
    const validatedUpdates: Partial<ServerConfig> = {};
    for (const [key, value] of Object.entries(updates)) {
      validatedUpdates[key] = this.validateConfigValue(key, value);
    }
    
    this.config = { ...this.config, ...validatedUpdates };
    await this.saveConfig();
    return { ...this.config };
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfig(): Promise<ServerConfig> {
    this.config = this.getDefaultConfig();
    await this.saveConfig();
    return { ...this.config };
  }

  /**
   * Get command system configuration
   */
  async getCommandConfig(): Promise<CommandConfig> {
    await this.init();
    return this.config.commandSystem || { commands: {}, hotkeys: {} };
  }

  /**
   * Update command system configuration
   */
  async updateCommandConfig(commandConfig: CommandConfig): Promise<void> {
    await this.init();
    this.config.commandSystem = commandConfig;
    await this.saveConfig();
  }

  /**
   * Ensure command system structure exists
   */
  private ensureCommandSystemStructure(): void {
    this.config.commandSystem = this.config.commandSystem || { commands: {}, hotkeys: {} };
    this.config.commandSystem.commands = this.config.commandSystem.commands || {};
    this.config.commandSystem.hotkeys = this.config.commandSystem.hotkeys || {};
  }

  /**
   * Add or update a custom command
   */
  async setCommand(name: string, command: CommandConfigEntry): Promise<void> {
    await this.init();
    this.ensureCommandSystemStructure();
    this.config.commandSystem!.commands![name] = command;
    await this.saveConfig();
  }

  /**
   * Add or update a hotkey
   */
  async setHotkey(key: string, hotkey: CommandConfigEntry): Promise<void> {
    await this.init();
    this.ensureCommandSystemStructure();
    this.config.commandSystem!.hotkeys![key] = hotkey;
    await this.saveConfig();
  }

  /**
   * Remove a custom command
   */
  async removeCommand(name: string): Promise<boolean> {
    await this.init();
    if (!this.config.commandSystem?.commands) {
      return false;
    }
    const existed = name in this.config.commandSystem.commands;
    delete this.config.commandSystem.commands[name];
    if (existed) {
      await this.saveConfig();
    }
    return existed;
  }

  /**
   * Remove a hotkey
   */
  async removeHotkey(key: string): Promise<boolean> {
    await this.init();
    if (!this.config.commandSystem?.hotkeys) {
      return false;
    }
    const existed = key in this.config.commandSystem.hotkeys;
    delete this.config.commandSystem.hotkeys[key];
    if (existed) {
      await this.saveConfig();
    }
    return existed;
  }

  /**
   * Check if custom commands are enabled
   */
  async isCustomCommandsEnabled(): Promise<boolean> {
    await this.init();
    return this.config.enableCustomCommands !== false; // Default to true
  }

  /**
   * Check if hotkeys are enabled
   */
  async isHotkeysEnabled(): Promise<boolean> {
    await this.init();
    return this.config.enableHotkeys !== false; // Default to true
  }

  /**
   * Enable or disable custom commands
   */
  async setCustomCommandsEnabled(enabled: boolean): Promise<void> {
    await this.setValue('enableCustomCommands', enabled);
  }

  /**
   * Enable or disable hotkeys
   */
  async setHotkeysEnabled(enabled: boolean): Promise<void> {
    await this.setValue('enableHotkeys', enabled);
  }

  /**
   * Batch update multiple commands at once
   * Avoids multiple saveConfig() calls for better performance
   */
  async setCommands(commands: Record<string, CommandConfigEntry>): Promise<void> {
    await this.init();
    this.ensureCommandSystemStructure();
    
    for (const [name, command] of Object.entries(commands)) {
      this.config.commandSystem!.commands![name] = command;
    }
    
    await this.saveConfig();
  }

  /**
   * Batch update multiple hotkeys at once
   * Avoids multiple saveConfig() calls for better performance
   */
  async setHotkeys(hotkeys: Record<string, CommandConfigEntry>): Promise<void> {
    await this.init();
    this.ensureCommandSystemStructure();
    
    for (const [key, hotkey] of Object.entries(hotkeys)) {
      this.config.commandSystem!.hotkeys![key] = hotkey;
    }
    
    await this.saveConfig();
  }

  /**
   * Batch remove multiple commands at once
   * Returns list of command names that were actually removed
   */
  async removeCommands(names: string[]): Promise<string[]> {
    await this.init();
    if (!this.config.commandSystem?.commands) {
      return [];
    }
    
    const removedNames: string[] = [];
    
    for (const name of names) {
      if (name in this.config.commandSystem.commands) {
        delete this.config.commandSystem.commands[name];
        removedNames.push(name);
      }
    }
    
    if (removedNames.length > 0) {
      await this.saveConfig();
    }
    
    return removedNames;
  }

  /**
   * Batch remove multiple hotkeys at once
   * Returns list of hotkey keys that were actually removed
   */
  async removeHotkeys(keys: string[]): Promise<string[]> {
    await this.init();
    if (!this.config.commandSystem?.hotkeys) {
      return [];
    }
    
    const removedKeys: string[] = [];
    
    for (const key of keys) {
      if (key in this.config.commandSystem.hotkeys) {
        delete this.config.commandSystem.hotkeys[key];
        removedKeys.push(key);
      }
    }
    
    if (removedKeys.length > 0) {
      await this.saveConfig();
    }
    
    return removedKeys;
  }

  /**
   * Batch update both commands and hotkeys in a single operation
   * Most efficient for complex configuration updates
   */
  async setBatchCommandConfig(config: {
    commands?: Record<string, CommandConfigEntry>;
    hotkeys?: Record<string, CommandConfigEntry>;
  }): Promise<void> {
    await this.init();
    this.ensureCommandSystemStructure();
    
    if (config.commands) {
      for (const [name, command] of Object.entries(config.commands)) {
        this.config.commandSystem!.commands![name] = command;
      }
    }
    
    if (config.hotkeys) {
      for (const [key, hotkey] of Object.entries(config.hotkeys)) {
        this.config.commandSystem!.hotkeys![key] = hotkey;
      }
    }
    
    await this.saveConfig();
  }
}

// Export singleton instance
export const configManager = new ConfigManager();