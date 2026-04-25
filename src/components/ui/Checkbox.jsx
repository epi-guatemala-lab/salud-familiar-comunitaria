export default function Checkbox({
  checked,
  onChange,
  label,
  disabled,
  error,
  className = '',
  ...rest
}) {
  return (
    <label
      className={`inline-flex items-start gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <input
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-1 rounded text-igss-700 focus:ring-igss-500"
        {...rest}
      />
      {label && <span className="text-sm text-gray-800">{label}</span>}
      {error && <span className="text-xs text-red-600 block">{error}</span>}
    </label>
  );
}
