import React from "react";
import ReactDOM from "react-dom/client";
import PulseApp from "./app/PulseApp.jsx";
import "./theme/global.css";
import { Button } from "./components/ui/Button.jsx";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error("PulseApp render error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, background: "#100c16", color: "#f7f2fb", minHeight: "100vh" }}>
          <h1 style={{ fontSize: 24 }}>Pulse needs a reload</h1>
          <p style={{ color: "#b7adc4" }}>Something unexpected happened. Your saved lists stay on this phone.</p>
          <Button isDark onClick={() => window.location.reload()}>Reload</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <PulseApp />
  </ErrorBoundary>
);
