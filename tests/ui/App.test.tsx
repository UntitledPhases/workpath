// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";

import { App } from "../../src/app/App.js";

class TestResizeObserver {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe() {
    this.callback(
      [
        {
          contentRect: {
            bottom: 720,
            height: 720,
            left: 0,
            right: 1280,
            top: 0,
            width: 1280,
            x: 0,
            y: 0,
            toJSON: () => ({})
          },
          target: document.body
        } as unknown as ResizeObserverEntry
      ],
      this as unknown as ResizeObserver
    );
    return undefined;
  }

  unobserve() {
    return undefined;
  }

  disconnect() {
    return undefined;
  }
}

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  value: TestResizeObserver
});

Object.defineProperty(window, "DOMMatrixReadOnly", {
  configurable: true,
  value: class {
    readonly m22 = 1;
  }
});

Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
  configurable: true,
  value: () => ({
    bottom: 720,
    height: 720,
    left: 0,
    right: 1280,
    top: 0,
    width: 1280,
    x: 0,
    y: 0,
    toJSON: () => ({})
  })
});

Object.defineProperty(HTMLElement.prototype, "clientWidth", {
  configurable: true,
  get: () => 1280
});

Object.defineProperty(HTMLElement.prototype, "clientHeight", {
  configurable: true,
  get: () => 720
});

Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
  configurable: true,
  get: () => 1280
});

Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
  configurable: true,
  get: () => 720
});

describe("App", () => {
  it("renders the native seed SOP and updates the inspector from canvas selection", async () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Project SOP" })).toBeTruthy();
    expect(screen.getByTestId("sop-canvas")).toBeTruthy();
    expect(screen.getByTestId("sop-inspector").textContent).toContain("Extract intent");
    expect(screen.getByTestId("sop-inspector").textContent).toContain(
      "Clarify goal, constraints, done-state, and risk."
    );
    expect(screen.getAllByText("internal").length).toBeGreaterThan(0);

    fireEvent.click(await screen.findByRole("button", { name: "Select step: Execute work" }));

    expect(screen.getByTestId("sop-inspector").textContent).toContain("Execute work");
    expect(screen.getByTestId("sop-inspector").textContent).toContain("execute");
  });

  it("renders complete boundary metadata and clears selection on pane click", async () => {
    const { container } = render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Select boundary: Worker handoff" }));

    const boundaryPanel = screen.getByTestId("sop-inspector").textContent ?? "";
    expect(boundaryPanel).toContain("Implement the scoped slice without touching unrelated files.");
    expect(boundaryPanel).toContain("src/**, tests/**, docs/**");
    expect(boundaryPanel).toContain(".env, .ssh/**");
    expect(boundaryPanel).toContain("summary, files_changed, tests_run, open_risks");
    expect(boundaryPanel).toContain("artifact_tests_passed");

    const pane = container.querySelector(".react-flow__pane");
    if (!pane) {
      throw new Error("Missing React Flow pane");
    }
    fireEvent.click(pane);

    expect(screen.getByTestId("sop-inspector").textContent).not.toContain("Worker handoff");
  });
});
