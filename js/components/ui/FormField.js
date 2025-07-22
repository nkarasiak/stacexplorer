import { BaseUIComponent } from '../base/BaseUIComponent.js';

export class FormField extends BaseUIComponent {
    constructor(container, options = {}) {
        super(container, options);
    }

    getDefaultOptions() {
        return {
            type: 'text',
            label: '',
            placeholder: '',
            required: false,
            validation: [],
            debounceMs: 300,
            showValidationOnChange: true,
            helpText: '',
            autocomplete: 'off',
            maxLength: null,
            minLength: null,
            pattern: null,
            disabled: false,
            readonly: false
        };
    }

    getInitialState() {
        return {
            value: '',
            isValid: true,
            errors: [],
            isDirty: false,
            isFocused: false,
            isValidating: false
        };
    }

    init() {
        this.render();
        this.attachEventListeners();
        this.setupValidation();
    }

    render() {
        const fieldId = `field-${Math.random().toString(36).substr(2, 9)}`;
        const helpId = `${fieldId}-help`;
        const errorId = `${fieldId}-error`;

        this.container.innerHTML = `
            <div class="form-field" data-type="${this.options.type}">
                <div class="form-field__header">
                    <label for="${fieldId}" class="form-field__label">
                        ${this.options.label}
                        ${this.options.required ? '<span class="form-field__required" aria-label="required">*</span>' : ''}
                    </label>
                    ${this.options.helpText ? `
                        <button type="button" class="form-field__help-toggle" aria-describedby="${helpId}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                        </button>
                    ` : ''}
                </div>

                <div class="form-field__input-wrapper">
                    ${this.renderInput(fieldId)}
                    <div class="form-field__validation-indicator" aria-hidden="true">
                        <svg class="form-field__check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20,6 9,17 4,12"></polyline>
                        </svg>
                        <svg class="form-field__error-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        <div class="form-field__spinner" role="status" aria-label="Validating">
                            <div class="spinner"></div>
                        </div>
                    </div>
                </div>

                ${this.options.helpText ? `
                    <div id="${helpId}" class="form-field__help" aria-hidden="true">
                        ${this.options.helpText}
                    </div>
                ` : ''}

                <div id="${errorId}" class="form-field__errors" aria-live="polite" aria-atomic="true">
                </div>

                ${this.options.maxLength ? `
                    <div class="form-field__counter">
                        <span class="form-field__counter-current">0</span>/<span class="form-field__counter-max">${this.options.maxLength}</span>
                    </div>
                ` : ''}
            </div>
        `;

        this.input = this.container.querySelector('.form-field__input');
        this.errorContainer = this.container.querySelector('.form-field__errors');
        this.helpToggle = this.container.querySelector('.form-field__help-toggle');
        this.helpText = this.container.querySelector('.form-field__help');
        this.counter = this.container.querySelector('.form-field__counter-current');
    }

    renderInput(fieldId) {
        const commonAttrs = `
            id="${fieldId}"
            class="form-field__input"
            placeholder="${this.options.placeholder}"
            ${this.options.required ? 'required' : ''}
            ${this.options.disabled ? 'disabled' : ''}
            ${this.options.readonly ? 'readonly' : ''}
            ${this.options.maxLength ? `maxlength="${this.options.maxLength}"` : ''}
            ${this.options.minLength ? `minlength="${this.options.minLength}"` : ''}
            ${this.options.pattern ? `pattern="${this.options.pattern}"` : ''}
            autocomplete="${this.options.autocomplete}"
            aria-describedby="${fieldId}-error ${this.options.helpText ? fieldId + '-help' : ''}"
        `;

        switch (this.options.type) {
            case 'textarea':
                return `<textarea ${commonAttrs} rows="4"></textarea>`;
            case 'select':
                return `
                    <select ${commonAttrs}>
                        ${this.options.options?.map(opt => 
                            `<option value="${opt.value}" ${opt.selected ? 'selected' : ''}>${opt.label}</option>`
                        ).join('') || ''}
                    </select>
                `;
            case 'file':
                return `
                    <input type="file" ${commonAttrs}
                        ${this.options.accept ? `accept="${this.options.accept}"` : ''}
                        ${this.options.multiple ? 'multiple' : ''}
                    />
                `;
            default:
                return `<input type="${this.options.type}" ${commonAttrs} />`;
        }
    }

