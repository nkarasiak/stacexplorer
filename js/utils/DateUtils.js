/**
 * DateUtils.js - Comprehensive date utility functions for STAC Explorer
 * Provides advanced date calculations, formatting, and range management
 * 
 * @author STAC Explorer Team
 * @version 2.0.0
 */

export class DateUtils {
    /**
     * Date preset configurations with calculation functions
     */
    static DATE_PRESETS = {
        'anytime': {
            label: 'ANYTIME',
            description: 'No date restriction',
            icon: 'all_inclusive',
            category: 'any',
            calculate: () => ({ start: null, end: null })
        },
        'today': {
            label: 'Today',
            description: 'Today only',
            icon: 'today',
            category: 'recent',
            calculate: () => {
                const today = new Date();
                return {
                    start: DateUtils.formatDate(today),
                    end: DateUtils.formatDate(today)
                };
            }
        },
        'yesterday': {
            label: 'Yesterday',
            description: 'Yesterday only',
            icon: 'history',
            category: 'recent',
            calculate: () => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                return {
                    start: DateUtils.formatDate(yesterday),
                    end: DateUtils.formatDate(yesterday)
                };
            }
        },
        'last3days': {
            label: 'Last 3 days',
            description: 'Past 3 days including today',
            icon: 'view_day',
            category: 'recent',
            calculate: () => {
                const today = new Date();
                const threeDaysAgo = new Date();
                threeDaysAgo.setDate(today.getDate() - 2);
                return {
                    start: DateUtils.formatDate(threeDaysAgo),
                    end: DateUtils.formatDate(today)
                };
            }
        },
        'last7days': {
            label: 'Last 7 days',
            description: 'Past week including today',
            icon: 'view_week',
            category: 'recent',
            calculate: () => {
                const today = new Date();
                const weekAgo = new Date();
                weekAgo.setDate(today.getDate() - 6);
                return {
                    start: DateUtils.formatDate(weekAgo),
                    end: DateUtils.formatDate(today)
                };
            }
        },
        'thisweek': {
            label: 'This week',
            description: 'Monday to Sunday (current week)',
            icon: 'date_range',
            category: 'periods',
            calculate: () => {
                const today = new Date();
                const startOfWeek = DateUtils.getStartOfWeek(today);
                const endOfWeek = DateUtils.getEndOfWeek(today);
                return {
                    start: DateUtils.formatDate(startOfWeek),
                    end: DateUtils.formatDate(endOfWeek)
                };
            }
        },
        'lastweek': {
            label: 'Last week',
            description: 'Previous Monday to Sunday',
            icon: 'skip_previous',
            category: 'periods',
            calculate: () => {
                const today = new Date();
                const lastWeek = new Date(today);
                lastWeek.setDate(today.getDate() - 7);
                const startOfLastWeek = DateUtils.getStartOfWeek(lastWeek);
                const endOfLastWeek = DateUtils.getEndOfWeek(lastWeek);
                return {
                    start: DateUtils.formatDate(startOfLastWeek),
                    end: DateUtils.formatDate(endOfLastWeek)
                };
            }
        },
        'last30days': {
            label: 'Last 30 days',
            description: 'Past month including today',
            icon: 'calendar_month',
            category: 'extended',
            calculate: () => {
                const today = new Date();
                const monthAgo = new Date();
                monthAgo.setDate(today.getDate() - 29);
                return {
                    start: DateUtils.formatDate(monthAgo),
                    end: DateUtils.formatDate(today)
                };
            }
        },
        'thismonth': {
            label: 'This month',
            description: 'First to last day of current month',
            icon: 'calendar_today',
            category: 'periods',
            calculate: () => {
                const today = new Date();
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                return {
                    start: DateUtils.formatDate(startOfMonth),
                    end: DateUtils.formatDate(endOfMonth)
                };
            }
        },
        'lastmonth': {
            label: 'Last month',
            description: 'Previous month (first to last day)',
            icon: 'skip_previous',
            category: 'periods',
            calculate: () => {
                const today = new Date();
                const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                return {
                    start: DateUtils.formatDate(startOfLastMonth),
                    end: DateUtils.formatDate(endOfLastMonth)
                };
            }
        },
        'last90days': {
            label: 'Last 3 months',
            description: 'Past 3 months including today',
            icon: 'calendar_view_month',
            category: 'extended',
            calculate: () => {
                const today = new Date();
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setDate(today.getDate() - 89);
                return {
                    start: DateUtils.formatDate(threeMonthsAgo),
                    end: DateUtils.formatDate(today)
                };
            }
        },
        'last6months': {
            label: 'Last 6 months',
            description: 'Past 6 months including today',
            icon: 'view_timeline',
            category: 'extended',
            calculate: () => {
                const today = new Date();
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(today.getMonth() - 6);
                return {
                    start: DateUtils.formatDate(sixMonthsAgo),
                    end: DateUtils.formatDate(today)
                };
            }
        },
        'thisyear': {
            label: 'This year',
            description: 'January 1st to December 31st (current year)',
            icon: 'calendar_view_year',
            category: 'periods',
            calculate: () => {
                const today = new Date();
                const startOfYear = new Date(today.getFullYear(), 0, 1);
                const endOfYear = new Date(today.getFullYear(), 11, 31);
                return {
                    start: DateUtils.formatDate(startOfYear),
                    end: DateUtils.formatDate(endOfYear)
                };
            }
        },
        'lastyear': {
            label: 'Last year',
            description: 'Previous year (January to December)',
            icon: 'skip_previous',
            category: 'extended',
            calculate: () => {
                const today = new Date();
                const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
                const endOfLastYear = new Date(today.getFullYear() - 1, 11, 31);
                return {
                    start: DateUtils.formatDate(startOfLastYear),
                    end: DateUtils.formatDate(endOfLastYear)
                };
            }
        },
        'custom': {
            label: 'Custom range',
            description: 'Select your own date range',
            icon: 'date_range',
            category: 'custom',
            calculate: (start, end) => ({ start, end })
        }
    };

    /**
     * Format a Date object as YYYY-MM-DD string
     * 
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    static formatDate(date) {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            return '';
        }
        return date.toISOString().split('T')[0];
    }

    /**
     * Parse a date string (YYYY-MM-DD) to Date object
     * 
     * @param {string} dateString - Date string to parse
     * @returns {Date|null} Parsed date or null if invalid
     */
    static parseDate(dateString) {
        if (!dateString || typeof dateString !== 'string') {
            return null;
        }
        
        const date = new Date(dateString + 'T00:00:00.000Z');
        return isNaN(date.getTime()) ? null : date;
    }

    /**
     * Get the start of week (Monday) for a given date
     * 
     * @param {Date} date - Input date
     * @returns {Date} Start of week date
     */
    static getStartOfWeek(date) {
        const startOfWeek = new Date(date);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        startOfWeek.setDate(diff);
        return startOfWeek;
    }

    /**
     * Get the end of week (Sunday) for a given date
     * 
     * @param {Date} date - Input date
     * @returns {Date} End of week date
     */
    static getEndOfWeek(date) {
        const endOfWeek = new Date(date);
        const day = endOfWeek.getDay();
        const diff = endOfWeek.getDate() + (day === 0 ? 0 : 7 - day);
        endOfWeek.setDate(diff);
        return endOfWeek;
    }

    /**
     * Calculate date range for a preset type
     * 
     * @param {string} presetType - Type of preset to calculate
     * @param {string} customStart - Custom start date (for custom preset)
     * @param {string} customEnd - Custom end date (for custom preset)
     * @returns {Object} Object with start and end date strings
     */
    static calculateDateRange(presetType, customStart = null, customEnd = null) {
        const preset = DateUtils.DATE_PRESETS[presetType];
        
        if (!preset) {
            console.warn(`Unknown date preset: ${presetType}`);
            return { start: null, end: null };
        }

        if (presetType === 'custom') {
            return preset.calculate(customStart, customEnd);
        }

        return preset.calculate();
    }

    /**
     * Get display text for a date selection
     * 
     * @param {Object} dateSelection - Date selection object with type, start, end
     * @returns {string} Human-readable display text
     */
    static getDateDisplayText(dateSelection) {
        if (!dateSelection || !dateSelection.type) {
            return 'ANYTIME';
        }

        const preset = DateUtils.DATE_PRESETS[dateSelection.type];
        
        if (!preset) {
            return 'ANYTIME';
        }

        if (dateSelection.type === 'custom' && dateSelection.start && dateSelection.end) {
            const startDate = DateUtils.parseDate(dateSelection.start);
            const endDate = DateUtils.parseDate(dateSelection.end);
            
            if (startDate && endDate) {
                const startFormatted = DateUtils.formatDisplayDate(startDate);
                const endFormatted = DateUtils.formatDisplayDate(endDate);
                
                if (DateUtils.formatDate(startDate) === DateUtils.formatDate(endDate)) {
                    return startFormatted;
                } else {
                    return `${startFormatted} to ${endFormatted}`;
                }
            }
        }

        return preset.label;
    }

    /**
     * Format date for display (more readable format)
     * 
     * @param {Date} date - Date to format
     * @returns {string} Formatted date for display
     */
    static formatDisplayDate(date) {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            return '';
        }

        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        };
        
        return date.toLocaleDateString('en-US', options);
    }

    /**
     * Get relative description for a date range
     * 
     * @param {string} startDate - Start date string (YYYY-MM-DD)
     * @param {string} endDate - End date string (YYYY-MM-DD)
     * @returns {string} Relative description
     */
    static getRelativeDateDescription(startDate, endDate) {
        if (!startDate || !endDate) {
            return 'Any time';
        }

        const start = DateUtils.parseDate(startDate);
        const end = DateUtils.parseDate(endDate);
        const today = new Date();

        if (!start || !end) {
            return 'Custom range';
        }

        // Calculate differences
        const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const daysFromToday = Math.floor((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));

        // Check if it's today
        if (DateUtils.formatDate(start) === DateUtils.formatDate(today) && 
            DateUtils.formatDate(end) === DateUtils.formatDate(today)) {
            return 'Today';
        }

        // Check if it ends today
        if (DateUtils.formatDate(end) === DateUtils.formatDate(today)) {
            if (daysDiff === 1) {
                return 'Today';
            } else if (daysDiff === 7) {
                return 'Last 7 days';
            } else if (daysDiff === 30) {
                return 'Last 30 days';
            } else {
                return `Last ${daysDiff} days`;
            }
        }

        // Historical ranges
        if (daysFromToday > 0) {
            return `${daysDiff} day${daysDiff > 1 ? 's' : ''}, ${daysFromToday} day${daysFromToday > 1 ? 's' : ''} ago`;
        }

        return `${daysDiff} day${daysDiff > 1 ? 's' : ''}`;
    }

    /**
     * Validate a date range
     * 
     * @param {string} startDate - Start date string
     * @param {string} endDate - End date string
     * @returns {Object} Validation result with isValid and message
     */
    static validateDateRange(startDate, endDate) {
        if (!startDate || !endDate) {
            return {
                isValid: false,
                message: 'Both start and end dates are required'
            };
        }

        const start = DateUtils.parseDate(startDate);
        const end = DateUtils.parseDate(endDate);

        if (!start) {
            return {
                isValid: false,
                message: 'Invalid start date format'
            };
        }

        if (!end) {
            return {
                isValid: false,
                message: 'Invalid end date format'
            };
        }

        if (start.getTime() > end.getTime()) {
            return {
                isValid: false,
                message: 'Start date cannot be after end date'
            };
        }

        const today = new Date();
        const maxFutureDate = new Date();
        maxFutureDate.setFullYear(today.getFullYear() + 1);

        if (end.getTime() > maxFutureDate.getTime()) {
            return {
                isValid: false,
                message: 'End date cannot be more than 1 year in the future'
            };
        }

        const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const maxDaysRange = 365 * 2; // 2 years max range

        if (daysDiff > maxDaysRange) {
            return {
                isValid: false,
                message: `Date range cannot exceed ${maxDaysRange} days`
            };
        }

        return {
            isValid: true,
            message: 'Valid date range'
        };
    }

    /**
     * Get suggested date presets based on context or usage patterns
     * 
     * @param {string} context - Context hint (e.g., 'satellite', 'weather', etc.)
     * @returns {Array} Array of suggested preset keys
     */
    static getSuggestedPresets(context = 'general') {
        const suggestions = {
            'general': ['today', 'last7days', 'last30days', 'thismonth'],
            'satellite': ['last7days', 'last30days', 'last90days', 'thismonth'],
            'weather': ['today', 'yesterday', 'last7days', 'thisweek'],
            'research': ['thismonth', 'lastmonth', 'last90days', 'thisyear']
        };

        return suggestions[context] || suggestions['general'];
    }

    /**
     * Get preset categories for UI organization
     * 
     * @returns {Object} Object mapping categories to preset arrays
     */
    static getPresetCategories() {
        const categories = {
            'any': [],
            'recent': [],
            'periods': [],
            'extended': [],
            'custom': []
        };

        Object.entries(DateUtils.DATE_PRESETS).forEach(([key, preset]) => {
            if (categories[preset.category]) {
                categories[preset.category].push(key);
            }
        });

        return categories;
    }

    /**
     * Parse natural language date input
     * 
     * @param {string} input - Natural language date input
     * @returns {Object|null} Parsed date selection or null if not recognized
     */
    static parseNaturalLanguageDate(input) {
        if (!input || typeof input !== 'string') {
            return null;
        }

        const normalizedInput = input.toLowerCase().trim();

        // Direct preset matches
        for (const [key, preset] of Object.entries(DateUtils.DATE_PRESETS)) {
            if (normalizedInput === preset.label.toLowerCase() ||
                normalizedInput.includes(preset.label.toLowerCase())) {
                const range = DateUtils.calculateDateRange(key);
                return {
                    type: key,
                    start: range.start,
                    end: range.end
                };
            }
        }

        // Pattern matching for common phrases
        const patterns = [
            { pattern: /anytime|any time|all time/i, preset: 'anytime' },
            { pattern: /today/i, preset: 'today' },
            { pattern: /yesterday/i, preset: 'yesterday' },
            { pattern: /this week/i, preset: 'thisweek' },
            { pattern: /last week/i, preset: 'lastweek' },
            { pattern: /this month/i, preset: 'thismonth' },
            { pattern: /last month/i, preset: 'lastmonth' },
            { pattern: /this year/i, preset: 'thisyear' },
            { pattern: /last year/i, preset: 'lastyear' },
            { pattern: /last (\d+) days?/i, handler: (match) => {
                const days = parseInt(match[1]);
                if (days === 7) return 'last7days';
                if (days === 30) return 'last30days';
                if (days === 90) return 'last90days';
                return null;
            }},
            { pattern: /(\d+) days? ago/i, handler: (match) => {
                const days = parseInt(match[1]);
                const today = new Date();
                const targetDate = new Date();
                targetDate.setDate(today.getDate() - days);
                return {
                    type: 'custom',
                    start: DateUtils.formatDate(targetDate),
                    end: DateUtils.formatDate(today)
                };
            }}
        ];

        for (const { pattern, preset, handler } of patterns) {
            const match = normalizedInput.match(pattern);
            if (match) {
                if (handler) {
                    const result = handler(match);
                    if (typeof result === 'string') {
                        const range = DateUtils.calculateDateRange(result);
                        return { type: result, start: range.start, end: range.end };
                    } else if (result && typeof result === 'object') {
                        return result;
                    }
                } else if (preset) {
                    const range = DateUtils.calculateDateRange(preset);
                    return { type: preset, start: range.start, end: range.end };
                }
            }
        }

        return null;
    }
}

export default DateUtils;
