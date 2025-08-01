import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  prettierConfig,
  {
    files: ['js/**/*.js'],
    plugins: {
      prettier
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        
        // External libraries that might be loaded globally
        L: 'readonly',
        maplibregl: 'readonly',
        deck: 'readonly'
      }
    },
    rules: {
      // Prettier integration
      'prettier/prettier': 'error',
      
      // Code quality rules
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'warn',
      
      // ES6+ rules
      'prefer-const': 'error',
      'no-var': 'error',
      'prefer-arrow-callback': 'error',
      
      // Best practices
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      
      // Import/Export
      'no-duplicate-imports': 'error',
      
      // Async/await
      'require-await': 'error',
      'no-async-promise-executor': 'error'
    }
  },
  {
    files: ['vite.config.js', 'vite.config.*.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        Buffer: 'readonly',
        global: 'readonly'
      }
    }
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.vite/**',
      '*.min.js',
      'coverage/**',
      '.nyc_output/**',
      '*.d.ts',
      'workbox-*.js',
      'sw.js',
      'registerSW.js'
    ]
  }
];