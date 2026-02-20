import { describe, it, expect } from 'vitest';
import {
  toKebabCase,
  getItemName,
  sectionToSubType,
  convertToNewConvention,
  formatYamlValue,
} from '../../../../src/commands/upgrade/migrations/v20-helpers.js';

describe('toKebabCase', () => {
  it('converts simple string', () => {
    expect(toKebabCase('Hello World')).toBe('hello-world');
  });

  it('converts PascalCase', () => {
    expect(toKebabCase('HelloWorld')).toBe('helloworld');
  });

  it('handles hyphens', () => {
    expect(toKebabCase('already-kebab')).toBe('already-kebab');
  });

  it('strips special characters', () => {
    expect(toKebabCase('Hello! World?')).toBe('hello-world');
  });

  it('collapses multiple spaces', () => {
    expect(toKebabCase('hello   world')).toBe('hello-world');
  });

  it('collapses multiple hyphens', () => {
    expect(toKebabCase('hello---world')).toBe('hello-world');
  });

  it('strips leading/trailing hyphens', () => {
    expect(toKebabCase('-hello-world-')).toBe('hello-world');
  });

  it('handles empty string', () => {
    expect(toKebabCase('')).toBe('');
  });

  it('lowercases uppercase text', () => {
    expect(toKebabCase('UPPERCASE TEXT')).toBe('uppercase-text');
  });

  it('preserves numbers', () => {
    expect(toKebabCase('version 2.0')).toBe('version-20');
  });
});

describe('getItemName', () => {
  it('returns pattern when set', () => {
    expect(getItemName({ pattern: 'MVC Pattern' })).toBe('MVC Pattern');
  });

  it('returns convention when set', () => {
    expect(getItemName({ convention: 'Use async/await' })).toBe('Use async/await');
  });

  it('returns standard when set', () => {
    expect(getItemName({ standard: 'ESLint rules' })).toBe('ESLint rules');
  });

  it('returns rule when set', () => {
    expect(getItemName({ rule: 'No console.log' })).toBe('No console.log');
  });

  it('returns requirement when set', () => {
    expect(getItemName({ requirement: 'Must have tests' })).toBe('Must have tests');
  });

  it('returns guideline when set', () => {
    expect(getItemName({ guideline: 'Prefer immutability' })).toBe('Prefer immutability');
  });

  it('returns quirk when set', () => {
    expect(getItemName({ quirk: 'Legacy API format' })).toBe('Legacy API format');
  });

  it('returns null when no name field set', () => {
    expect(getItemName({ description: 'No name here' })).toBeNull();
  });

  it('returns null for empty item', () => {
    expect(getItemName({})).toBeNull();
  });

  it('prefers pattern over other fields', () => {
    expect(getItemName({ pattern: 'Pattern', convention: 'Convention' })).toBe('Pattern');
  });
});

describe('sectionToSubType', () => {
  it('maps architectural_patterns', () => {
    expect(sectionToSubType('architectural_patterns')).toBe('architectural-pattern');
  });

  it('maps code_conventions', () => {
    expect(sectionToSubType('code_conventions')).toBe('code-convention');
  });

  it('maps naming_conventions', () => {
    expect(sectionToSubType('naming_conventions')).toBe('naming-convention');
  });

  it('maps testing_standards', () => {
    expect(sectionToSubType('testing_standards')).toBe('testing-standard');
  });

  it('maps dependency_rules', () => {
    expect(sectionToSubType('dependency_rules')).toBe('dependency-rule');
  });

  it('maps security_requirements', () => {
    expect(sectionToSubType('security_requirements')).toBe('security-requirement');
  });

  it('maps performance_guidelines', () => {
    expect(sectionToSubType('performance_guidelines')).toBe('performance-guideline');
  });

  it('maps accessibility_standards', () => {
    expect(sectionToSubType('accessibility_standards')).toBe('accessibility-standard');
  });

  it('maps project_quirks', () => {
    expect(sectionToSubType('project_quirks')).toBe('project-quirk');
  });

  it('defaults to code-convention for unknown', () => {
    expect(sectionToSubType('unknown_section')).toBe('code-convention');
  });
});

