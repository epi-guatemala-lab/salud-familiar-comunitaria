export default function Spinner({ size = 'md', label, className = '' }) {
  const dim = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size] || 'h-8 w-8';
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <svg
        className={`animate-spin text-igss-700 ${dim}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      {label && <span className="text-sm text-gray-600">{label}</span>}
    </div>
  );
}