    attachEventListeners() {
        this.addEventListener(this.input, 'input', this.handleInput.bind(this));
        this.addEventListener(this.input, 'blur', this.handleBlur.bind(this));
        this.addEventListener(this.input, 'focus', this.handleFocus.bind(this));

        if (this.helpToggle) {
            this.addEventListener(this.helpToggle, 'click', this.toggleHelp.bind(this));
        }

        if (this.options.type === 'file') {
            this.addEventListener(this.input, 'change', this.handleFileChange.bind(this));
        }
    }

    setupValidation() {
        this.debounceTimeout = null;
        this.validationRules = new Map();

        this.addBuiltInValidationRules();
        this.options.validation.forEach(rule => this.addValidationRule(rule));
    }

    addBuiltInValidationRules() {
        if (this.options.required) {
            this.addValidationRule({
                name: 'required',
                validate: value => value.trim().length > 0,
                message: 'This field is required'
            });
        }

        if (this.options.minLength) {
            this.addValidationRule({
                name: 'minLength',
                validate: value => value.length >= this.options.minLength,
                message: `Minimum ${this.options.minLength} characters required`
            });
        }

        if (this.options.maxLength) {
            this.addValidationRule({
                name: 'maxLength',
                validate: value => value.length <= this.options.maxLength,
                message: `Maximum ${this.options.maxLength} characters allowed`
            });
        }

        if (this.options.pattern) {
            this.addValidationRule({
                name: 'pattern',
                validate: value => new RegExp(this.options.pattern).test(value),
                message: 'Please enter a valid format'
            });
        }

        if (this.options.type === 'email') {
            this.addValidationRule({
                name: 'email',
                validate: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
                message: 'Please enter a valid email address'
            });
        }

        if (this.options.type === 'url') {
            this.addValidationRule({
                name: 'url',
                validate: value => {
                    try {
                        new URL(value);
                        return true;
                    } catch {
                        return false;
                    }
                },
                message: 'Please enter a valid URL'
            });
        }
    }

    addValidationRule(rule) {
        this.validationRules.set(rule.name, rule);
    }

    removeValidationRule(name) {
        this.validationRules.delete(name);
    }

    async handleInput(event) {
        const value = event.target.value;
        this.updateState({ value, isDirty: true });

        if (this.counter) {
            this.counter.textContent = value.length;
        }

        if (this.options.showValidationOnChange && this.state.isDirty) {
            this.debounceValidation();
        }

        this.emit('input', { value, field: this });
    }

    handleFocus(event) {
        this.updateState({ isFocused: true });
        this.container.querySelector('.form-field').classList.add('form-field--focused');
        this.emit('focus', { field: this });
    }

    handleBlur(event) {
        this.updateState({ isFocused: false });
        this.container.querySelector('.form-field').classList.remove('form-field--focused');
        
        if (this.state.isDirty) {
            this.validate();
        }
        
        this.emit('blur', { field: this });
    }

    handleFileChange(event) {
        const files = Array.from(event.target.files);
        this.emit('fileChange', { files, field: this });
    }

    toggleHelp() {
        const isVisible = this.helpText.getAttribute('aria-hidden') === 'false';
        this.helpText.setAttribute('aria-hidden', isVisible ? 'true' : 'false');
        this.helpToggle.setAttribute('aria-expanded', isVisible ? 'false' : 'true');
    }

