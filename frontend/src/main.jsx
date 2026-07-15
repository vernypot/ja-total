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


applyUiTheme(readCachedUiTheme());

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
