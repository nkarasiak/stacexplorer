import js from '@eslint/js';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: {
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                fetch: 'readonly',
                URL: 'readonly',
                AbortController: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                alert: 'readonly',
                maplibregl: 'readonly'
            }
        },
        rules: {
            // Modern JavaScript best practices
            'prefer-const': 'error',
            'no-var': 'error',
            'prefer-arrow-functions': 'off',
            'arrow-spacing': 'error',
            'template-curly-spacing': ['error', 'never'],
            
            // Import/Export
            'no-duplicate-imports': 'error',
            
            // Error handling
            'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
            'no-console': 'off', // Allow console for debugging
            
            // Code quality
            'eqeqeq': ['error', 'always'],
            'curly': ['error', 'all'],
            'no-magic-numbers': ['warn', { 'ignore': [0, 1, -1, 100] }],
            
            // Async/await
            'require-await': 'error',
            'no-return-await': 'error',
            
            // Best practices
            'default-case': 'error',
            'no-fallthrough': 'error',
            'prefer-template': 'error'
        }
    }
];
