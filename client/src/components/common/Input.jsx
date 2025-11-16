export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-tv-textSecondary mb-2">
          {label}
          {required && <span className="text-tv-error ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5 rounded-lg font-medium
          bg-tv-bgSoft text-tv-text placeholder:text-tv-textMuted
          border-2 ${error ? 'border-tv-error' : 'border-tv-borderSubtle'}
          focus:outline-none focus:ring-2 focus:ring-tv-accent focus:border-tv-accent
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
        `}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm text-tv-error font-medium">{error}</p>
      )}
    </div>
  );
}

