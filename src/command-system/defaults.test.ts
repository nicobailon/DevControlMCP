/**
 * Comprehensive tests for default configurations
 * Tests structure, merging behavior, and integration with CommandRegistry
 */

import { mergeWithDefaults, DEFAULT_HOTKEYS, DEFAULT_COMMANDS } from './defaults.js';
import { CommandConfig } from './types.js';
import { CommandRegistry } from './command-registry.js';

// Simple test framework that doesn't require Jest
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

class TestRunner {
  private results: TestResult[] = [];
  
  test(name: string, testFn: () => void | boolean | string): void {
    try {
      const result = testFn();
      if (result === false) {
        this.results.push({ name, passed: false, error: 'Test returned false' });
      } else if (typeof result === 'string') {
        this.results.push({ name, passed: false, error: result });
      } else {
        this.results.push({ name, passed: true });
      }
    } catch (error) {
      this.results.push({ 
        name, 
        passed: false, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  getResults(): { passed: number; failed: number; results: TestResult[] } {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.length - passed;
    return { passed, failed, results: this.results };
  }
}

// Simple assertion functions
function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(condition: boolean, message?: string): void {
  if (!condition) {
    throw new Error(message || 'Expected condition to be true');
  }
}

function assertDefined<T>(value: T | undefined, message?: string): asserts value is T {
  if (value === undefined) {
    throw new Error(message || 'Expected value to be defined');
  }
}

// Run comprehensive tests
export function runDefaultsTests(): { passed: number; failed: number } {
  const runner = new TestRunner();
  
  // === DEFAULT HOTKEYS STRUCTURE TESTS ===
  runner.test('DEFAULT_HOTKEYS contains all expected keys', () => {
    const expectedKeys = ['c', 's', 'p', 'l', 'h', 'k'];
    const actualKeys = Object.keys(DEFAULT_HOTKEYS);
    
    for (const key of expectedKeys) {
      assertTrue(actualKeys.includes(key), `Missing expected default hotkey: ${key}`);
    }
    
    assertEqual(actualKeys.length, expectedKeys.length, 
      `Expected ${expectedKeys.length} default hotkeys, got ${actualKeys.length}`);
  });

  runner.test('DEFAULT_HOTKEYS have correct tool delegates', () => {
    const expected = {
      'c': 'get_config',
      's': 'list_sessions', 
      'p': 'list_processes',
      'l': 'list_directory',
      'h': 'command_help',
      'k': 'hotkey_help'
    };
    
    for (const [key, expectedDelegate] of Object.entries(expected)) {
      assertDefined(DEFAULT_HOTKEYS[key], `Missing default hotkey: ${key}`);
      assertEqual(DEFAULT_HOTKEYS[key].delegate, expectedDelegate,
        `Wrong delegate for ${key}: expected ${expectedDelegate}, got ${DEFAULT_HOTKEYS[key].delegate}`);
    }
  });

  runner.test('All default hotkeys have non-empty descriptions', () => {
    for (const [key, hotkey] of Object.entries(DEFAULT_HOTKEYS)) {
      assertDefined(hotkey.description, `Default hotkey "${key}" missing description`);
      assertTrue(hotkey.description.trim().length > 0, `Default hotkey "${key}" has empty description`);
      assertTrue(hotkey.description.length >= 5, `Default hotkey "${key}" description too short: "${hotkey.description}"`);
    }
  });

  runner.test('DEFAULT_COMMANDS is empty (no default commands currently)', () => {
    const commandKeys = Object.keys(DEFAULT_COMMANDS);
    assertEqual(commandKeys.length, 0, `Expected no default commands, got: ${commandKeys.join(', ')}`);
  });

  // === MERGE BEHAVIOR TESTS ===
  runner.test('Empty config gets merged with all defaults', () => {
    const merged = mergeWithDefaults({});
    
    assertDefined(merged.hotkeys, 'Merged config missing hotkeys property');
    assertDefined(merged.commands, 'Merged config missing commands property');
    
    const mergedHotkeyKeys = Object.keys(merged.hotkeys!);
    const defaultHotkeyKeys = Object.keys(DEFAULT_HOTKEYS);
    
    assertEqual(mergedHotkeyKeys.length, defaultHotkeyKeys.length,
      `Expected ${defaultHotkeyKeys.length} hotkeys, got ${mergedHotkeyKeys.length}`);
    
    for (const key of defaultHotkeyKeys) {
      assertDefined(merged.hotkeys![key], `Missing default hotkey in merged config: ${key}`);
    }
  });

  runner.test('User hotkeys override specific defaults', () => {
    const userConfig: CommandConfig = {
      hotkeys: {
        'c': {
          description: 'Custom config hotkey',
          delegate: 'list_processes'
        }
      }
    };
    
    const merged = mergeWithDefaults(userConfig);
    
    // Check override
    assertEqual(merged.hotkeys!.c.delegate, 'list_processes',
      `Override failed: expected list_processes, got ${merged.hotkeys!.c.delegate}`);
    
    assertEqual(merged.hotkeys!.c.description, 'Custom config hotkey',
      `Override description failed: expected "Custom config hotkey", got "${merged.hotkeys!.c.description}"`);
    
    // Check other defaults preserved
    assertEqual(merged.hotkeys!.p.delegate, 'list_processes',
      'Default hotkey "p" not preserved during override');
    
    assertEqual(merged.hotkeys!.s.delegate, 'list_sessions',
      'Default hotkey "s" not preserved during override');
  });

  runner.test('User can add new hotkeys alongside defaults', () => {
    const userConfig: CommandConfig = {
      hotkeys: {
        'x': {
          description: 'Custom hotkey X',
          delegate: 'get_config'
        },
        'z': {
          description: 'Custom hotkey Z', 
          delegate: 'list_directory'
        }
      }
    };
    
    const merged = mergeWithDefaults(userConfig);
    
    // Check new hotkeys added
    assertDefined(merged.hotkeys!.x, 'Custom hotkey "x" not added');
    assertEqual(merged.hotkeys!.x.delegate, 'get_config', 'Custom hotkey "x" has wrong delegate');
    
    assertDefined(merged.hotkeys!.z, 'Custom hotkey "z" not added');
    assertEqual(merged.hotkeys!.z.delegate, 'list_directory', 'Custom hotkey "z" has wrong delegate');
    
    // Check defaults still present
    assertDefined(merged.hotkeys!.c, 'Default hotkey "c" lost when adding custom hotkeys');
    assertEqual(merged.hotkeys!.c.delegate, 'get_config', 'Default hotkey "c" has wrong delegate');
  });

  runner.test('User commands are preserved with default hotkeys', () => {
    const userConfig: CommandConfig = {
      commands: {
        'my_deploy': {
          description: 'Deploy my app',
          template: 'npm run deploy --env={{env}}',
          parameters: {
            env: { type: 'string', required: true }
          }
        }
      }
    };
    
    const merged = mergeWithDefaults(userConfig);
    
    assertDefined(merged.commands!.my_deploy, 'User command not preserved in merge');
    assertEqual(merged.commands!.my_deploy.description, 'Deploy my app', 'User command description not preserved');
    
    // All default hotkeys should still be present
    const defaultKeys = Object.keys(DEFAULT_HOTKEYS);
    for (const key of defaultKeys) {
      assertDefined(merged.hotkeys![key], `Default hotkey "${key}" missing when user commands present`);
    }
  });

  runner.test('Handles undefined/null properties gracefully', () => {
    const userConfigs: CommandConfig[] = [
      { commands: undefined, hotkeys: undefined },
      { hotkeys: {} },
      { commands: {} }
    ];
    
    for (const config of userConfigs) {
      const merged = mergeWithDefaults(config);
      
      assertDefined(merged.hotkeys, 'Merged config missing hotkeys property');
      assertDefined(merged.commands, 'Merged config missing commands property');
      
      const hotkeyCount = Object.keys(merged.hotkeys!).length;
      const expectedCount = Object.keys(DEFAULT_HOTKEYS).length;
      
      assertEqual(hotkeyCount, expectedCount,
        `Expected ${expectedCount} hotkeys with empty config, got ${hotkeyCount}`);
    }
  });

  // === COMMAND REGISTRY INTEGRATION TESTS ===
  runner.test('CommandRegistry loads defaults correctly', () => {
    const registry = new CommandRegistry();
    const merged = mergeWithDefaults({});
    
    registry.loadFromConfig(merged);
    
    // Check all default hotkeys loaded
    for (const [key, expected] of Object.entries(DEFAULT_HOTKEYS)) {
      assertTrue(registry.hasHotkey(key), `Registry missing default hotkey: ${key}`);
      
      const entry = registry.getHotkey(key);
      assertDefined(entry, `Registry hotkey entry for "${key}" is undefined`);
      assertEqual(entry.command.delegate, expected.delegate,
        `Registry hotkey "${key}" has wrong delegate: expected ${expected.delegate}, got ${entry.command.delegate}`);
    }
  });

  runner.test('CommandRegistry handles user overrides in merged config', () => {
    const registry = new CommandRegistry();
    const userConfig: CommandConfig = {
      hotkeys: {
        'c': {
          description: 'Override config',
          delegate: 'list_sessions'
        },
        'q': {
          description: 'Custom hotkey',
          delegate: 'get_config'
        }
      }
    };
    
    const merged = mergeWithDefaults(userConfig);
    registry.loadFromConfig(merged);
    
    // Check override
    const overrideEntry = registry.getHotkey('c');
    assertDefined(overrideEntry, 'Registry override entry is undefined');
    assertEqual(overrideEntry.command.delegate, 'list_sessions', 'Registry did not apply user override correctly');
    
    // Check custom hotkey
    const customEntry = registry.getHotkey('q');
    assertDefined(customEntry, 'Registry custom entry is undefined');
    assertEqual(customEntry.command.delegate, 'get_config', 'Registry did not add custom hotkey correctly');
    
    // Check other defaults preserved
    const defaultEntry = registry.getHotkey('p');
    assertDefined(defaultEntry, 'Registry default entry is undefined');
    assertEqual(defaultEntry.command.delegate, 'list_processes', 'Registry did not preserve other defaults during override');
  });

  runner.test('Registry stats reflect merged configuration', () => {
    const registry = new CommandRegistry();
    const userConfig: CommandConfig = {
      commands: {
        'cmd1': { description: 'Command 1', template: 'echo 1' },
        'cmd2': { description: 'Command 2', template: 'echo 2' }
      },
      hotkeys: {
        'x': { description: 'Custom X', delegate: 'get_config' }
      }
    };
    
    const merged = mergeWithDefaults(userConfig);
    registry.loadFromConfig(merged);
    
    const stats = registry.getStats();
    
    // Should have 2 custom commands
    assertEqual(stats.commandCount, 2, `Expected 2 commands, got ${stats.commandCount}`);
    
    // Should have 6 default + 1 custom = 7 hotkeys  
    const expectedHotkeys = Object.keys(DEFAULT_HOTKEYS).length + 1;
    assertEqual(stats.hotkeyCount, expectedHotkeys, `Expected ${expectedHotkeys} hotkeys, got ${stats.hotkeyCount}`);
  });

  // Return test results
  const results = runner.getResults();
  
  // Log results for debugging
  console.log(`\n🧪 Default Hotkeys TypeScript Tests Complete:`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  if (results.failed > 0) {
    console.log('\nFailed tests:');
    results.results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  return results;
}