    debounceValidation() {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => {
            this.validate();
        }, this.options.debounceMs);
    }

    async validate() {
        if (this.state.isValidating) return;

        this.updateState({ isValidating: true });
        this.setValidationState('validating');

        const errors = [];
        const value = this.state.value;

        for (const [name, rule] of this.validationRules) {
            try {
                const isValid = typeof rule.validate === 'function' 
                    ? await rule.validate(value, this)
                    : rule.validate;

                if (!isValid) {
                    errors.push({
                        name,
                        message: typeof rule.message === 'function' 
                            ? rule.message(value, this)
                            : rule.message
                    });
                }
            } catch (error) {
                errors.push({
                    name,
                    message: 'Validation error occurred'
                });
            }
        }

        const isValid = errors.length === 0;
        this.updateState({ 
            isValid, 
            errors, 
            isValidating: false 
        });

        this.setValidationState(isValid ? 'valid' : 'invalid');
        this.displayErrors();

        this.emit('validation', { 
            isValid, 
            errors, 
            value,
            field: this 
        });

        return isValid;
    }

    setValidationState(state) {
        const field = this.container.querySelector('.form-field');
        field.classList.remove('form-field--valid', 'form-field--invalid', 'form-field--validating');
        
        if (state !== 'neutral') {
            field.classList.add(`form-field--${state}`);
        }
    }

    displayErrors() {
        if (this.state.errors.length === 0) {
            this.errorContainer.innerHTML = '';
            this.input.removeAttribute('aria-invalid');
            return;
        }

        this.input.setAttribute('aria-invalid', 'true');
        this.errorContainer.innerHTML = this.state.errors
            .map(error => `<div class="form-field__error">${error.message}</div>`)
            .join('');
    }

    setValue(value) {
        this.input.value = value;
        this.updateState({ value, isDirty: true });
        
        if (this.counter) {
            this.counter.textContent = value.length;
        }
    }

    getValue() {
        return this.state.value;
    }

    reset() {
        this.input.value = '';
        this.updateState({
            value: '',
            isValid: true,
            errors: [],
            isDirty: false,
            isFocused: false,
            isValidating: false
        });
        this.setValidationState('neutral');
        this.displayErrors();
        
        if (this.counter) {
            this.counter.textContent = '0';
        }
    }

    setDisabled(disabled) {
        this.input.disabled = disabled;
        this.container.querySelector('.form-field').classList.toggle('form-field--disabled', disabled);
    }

    focus() {
        this.input.focus();
    }

    destroy() {
        clearTimeout(this.debounceTimeout);
        super.destroy();
    }
}

export class FormFieldGroup extends BaseUIComponent {
    constructor(container, options = {}) {
        super(container, options);
    }

    getDefaultOptions() {
        return {
            fields: [],
            validateOnSubmit: true,
            showGroupErrors: true
        };
    }

    getInitialState() {
        return {
            fields: new Map(),
            isValid: true,
            errors: []
        };
    }

    init() {
        this.render();
        this.initializeFields();
    }

    render() {
        this.container.innerHTML = `
            <div class="form-field-group">
                <div class="form-field-group__fields"></div>
                ${this.options.showGroupErrors ? `
                    <div class="form-field-group__errors" aria-live="polite"></div>
                ` : ''}
            </div>
        `;

        this.fieldsContainer = this.container.querySelector('.form-field-group__fields');
        this.errorsContainer = this.container.querySelector('.form-field-group__errors');
    }

    initializeFields() {
        this.options.fields.forEach(fieldConfig => {
            this.addField(fieldConfig);
        });
    }

    addField(fieldConfig) {
        const fieldContainer = document.createElement('div');
        this.fieldsContainer.appendChild(fieldContainer);

        const field = new FormField(fieldContainer, fieldConfig);
        this.state.fields.set(fieldConfig.name, field);

        field.on('validation', () => {
            this.validateGroup();
        });

        return field;
    }

    getField(name) {
        return this.state.fields.get(name);
    }

    async validateGroup() {
        const results = await Promise.all(
            Array.from(this.state.fields.values()).map(field => field.validate())
        );

        const isValid = results.every(result => result);
        const errors = [];

        this.state.fields.forEach((field, name) => {
            if (!field.state.isValid) {
                errors.push({
                    field: name,
                    errors: field.state.errors
                });
            }
        });

        this.updateState({ isValid, errors });

        if (this.errorsContainer && errors.length > 0) {
            this.errorsContainer.innerHTML = `
                <div class="form-field-group__error">
                    Please correct the errors above
                </div>
            `;
        } else if (this.errorsContainer) {
            this.errorsContainer.innerHTML = '';
        }

        this.emit('groupValidation', { isValid, errors, group: this });
        return isValid;
    }

    getValues() {
        const values = {};
        this.state.fields.forEach((field, name) => {
            values[name] = field.getValue();
        });
        return values;
    }

    setValues(values) {
        Object.entries(values).forEach(([name, value]) => {
            const field = this.getField(name);
            if (field) {
                field.setValue(value);
            }
        });
    }

    reset() {
        this.state.fields.forEach(field => field.reset());
        this.updateState({ isValid: true, errors: [] });
        if (this.errorsContainer) {
            this.errorsContainer.innerHTML = '';
        }
    }
}