export default function FormField({
  label,
  htmlFor,
  error = '',
  required = false,
  hint = '',
  children,
  className = '',
}) {
  return (
    <label
      className={`form-field ${error ? 'form-field--invalid' : ''} ${className}`.trim()}
      htmlFor={htmlFor}
      style={{ display: 'block' }}
    >
      {label && (
        <span className="form-field-label">
          {label}
          {required && <span className="form-field-required" aria-hidden> *</span>}
        </span>
      )}
      {hint && <span className="form-field-hint">{hint}</span>}
      <div className="form-field-control">{children}</div>
      {error && (
        <span className="form-field-error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
