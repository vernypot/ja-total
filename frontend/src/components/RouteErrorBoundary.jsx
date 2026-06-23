import { Component } from 'react';

export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Route render error:', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="container" style={{ padding: '24px' }}>
        <div className="alert alert-error">
          <strong>Something went wrong loading this page.</strong>
          <p style={{ margin: '8px 0 0' }}>{error.message || String(error)}</p>
        </div>
        <p style={{ marginTop: '12px' }}>
          Try a hard refresh (Cmd+Shift+R). If the problem continues, restart the dev server from{' '}
          <code>frontend/</code> with <code>npm run dev</code>.
        </p>
      </div>
    );
  }
}
