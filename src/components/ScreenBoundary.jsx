import { Component } from "react";
import { Button } from "./ui/Button.jsx";

export class ScreenBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    console.error(`Pulse ${this.props.title || "screen"} error:`, error);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: "#f7f2fb" }}>
          <h2 style={{ fontSize: 20, marginTop: 0 }}>{this.props.title || "This screen"} hit a problem</h2>
          <p style={{ color: "#b7adc4", lineHeight: 1.5 }}>Your other screens are still available. You can try this one again.</p>
          <Button isDark onClick={() => this.setState({ error: null })}>Try again</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
