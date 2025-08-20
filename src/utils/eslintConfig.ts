/**
 * ESLint Configuration and Auto-fix Utilities
 * Helps maintain code quality and consistency
 */

// Common ESLint rule configurations for the project
export const eslintRules = {
  // React/React Native specific rules
  'react/prop-types': 'off', // We use TypeScript for prop validation
  'react-native/no-unused-styles': 'warn',
  'react-native/no-inline-styles': 'warn',
  'react-native/no-color-literals': 'warn',
  
  // TypeScript rules
  '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/prefer-optional-chain': 'warn',
  '@typescript-eslint/prefer-nullish-coalescing': 'warn',
  
  // General code quality
  'prefer-const': 'warn',
  'no-var': 'error',
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  'no-debugger': 'error',
  'no-alert': 'warn',
  
  // Import/export rules
  'import/order': [
    'warn',
    {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index',
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
    },
  ],
  'import/no-unused-modules': 'warn',
  'import/no-duplicates': 'error',
};

// Auto-fixable patterns
export const autoFixPatterns = {
  // Convert old color usage to new theme
  oldColorPatterns: [
    {
      pattern: /COLORS\.primary\.default/g,
      replacement: 'theme.colors.primary[500]',
    },
    {
      pattern: /COLORS\.success/g,
      replacement: 'theme.colors.success[500]',
    },
    {
      pattern: /COLORS\.error/g,
      replacement: 'theme.colors.error[500]',
    },
    {
      pattern: /COLORS\.warning/g,
      replacement: 'theme.colors.warning[500]',
    },
    {
      pattern: /COLORS\.text\.primary/g,
      replacement: 'theme.colors.neutral[900]',
    },
    {
      pattern: /COLORS\.text\.secondary/g,
      replacement: 'theme.colors.neutral[600]',
    },
    {
      pattern: /COLORS\.background/g,
      replacement: 'theme.colors.neutral[50]',
    },
  ],
  
  // Convert spacing patterns
  spacingPatterns: [
    {
      pattern: /SPACING\.xs/g,
      replacement: 'theme.spacing[1]',
    },
    {
      pattern: /SPACING\.sm/g,
      replacement: 'theme.spacing[2]',
    },
    {
      pattern: /SPACING\.md/g,
      replacement: 'theme.spacing[4]',
    },
    {
      pattern: /SPACING\.lg/g,
      replacement: 'theme.spacing[6]',
    },
    {
      pattern: /SPACING\.xl/g,
      replacement: 'theme.spacing[8]',
    },
  ],
  
  // Convert font patterns
  fontPatterns: [
    {
      pattern: /FONTS\.regular/g,
      replacement: 'theme.typography.fontWeight.normal',
    },
    {
      pattern: /FONTS\.medium/g,
      replacement: 'theme.typography.fontWeight.medium',
    },
    {
      pattern: /FONTS\.bold/g,
      replacement: 'theme.typography.fontWeight.bold',
    },
  ],
};

// Common style improvements
export const styleImprovements = {
  // Convert inline styles to StyleSheet
  extractInlineStyles: (code: string): string => {
    // This would be a more complex implementation
    // For now, just flag inline styles
    const inlineStylePattern = /style=\{\{[^}]+\}\}/g;
    if (inlineStylePattern.test(code)) {
      console.warn('⚠️ Inline styles detected. Consider moving to StyleSheet.');
    }
    return code;
  },
  
  // Suggest component extraction
  suggestComponentExtraction: (code: string): string[] => {
    const suggestions: string[] = [];
    
    // Check for repeated JSX patterns
    const functionComponentPattern = /const\s+\w+.*?=.*?\(.*?\)\s*=>\s*\{/g;
    const matches = code.match(functionComponentPattern);
    
    if (matches && matches.length > 100) {
      suggestions.push('Consider breaking down large components into smaller ones');
    }
    
    return suggestions;
  },
};

// Performance optimization suggestions
export const performanceChecks = {
  // Check for unnecessary re-renders
  checkMemoization: (code: string): string[] => {
    const suggestions: string[] = [];
    
    // Check for missing useCallback on event handlers
    const eventHandlerPattern = /on\w+\s*=\s*\{.*?\}/g;
    const useCallbackPattern = /useCallback/g;
    
    const eventHandlers = code.match(eventHandlerPattern);
    const useCallbacks = code.match(useCallbackPattern);
    
    if (eventHandlers && eventHandlers.length > 3 && (!useCallbacks || useCallbacks.length === 0)) {
      suggestions.push('Consider using useCallback for event handlers to optimize performance');
    }
    
    return suggestions;
  },
  
  // Check for heavy computations in render
  checkHeavyComputations: (code: string): string[] => {
    const suggestions: string[] = [];
    
    // Look for complex operations that should be memoized
    const heavyOperations = [
      /\.map\(.*?\.filter\(/g,
      /\.reduce\(.*?\.map\(/g,
      /\.sort\(.*?\.filter\(/g,
    ];
    
    heavyOperations.forEach((pattern) => {
      if (pattern.test(code)) {
        suggestions.push('Consider using useMemo for heavy computations');
      }
    });
    
    return suggestions;
  },
};

// Export utility function to apply all fixes
export const applyAutoFixes = (code: string): string => {
  let fixedCode = code;
  
  // Apply color pattern fixes
  autoFixPatterns.oldColorPatterns.forEach(({ pattern, replacement }) => {
    fixedCode = fixedCode.replace(pattern, replacement);
  });
  
  // Apply spacing pattern fixes
  autoFixPatterns.spacingPatterns.forEach(({ pattern, replacement }) => {
    fixedCode = fixedCode.replace(pattern, replacement);
  });
  
  // Apply font pattern fixes
  autoFixPatterns.fontPatterns.forEach(({ pattern, replacement }) => {
    fixedCode = fixedCode.replace(pattern, replacement);
  });
  
  return fixedCode;
};

// Validate component structure
export const validateComponent = (code: string): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} => {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Check for proper imports
  if (!code.includes('import React')) {
    issues.push('Missing React import');
  }
  
  // Check for proper export
  if (!code.includes('export default')) {
    issues.push('Missing default export');
  }
  
  // Check for TypeScript interfaces
  if (code.includes('Props') && !code.includes('interface')) {
    suggestions.push('Consider defining a TypeScript interface for props');
  }
  
  // Add performance and style suggestions
  suggestions.push(...performanceChecks.checkMemoization(code));
  suggestions.push(...performanceChecks.checkHeavyComputations(code));
  suggestions.push(...styleImprovements.suggestComponentExtraction(code));
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
  };
};