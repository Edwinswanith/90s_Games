import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/nunito-sans/latin-400.css';
import '@fontsource/nunito-sans/latin-700.css';
import '@fontsource/noto-sans-tamil/tamil-400.css';
import App from './App';
class Boundary extends React.Component<{ children: React.ReactNode }, { error: string }> {
  state = { error: '' };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <div
        style={{ padding: 40, color: '#152347', background: '#FFF4DD', fontFamily: 'sans-serif' }}
      >
        <h1>The courtyard could not open.</h1>
        <p>{this.state.error}</p>
        <p>Check that WebGL is enabled in Chrome and reload.</p>
        <button onClick={() => location.reload()}>Reload</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById('root')!).render(
  <Boundary>
    <App />
  </Boundary>,
);
