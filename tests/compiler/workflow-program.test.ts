import { describe, expect, it } from "vitest";

import { compileToWorkflowProgram, workflowProgramSchema } from "../../src/domain/workpath/index.js";
import { readSeedSop } from "../helpers.js";

describe("Workflow program compiler", () => {
  it("compiles the seed SOP into a programmable harness artifact", async () => {
    const sop = await readSeedSop();
    const program = compileToWorkflowProgram(sop);

    expect(workflowProgramSchema.safeParse(program).success).toBe(true);
    expect(program).toMatchObject({
      kind: "workflow_program",
      source_sop_id: "sop_project_loop",
      profile: {
        name: "Project SOP",
        trigger: {
          task_types: ["ambiguous_project", "research_heavy_decision", "multi_phase_build", "workflow_design"]
        },
        return_contract: {
          required_sections: ["summary", "files_changed", "verification", "risks", "next_slice"]
        }
      },
      runtime_boundary: {
        mode: "external_runtime",
        stores_restricted_data: false,
        stores_secrets: false
      }
    });
    expect(program.nodes.find((node) => node.id === "execute")).toMatchObject({
      kind: "process_step",
      handoff_ids: ["boundary_codex_worker"],
      nested_process_id: "execute_nested_process",
      review_gate_ids: ["gate_reverse_pass"]
    });
  });

  it("preserves nested process operations and handoff attachments", async () => {
    const sop = await readSeedSop();
    const execute = compileToWorkflowProgram(sop).nested_processes.find(
      (process) => process.parent_step_id === "execute"
    );

    expect(execute).toMatchObject({
      id: "execute_nested_process",
      attachment_ids: ["boundary_codex_worker"],
      entry_node_id: "execute_confirm_scope",
      result_node_id: "execute_integrate"
    });
    expect(execute?.operations.map((operation) => operation.id)).toEqual([
      "execute_confirm_scope",
      "execute_delegate_worker",
      "execute_integrate"
    ]);
    expect(execute?.edges.find((edge) => edge.id === "edge_execute_delegate_boundary")).toMatchObject({
      from: "execute_delegate_worker",
      kind: "delegates_to",
      to: "boundary_codex_worker"
    });
  });

  it("compiles research fanout into executable operation semantics", async () => {
    const sop = await readSeedSop();
    const research = compileToWorkflowProgram(sop).nested_processes.find(
      (process) => process.parent_step_id === "research"
    );
    const fanout = research?.operations.find((operation) => operation.id === "research_breadth_agents");
    const synthesis = research?.operations.find((operation) => operation.id === "research_convergence");

    expect(fanout).toMatchObject({
      operation_kind: "agent_fanout",
      action: {
        kind: "agent_fanout",
        worker_count: 40,
        worker_profile: {
          model_tier: "cheap",
          reasoning: "low",
          role: "breadth_researcher"
        },
        execution: {
          mode: "parallel",
          max_concurrency: 10
        },
        merge_strategy: {
          kind: "cluster_rank_synthesize",
          target_operation_id: "research_convergence"
        },
        output_contract: {
          required_fields: ["claim", "source", "confidence", "why_it_matters"]
        }
      }
    });
    expect(synthesis).toMatchObject({
      operation_kind: "synthesis",
      action: {
        kind: "synthesis",
        inputs: ["research_breadth_agents"],
        output_contract: {
          required_fields: ["high_signal_findings", "disagreements", "recommended_focus", "open_questions"]
        }
      }
    });
  });
});
