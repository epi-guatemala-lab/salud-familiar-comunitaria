export default function Textarea({
  label,
  error,
  hint,
  id,
  className = '',
  required,
  rows = 4,
  maxLength,
  value = '',
  ...rest
}) {
  const taId = id || rest.name;
  const showCounter = !!maxLength;
  const len = typeof value === 'string' ? value.length : 0;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={taId} className="text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
      )}
      <textarea
        id={taId}
        rows={rows}
        maxLength={maxLength}
        value={value}
        className={`border rounded-md p-2 transition focus:outline-none focus:ring-1 focus:ring-igss-500
          ${error ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-igss-500'}`}
        {...rest}
      />
      <div className="flex justify-between text-xs">
        <span className={error ? 'text-red-600' : 'text-gray-500'}>
          {error || hint || ''}
        </span>
        {showCounter && (
          <span className="text-gray-400">
            {len}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
