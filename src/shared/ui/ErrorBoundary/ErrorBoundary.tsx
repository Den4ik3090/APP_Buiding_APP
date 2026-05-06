import React from "react";
import styles from "./ErrorBoundary.module.scss";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Component stack:", info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const message = this.state.error?.message;

    return (
      <div className={styles['wrapper']}>
        <div className={styles['card']}>
          <div className={styles['icon']} aria-hidden="true">⚠️</div>
          <h2 className={styles['title']}>Что-то пошло не так</h2>
          <p className={styles['message']}>
            Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу.
            Если проблема повторяется — обратитесь к администратору.
          </p>
          {message && (
            <pre className={styles['detail']}>{message}</pre>
          )}
          <button
            type="button"
            className={styles['btn']}
            onClick={this.handleReload}
          >
            Перезагрузить страницу
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
