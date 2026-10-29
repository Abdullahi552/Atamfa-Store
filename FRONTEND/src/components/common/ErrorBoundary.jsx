import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('UI error:', error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-6">
        <div className="card max-w-md p-8 text-center">
          <h1 className="text-2xl font-semibold">Something broke</h1>
          <p className="mt-2 text-sm text-muted">The page hit an unexpected error. Reloading usually fixes it.</p>
          <button onClick={() => window.location.reload()} className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg">Reload</button>
        </div>
      </div>
    );
  }
}
