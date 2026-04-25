import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // En producción esto deberia enviarse a un endpoint de logs.
    // Por ahora, solo a consola — el bundle no incluye sentry/datadog.
    // eslint-disable-next-line no-console
    console.error('[SFyC ErrorBoundary]', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-igss-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md text-center">
            <div className="text-5xl mb-3">⚠</div>
            <h1 className="text-xl font-bold text-igss-800 mb-2">Algo salio mal</h1>
            <p className="text-sm text-gray-600 mb-4">
              Ha ocurrido un error inesperado. Recargue la pagina o vuelva al inicio.
            </p>
            <pre className="text-xs text-left bg-gray-100 p-2 rounded overflow-auto max-h-40 mb-4">
              {String(this.state.error?.message || this.state.error || '')}
            </pre>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => location.reload()}
                className="bg-igss-700 hover:bg-igss-800 text-white px-4 py-2 rounded"
              >
                Recargar
              </button>
              <button
                type="button"
                onClick={this.reset}
                className="bg-white border border-gray-300 px-4 py-2 rounded"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
