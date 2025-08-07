import React from 'react';

// Enhanced Color Palette and Design Tokens
export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  dns: {
    50: '#f0fdf9',
    100: '#ccfbef',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
  }
};

export const spacing = {
  xs: '0.5rem',    // 8px
  sm: '0.75rem',   // 12px
  md: '1rem',      // 16px
  lg: '1.25rem',   // 20px
  xl: '1.5rem',    // 24px
  '2xl': '2rem',   // 32px
  '3xl': '3rem',   // 48px
  '4xl': '4rem',   // 64px
  '5xl': '5rem',   // 80px
};

export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  md: '0.375rem',  // 6px
  lg: '0.5rem',    // 8px
  xl: '0.75rem',   // 12px
  '2xl': '1rem',   // 16px
  '3xl': '1.5rem', // 24px
  full: '9999px',
};

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
};

export const typography = {
  fontFamily: {
    sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    mono: ['JetBrains Mono', 'Monaco', 'Cascadia Code', 'Segoe UI Mono', 'monospace'],
  },
  fontSize: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

// Enhanced Button Component with Better States and Animations
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost' | 'outline' | 'dns';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = `
    relative inline-flex items-center justify-center font-medium 
    transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-offset-2 
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
    active:scale-[0.98] transform
    ${fullWidth ? 'w-full' : ''}
  `.replace(/\s+/g, ' ').trim();
  
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs rounded-md gap-1',
    sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
    md: 'px-4 py-2 text-sm rounded-lg gap-2',
    lg: 'px-6 py-3 text-base rounded-lg gap-2',
    xl: 'px-8 py-4 text-lg rounded-xl gap-3',
  };
  
  const variantClasses = {
    primary: `
      bg-gradient-to-r from-blue-600 to-blue-700 
      hover:from-blue-700 hover:to-blue-800 
      text-white focus:ring-blue-500 shadow-md 
      hover:shadow-lg active:shadow-sm
    `,
    secondary: `
      bg-gradient-to-r from-gray-600 to-gray-700 
      hover:from-gray-700 hover:to-gray-800 
      text-white focus:ring-gray-500 shadow-md 
      hover:shadow-lg active:shadow-sm
    `,
    success: `
      bg-gradient-to-r from-green-600 to-green-700 
      hover:from-green-700 hover:to-green-800 
      text-white focus:ring-green-500 shadow-md 
      hover:shadow-lg active:shadow-sm
    `,
    warning: `
      bg-gradient-to-r from-yellow-500 to-yellow-600 
      hover:from-yellow-600 hover:to-yellow-700 
      text-white focus:ring-yellow-500 shadow-md 
      hover:shadow-lg active:shadow-sm
    `,
    error: `
      bg-gradient-to-r from-red-600 to-red-700 
      hover:from-red-700 hover:to-red-800 
      text-white focus:ring-red-500 shadow-md 
      hover:shadow-lg active:shadow-sm
    `,
    dns: `
      bg-gradient-to-r from-emerald-600 to-emerald-700 
      hover:from-emerald-700 hover:to-emerald-800 
      text-white focus:ring-emerald-500 shadow-md 
      hover:shadow-lg active:shadow-sm
    `,
    outline: `
      border-2 border-gray-300 bg-white 
      hover:border-gray-400 hover:bg-gray-50 
      text-gray-700 focus:ring-gray-500 
      active:bg-gray-100
    `,
    ghost: `
      text-gray-600 hover:text-gray-900 
      hover:bg-gray-100 focus:ring-gray-500 
      active:bg-gray-200
    `,
  };

  const iconElement = icon && (
    <span className={`${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}>
      {icon}
    </span>
  );

  const loadingSpinner = (
    <div className={`absolute inset-0 flex items-center justify-center ${loading ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>
  );

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant].replace(/\s+/g, ' ').trim()} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loadingSpinner}
      <div className={`flex items-center ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}>
        {icon && iconPosition === 'left' && iconElement}
        <span>{children}</span>
        {icon && iconPosition === 'right' && iconElement}
      </div>
    </button>
  );
};

// Enhanced Badge Component with More Variants
interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'dns' | 'gradient';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  rounded?: boolean;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ 
  variant = 'primary', 
  size = 'sm', 
  rounded = true,
  children 
}) => {
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-sm',
  };
  
  const variantClasses = {
    primary: 'bg-blue-100 text-blue-800 border border-blue-200',
    secondary: 'bg-gray-100 text-gray-800 border border-gray-200',
    success: 'bg-green-100 text-green-800 border border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    error: 'bg-red-100 text-red-800 border border-red-200',
    info: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
    dns: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    gradient: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0',
  };

  const roundedClass = rounded ? 'rounded-full' : 'rounded-md';

  return (
    <span className={`
      inline-flex items-center font-semibold transition-all duration-200
      ${sizeClasses[size]} ${variantClasses[variant]} ${roundedClass}
    `.replace(/\s+/g, ' ').trim()}>
      {children}
    </span>
  );
};

