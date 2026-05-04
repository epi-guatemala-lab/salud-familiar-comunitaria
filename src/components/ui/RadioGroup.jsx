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
          // Soporta los 3 shapes del codebase: {value,label}, {id,label}, string/number plano.
          // Si opt es objeto sin value/id, RadioGroup mandaba el OBJETO entero como value
          // → backend rechazaba con "Input should be 'X' or 'Y'". Ahora siempre string.
          const v = opt && typeof opt === 'object' ? (opt.value ?? opt.id ?? '') : opt;
          const lbl = opt && typeof opt === 'object' ? (opt.label ?? opt.title ?? String(v)) : opt;
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
