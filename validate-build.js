#!/usr/bin/env node

/**
 * Simple validation script for STAC Explorer Vite build
 * Checks that key files and features are working
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🔍 Validating STAC Explorer Vite Build...\n');

const checks = [];

// Check 1: Key files exist
const keyFiles = [
  'dist/index.html',
  'dist/assets',
  'vite.config.js',
  'src/main.js',
];

keyFiles.forEach(file => {
  const exists = existsSync(resolve(file));
  checks.push({
    name: `File exists: ${file}`,
    status: exists ? 'PASS' : 'FAIL',
    passed: exists
  });
});

// Check 2: Build output contains expected chunks
try {
  const indexHtml = readFileSync('dist/index.html', 'utf-8');
  
  const hasMainJS = indexHtml.includes('main-') && indexHtml.includes('.js');
  const hasMainCSS = indexHtml.includes('main-') && indexHtml.includes('.css');
  
  checks.push({
    name: 'Build contains main JS chunk',
    status: hasMainJS ? 'PASS' : 'FAIL',
    passed: hasMainJS
  });
  
  checks.push({
    name: 'Build contains main CSS bundle',
    status: hasMainCSS ? 'PASS' : 'FAIL',
    passed: hasMainCSS
  });
  
} catch (error) {
  checks.push({
    name: 'Build output validation',
    status: 'FAIL',
    passed: false,
    error: error.message
  });
}

// Check 3: Vite config has required settings
try {
  const viteConfig = readFileSync('vite.config.js', 'utf-8');
  
  const hasCodeSplitting = viteConfig.includes('manualChunks');
  const hasAliases = viteConfig.includes('resolve');
  const hasProxy = viteConfig.includes('proxy');
  
  checks.push({
    name: 'Vite config has code splitting',
    status: hasCodeSplitting ? 'PASS' : 'FAIL',
    passed: hasCodeSplitting
  });
  
  checks.push({
    name: 'Vite config has path aliases',
    status: hasAliases ? 'PASS' : 'FAIL',
    passed: hasAliases
  });
  
  checks.push({
    name: 'Vite config has API proxy',
    status: hasProxy ? 'PASS' : 'FAIL',
    passed: hasProxy
  });
  
} catch (error) {
  checks.push({
    name: 'Vite config validation',
    status: 'FAIL',
    passed: false,
    error: error.message
  });
}

// Check 4: Main.js has correct imports
try {
  const mainJS = readFileSync('src/main.js', 'utf-8');
  
  const hasRelativeCSS = mainJS.includes('../css/');
  const hasRelativeJS = mainJS.includes('../js/app.js');
  const hasInitialization = mainJS.includes('initializeApp');
  
  checks.push({
    name: 'Main.js has correct CSS imports',
    status: hasRelativeCSS ? 'PASS' : 'FAIL',
    passed: hasRelativeCSS
  });
  
  checks.push({
    name: 'Main.js has correct JS imports',
    status: hasRelativeJS ? 'PASS' : 'FAIL',
    passed: hasRelativeJS
  });
  
  checks.push({
    name: 'Main.js has app initialization',
    status: hasInitialization ? 'PASS' : 'FAIL',
    passed: hasInitialization
  });
  
} catch (error) {
  checks.push({
    name: 'Main.js validation',
    status: 'FAIL',
    passed: false,
    error: error.message
  });
}

// Display results
console.log('📋 Validation Results:\n');

let passCount = 0;
let totalCount = checks.length;

checks.forEach((check, index) => {
  const icon = check.passed ? '✅' : '❌';
  console.log(`${icon} ${check.name}: ${check.status}`);
  
  if (check.error) {
    console.log(`   Error: ${check.error}`);
  }
  
  if (check.passed) passCount++;
});

console.log(`\n📊 Summary: ${passCount}/${totalCount} checks passed`);

if (passCount === totalCount) {
  console.log('🎉 All validations passed! Vite build is ready to use.');
  process.exit(0);
} else {
  console.log('⚠️  Some validations failed. Please review the issues above.');
  process.exit(1);
}