// Enhanced Card Component with Better Visual Hierarchy
interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'elevated' | 'bordered' | 'glass';
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  padding = 'md',
  variant = 'default',
  hover = false,
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };

  const variantClasses = {
    default: 'bg-white border border-gray-200 shadow-sm',
    elevated: 'bg-white shadow-lg border border-gray-100',
    bordered: 'bg-white border-2 border-gray-300',
    glass: 'bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg',
  };

  const hoverClasses = hover ? 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200' : '';

  return (
    <div className={`
      rounded-xl ${paddingClasses[padding]} ${variantClasses[variant]} ${hoverClasses} ${className}
    `.replace(/\s+/g, ' ').trim()}>
      {children}
    </div>
  );
};

// Enhanced Input Component with Better States
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  variant?: 'default' | 'filled' | 'bordered';
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  helpText, 
  icon,
  iconPosition = 'left',
  variant = 'default',
  className = '', 
  ...props 
}) => {
  const variantClasses = {
    default: `
      block w-full border-gray-300 rounded-lg shadow-sm 
      focus:ring-2 focus:ring-blue-500 focus:border-blue-500
      transition-all duration-200 sm:text-sm
      ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
    `,
    filled: `
      block w-full bg-gray-50 border-transparent rounded-lg 
      focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500
      transition-all duration-200 sm:text-sm
      ${error ? 'bg-red-50 focus:ring-red-500 focus:border-red-500' : ''}
    `,
    bordered: `
      block w-full border-2 border-gray-300 rounded-lg 
      focus:ring-0 focus:border-blue-500
      transition-all duration-200 sm:text-sm
      ${error ? 'border-red-300 focus:border-red-500' : ''}
    `,
  };

  const inputContent = (
    <div className="relative">
      {icon && iconPosition === 'left' && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-400">{icon}</span>
        </div>
      )}
      <input
        className={`${variantClasses[variant].replace(/\s+/g, ' ').trim()} ${
          icon && iconPosition === 'left' ? 'pl-10' : ''
        } ${
          icon && iconPosition === 'right' ? 'pr-10' : ''
        } ${className}`}
        {...props}
      />
      {icon && iconPosition === 'right' && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-gray-400">{icon}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      {inputContent}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {helpText && !error && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
};

// Enhanced Select Component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ 
  label, 
  error, 
  helpText, 
  options,
  placeholder,
  className = '', 
  ...props 
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        className={`
          block w-full border-gray-300 rounded-lg shadow-sm 
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
          transition-all duration-200 sm:text-sm
          ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
          ${className}
        `.replace(/\s+/g, ' ').trim()}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {helpText && !error && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
};

// Enhanced Loading Spinner Component with More Options
interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'gray' | 'dns';
  variant?: 'spinner' | 'dots' | 'pulse';
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'primary',
  variant = 'spinner',
  text,
}) => {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };
  
  const colorClasses = {
    primary: 'border-blue-600 text-blue-600',
    secondary: 'border-gray-600 text-gray-600',
    success: 'border-green-600 text-green-600',
    warning: 'border-yellow-600 text-yellow-600',
    error: 'border-red-600 text-red-600',
    gray: 'border-gray-400 text-gray-400',
    dns: 'border-emerald-600 text-emerald-600',
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`${sizeClasses[size]} ${colorClasses[color]} bg-current rounded-full animate-pulse`}
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        );
      case 'pulse':
        return (
          <div className={`${sizeClasses[size]} ${colorClasses[color]} bg-current rounded-full animate-ping`} />
        );
      default:
        return (
          <div className={`animate-spin rounded-full border-b-2 ${sizeClasses[size]} ${colorClasses[color]}`} />
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      {renderSpinner()}
      {text && (
        <p className={`text-sm ${colorClasses[color]} font-medium`}>{text}</p>
      )}
    </div>
  );
};