describe('convertToNewConvention', () => {
  const today = '2024-01-15';

  it('converts basic item with pattern', () => {
    const result = convertToNewConvention(
      { pattern: 'MVC Pattern', description: 'Use MVC architecture' },
      'architectural_patterns',
      today
    );
    expect(result).not.toBeNull();
    expect(result!.id).toBe('mvc-pattern');
    expect(result!.name).toBe('MVC Pattern');
    expect(result!.type).toBe('convention');
    expect(result!.sub_type).toBe('architectural-pattern');
    expect(result!.description).toBe('Use MVC architecture');
    expect(result!.created).toBe(today);
    expect(result!.last_updated).toBe(today);
  });

  it('returns null when no name field', () => {
    expect(convertToNewConvention({ description: 'No name' }, 'code_conventions', today)).toBeNull();
  });

  it('defaults enforcement to recommended', () => {
    const result = convertToNewConvention(
      { pattern: 'Test' },
      'code_conventions',
      today
    );
    expect(result!.enforcement).toBe('recommended');
  });

  it('preserves enforcement when provided', () => {
    const result = convertToNewConvention(
      { pattern: 'Test', enforcement: 'strict' },
      'code_conventions',
      today
    );
    expect(result!.enforcement).toBe('strict');
  });

  it('converts examples array', () => {
    const result = convertToNewConvention(
      {
        pattern: 'Test',
        examples: [{ file: 'test.ts', snippet: 'code here' }],
      },
      'code_conventions',
      today
    );
    expect(result!.examples).toEqual([{ file: 'test.ts', snippet: 'code here' }]);
  });

  it('converts single example string', () => {
    const result = convertToNewConvention(
      { pattern: 'Test', example: 'some code' },
      'code_conventions',
      today
    );
    expect(result!.examples).toEqual([{ file: 'example', snippet: 'some code' }]);
  });

  it('converts violations array', () => {
    const result = convertToNewConvention(
      { pattern: 'Test', violations: ['Don\'t do this'] },
      'code_conventions',
      today
    );
    expect(result!.violations).toEqual(['Don\'t do this']);
  });

  it('converts violation_example to violations array', () => {
    const result = convertToNewConvention(
      { pattern: 'Test', violation_example: 'Bad code' },
      'code_conventions',
      today
    );
    expect(result!.violations).toEqual(['Bad code']);
  });

  it('preserves reference_files', () => {
    const result = convertToNewConvention(
      { pattern: 'Test', reference_files: ['src/main.ts'] },
      'code_conventions',
      today
    );
    expect(result!.reference_files).toEqual(['src/main.ts']);
  });

  it('preserves template', () => {
    const result = convertToNewConvention(
      { pattern: 'Test', template: 'some template' },
      'code_conventions',
      today
    );
    expect(result!.template).toBe('some template');
  });

  it('preserves migration_guide', () => {
    const result = convertToNewConvention(
      { pattern: 'Test', migration_guide: 'how to migrate' },
      'code_conventions',
      today
    );
    expect(result!.migration_guide).toBe('how to migrate');
  });

  it('generates default description when none provided', () => {
    const result = convertToNewConvention(
      { pattern: 'My Pattern' },
      'code_conventions',
      today
    );
    expect(result!.description).toBe('Convention: My Pattern');
  });
});

describe('formatYamlValue', () => {
  it('returns simple string as-is', () => {
    expect(formatYamlValue('hello')).toBe('hello');
  });

  it('wraps string with colon in quotes', () => {
    expect(formatYamlValue('key: value')).toBe('"key: value"');
  });

  it('wraps string with hash in quotes', () => {
    expect(formatYamlValue('has # comment')).toBe('"has # comment"');
  });

  it('wraps string with single quotes in double quotes', () => {
    expect(formatYamlValue("it's here")).toBe('"it\'s here"');
  });

  it('escapes double quotes inside value', () => {
    expect(formatYamlValue('say "hello"')).toBe('"say \\"hello\\""');
  });

  it('uses block scalar for multiline', () => {
    const result = formatYamlValue('line1\nline2');
    expect(result).toMatch(/^\|/);
    expect(result).toContain('line1');
    expect(result).toContain('line2');
  });

  it('applies indentation to multiline values', () => {
    const result = formatYamlValue('line1\nline2', 1);
    expect(result).toContain('    line1');
    expect(result).toContain('    line2');
  });
});
