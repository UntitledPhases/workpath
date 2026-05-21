// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";

import { SopNode } from "../../src/ui/canvas/SopNode.js";
import { type SopFlowNodeData } from "../../src/ui/canvas/flowModel.js";

describe("SopNode", () => {
  it("renders node shape labels and visible privacy classification", () => {
    const data: SopFlowNodeData = {
      defaultPrivacy: "internal",
      layer: "overview",
      selected: true,
      node: {
        id: "execute",
        kind: "step",
        module: "execute",
        title: "Execute scoped work",
        privacy: "sensitive"
      }
    };

    render(
      <ReactFlowProvider>
        <SopNode
          id="execute"
          type="sopNode"
          data={data}
          selected={true}
          isConnectable={false}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
          zIndex={0}
          selectable={true}
          deletable={false}
          draggable={false}
        />
      </ReactFlowProvider>
    );

    expect(screen.getByRole("button", { name: "step: Execute scoped work" }).getAttribute("aria-pressed")).toBe(
      "true"
    );
    expect(screen.getByText("Execute")).toBeTruthy();
    expect(screen.getByText("sensitive")).toBeTruthy();
  });

  it("hides redundant default privacy classification", () => {
    const data: SopFlowNodeData = {
      defaultPrivacy: "internal",
      layer: "overview",
      selected: false,
      node: {
        id: "intent",
        kind: "step",
        module: "intent",
        title: "Extract intent",
        privacy: "internal"
      }
    };

    render(
      <ReactFlowProvider>
        <SopNode
          id="intent"
          type="sopNode"
          data={data}
          selected={false}
          isConnectable={false}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
          zIndex={0}
          selectable={true}
          deletable={false}
          draggable={false}
        />
      </ReactFlowProvider>
    );

    expect(screen.queryByText("internal")).toBeNull();
  });
});
