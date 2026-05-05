import React from 'react';
import ReactDOM from 'react-dom/client';
import PulseApp from '../PulseApp.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('PulseApp render error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        style: {
          padding: '20px',
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#ff3b5c',
          background: '#1a0533',
          minHeight: '100vh',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all'
        }
      }, [
        React.createElement('h2', { key: 'h', style: { color: '#fff', marginBottom: '10px' } }, '\u26a0\ufe0f App Error'),
        React.createElement('div', { key: 'e' }, String(this.state.error)),
        React.createElement('div', { key: 'i', style: { marginTop: '10px', color: '#aaa', fontSize: '12px' } },
          this.state.info ? this.state.info.componentStack : ''
        )
      ]);
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(ErrorBoundary, null,
    React.createElement(PulseApp)
  )
);
