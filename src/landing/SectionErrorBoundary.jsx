import { Component } from 'react';

/**
 * Error boundary per landing section.
 * On crash: hides the section silently (production) or shows section name (dev).
 */
export default class SectionErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    const name = this.props.name || 'Unknown Section';
    if (typeof window !== 'undefined' && window.__errorTracker) {
      window.__errorTracker.capture(error, { section: name, ...info });
    }
  }

  render() {
    if (this.state.hasError) {
      // In development, show which section failed
      if (import.meta.env.DEV) {
        return (
          <div className="py-4 text-center text-sm text-red-400 bg-red-50/50">
            Secțiunea "{this.props.name}" a eșuat — verifică consola.
          </div>
        );
      }
      // In production, hide silently
      return null;
    }
    return this.props.children;
  }
}
