export default function DateField({
  label,
  error,
  id,
  className = '',
  required,
  ...rest
}) {
  const fid = id || rest.name;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={fid} className="text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
      )}
      <input
        type="date"
        id={fid}
        className={`border rounded-md p-2 transition focus:outline-none focus:ring-1 focus:ring-igss-500
          ${error ? 'border-red-500' : 'border-gray-300 focus:border-igss-500'}`}
        {...rest}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
