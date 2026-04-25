const TONES = {
  default: 'bg-gray-100 text-gray-700',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue: 'bg-blue-100 text-blue-800',
  igss: 'bg-igss-100 text-igss-800',
  outline: 'bg-white border border-gray-300 text-gray-700',
};

export default function Badge({ tone = 'default', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TONES[tone] || TONES.default} ${className}`}
    >
      {children}
    </span>
  );
}