// Enhanced Alert Component with Better Icons and Actions
interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ 
  variant = 'info', 
  title, 
  children, 
  onClose,
  action,
  icon,
}) => {
  const variantClasses = {
    info: 'bg-blue-50 border border-blue-200 text-blue-800',
    success: 'bg-green-50 border border-green-200 text-green-800',
    warning: 'bg-yellow-50 border border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border border-red-200 text-red-800',
  };

  const defaultIcons = {
    info: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    success: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
  };

  return (
    <div className={`rounded-lg p-4 ${variantClasses[variant]}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {icon || defaultIcons[variant]}
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1">{title}</h3>
          )}
          <div className={title ? 'text-sm' : 'text-sm'}>
            {children}
          </div>
          {action && (
            <div className="mt-3">
              {action}
            </div>
          )}
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              onClick={onClose}
              className="inline-flex rounded-md p-1.5 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Table Components with Better Styling
export const Table: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className="overflow-hidden shadow-sm border border-gray-200 rounded-xl">
    <div className="overflow-x-auto">
      <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
        {children}
      </table>
    </div>
  </div>
);

export const TableHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead className="bg-gray-50">{children}</thead>
);

export const TableBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>
);

export const TableRow: React.FC<{ children: React.ReactNode; className?: string; clickable?: boolean }> = ({ 
  children, 
  className = '',
  clickable = false,
}) => (
  <tr className={`
    ${clickable ? 'hover:bg-gray-50 cursor-pointer transition-colors duration-150' : 'hover:bg-gray-25'} 
    ${className}
  `.replace(/\s+/g, ' ').trim()}>
    {children}
  </tr>
);

export const TableHeader: React.FC<{ children: React.ReactNode; className?: string; sortable?: boolean }> = ({ 
  children, 
  className = '',
  sortable = false,
}) => (
  <th className={`
    px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider
    ${sortable ? 'cursor-pointer hover:text-gray-900 select-none' : ''}
    ${className}
  `.replace(/\s+/g, ' ').trim()}>
    <div className="flex items-center space-x-1">
      <span>{children}</span>
      {sortable && (
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )}
    </div>
  </th>
);

export const TableCell: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${className}`}>
    {children}
  </td>
);

// Enhanced Tab Components with Better Styling
interface TabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode; badge?: string | number }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
  variant?: 'default' | 'pills' | 'underline';
}

export const Tabs: React.FC<TabsProps> = ({ 
  tabs, 
  activeTab, 
  onTabChange, 
  children,
  variant = 'default',
}) => {
  const variantClasses = {
    default: {
      container: 'border-b border-gray-200',
      nav: 'flex space-x-8',
      tab: (isActive: boolean) => `
        py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 transition-all duration-200
        ${isActive
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }
      `,
    },
    pills: {
      container: 'bg-gray-100 p-1 rounded-lg',
      nav: 'flex space-x-1',
      tab: (isActive: boolean) => `
        py-2 px-4 rounded-md font-medium text-sm whitespace-nowrap flex items-center space-x-2 transition-all duration-200
        ${isActive
          ? 'bg-white text-blue-600 shadow-sm'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
        }
      `,
    },
    underline: {
      container: '',
      nav: 'flex space-x-8',
      tab: (isActive: boolean) => `
        py-2 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 transition-all duration-200
        ${isActive
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
        }
      `,
    },
  };

  const classes = variantClasses[variant];

  return (
    <div>
      <div className={classes.container}>
        <nav className={classes.nav}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={classes.tab(activeTab === tab.id).replace(/\s+/g, ' ').trim()}
            >
              {tab.icon && <span>{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge && (
                <Badge size="xs" variant="secondary">
                  {tab.badge}
                </Badge>
              )}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
};

// Enhanced Modal Component with Better Animations
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  size = 'md', 
  children,
  showCloseButton = true,
  closeOnOverlayClick = true,
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity duration-300 ease-out" 
          onClick={closeOnOverlayClick ? onClose : undefined}
        />
        
        <div className={`
          inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl 
          transform transition-all duration-300 ease-out sm:my-8 sm:align-middle 
          ${sizeClasses[size]} sm:w-full
        `.replace(/\s+/g, ' ').trim()}>
          {title && (
            <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg leading-6 font-semibold text-gray-900">{title}</h3>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
          <div className="bg-white px-6 py-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Toast Notification Component (for use with react-hot-toast)
interface ToastProps {
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const Toast: React.FC<ToastProps> = ({ title, message, type = 'info', action }) => {
  const typeClasses = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const icons = {
    success: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  };

  return (
    <div className={`max-w-sm w-full bg-white shadow-lg rounded-lg border ${typeClasses[type]} pointer-events-auto`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {icons[type]}
          </div>
          <div className="ml-3 w-0 flex-1">
            {title && (
              <p className="text-sm font-medium">{title}</p>
            )}
            <p className={`text-sm ${title ? 'mt-1' : ''}`}>{message}</p>
            {action && (
              <div className="mt-3">
                <button
                  onClick={action.onClick}
                  className="text-sm font-medium underline hover:no-underline"
                >
                  {action.label}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Progress Bar Component
interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'error';
  showValue?: boolean;
  label?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'primary',
  showValue = false,
  label,
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };
  
  const colorClasses = {
    primary: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showValue && <span className="text-sm text-gray-500">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
