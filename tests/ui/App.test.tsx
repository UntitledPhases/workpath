// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach } from "vitest";

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
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

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

  it("opens a selected process node into nested-process drilldown and returns to overview", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Select step: Execute work" }));
    fireEvent.click(await screen.findByRole("button", { name: "Open Execute work" }));

    expect(await screen.findByRole("button", { name: "activity: Confirm scope" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "activity: Delegate worker" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "step: Extract intent" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Project SOP" }));

    expect(await screen.findByRole("button", { name: "step: Extract intent" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "activity: Confirm scope" })).toBeNull();
  });

  it("opens a nested process on process node double click", async () => {
    render(<App />);

    fireEvent.doubleClick(await screen.findByRole("button", { name: "step: Execute work" }));

    expect(await screen.findByRole("group", { name: "Nested process: Execute work" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "activity: Delegate worker" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "step: Research context" })).toBeNull();
  });

  it("infers nested-process drilldown for direct attachment selection", async () => {
    window.history.replaceState(null, "", "/?selected=boundary_codex_worker");

    render(<App />);

    expect(await screen.findByRole("button", { name: "activity: Delegate worker" })).toBeTruthy();
    expect(screen.getByTestId("sop-inspector").textContent).toContain("Worker handoff");
  });

  it("edits the selected node title through the inspector and marks the draft dirty", async () => {
    render(<App />);

    const title = await screen.findByLabelText("title");
    fireEvent.change(title, { target: { value: "Clarify intent" } });

    expect(screen.getByTestId("sop-inspector").textContent).toContain("Clarify intent");
    expect(screen.getByTestId("export-panel").textContent).toContain("edited");
    expect(screen.getByRole("button", { name: "step: Clarify intent" })).toBeTruthy();
  });

  it("adds a nested process activity from the inspector", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Select step: Execute work" }));
    fireEvent.click(await screen.findByRole("button", { name: "Open Execute work" }));
    fireEvent.click(screen.getByRole("button", { name: "Add activity" }));

    expect(await screen.findByRole("button", { name: "activity: New activity" })).toBeTruthy();
    expect(screen.getByTestId("sop-inspector").textContent).toContain("New activity");
    expect(screen.getByTestId("export-panel").textContent).toContain("Ready");
  });
});
