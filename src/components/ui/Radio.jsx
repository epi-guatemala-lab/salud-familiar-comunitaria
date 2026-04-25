export default function Radio({ checked, onChange, label, name, value, disabled, className = '' }) {
  return (
    <label
      className={`inline-flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={!!checked}
        disabled={disabled}
        onChange={onChange}
        className="text-igss-700 focus:ring-igss-500"
      />
      {label && <span className="text-sm text-gray-800">{label}</span>}
    </label>
  );
}
