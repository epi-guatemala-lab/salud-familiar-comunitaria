export default function Select({
  label,
  error,
  hint,
  id,
  options = [],
  placeholder = 'Seleccione...',
  className = '',
  required,
  ...rest
}) {
  const selId = id || rest.name;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={selId} className="text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
      )}
      <select
        id={selId}
        className={`border rounded-md p-2 bg-white transition focus:outline-none focus:ring-1 focus:ring-igss-500
          ${error ? 'border-red-500' : 'border-gray-300 focus:border-igss-500'}`}
        {...rest}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
      {hint && !error && <span className="text-xs text-gray-500">{hint}</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
