import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { applyUiTheme, readCachedUiTheme } from './utils/uiTheme';
import './styles/theme.css';
import './styles/responsive-layout.css';
import './styles/themes/clear.css';
import './styles/themes/clear-blix.css';
import './styles/themes/dark.css';
import './styles/themes/dark-blix.css';
import './styles/accessibility.css';
import './styles/sidebar.css';
import './styles/brand-mark.css';
import './styles/topbar.css';
import './styles/form.css';
import './styles/app.css';
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/eventAttendance.css";
import "./styles/miembro.css";
import "./styles/portal-mobile.css";
import "./styles/theme-color-overrides.css";
import "./styles/usuarios.css";
import "./styles/noticia-html.css";

class BootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('App failed to render:', error);
  }

  render() {
    if (this.state.error) {
      const message = this.state.error?.message || String(this.state.error);
      return (
        <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', color: '#b91c1c' }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Teófila failed to load</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: 1.5 }}>{message}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

applyUiTheme(readCachedUiTheme());

ReactDOM.createRoot(document.getElementById('root')).render(
  <BootErrorBoundary>
    <App />
  </BootErrorBoundary>
);
