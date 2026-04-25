import Radio from './Radio';

export default function RadioGroup({
  name,
  options = [],
  value,
  onChange,
  label,
  error,
  required,
  inline = true,
  className = '',
}) {
  return (
    <fieldset className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <legend className="text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-600">*</span>}
        </legend>
      )}
      <div className={`flex ${inline ? 'flex-wrap gap-4' : 'flex-col gap-2'}`}>
        {options.map((opt) => {
          const v = opt.value ?? opt;
          const lbl = opt.label ?? opt;
          return (
            <Radio
              key={v}
              name={name}
              value={v}
              checked={value === v}
              onChange={() => onChange?.(v)}
              label={lbl}
            />
          );
        })}
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </fieldset>
  );
}
