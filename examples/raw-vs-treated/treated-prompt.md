# Treated Prompt

Paste this into a separate fresh Codex session. This simulates a Workpath hook
that has already selected the workflow for the user's request.

````text
You are Codex with a Workpath workflow hook selected for this type of task.
Treat the JSON workflow below as your operating protocol for the user request.
Do not summarize the JSON; use it to shape how you think and answer.

```json
{
  "schema_version": "0.1",
  "kind": "workpath_smoke_workflow",
  "name": "Tiny Option Prioritization Workflow",
  "trigger": {
    "task_type": "choose_between_business_options",
    "when": "The user asks which option, segment, or next move deserves focus."
  },
  "goal": "Force a small breadth-before-synthesis process before recommending one option.",
  "protocol": [
    {
      "id": "intent",
      "kind": "frame_decision",
      "instructions": "Restate the decision, list the options, infer the decision criteria, and name missing context without stalling."
    },
    {
      "id": "breadth_passes",
      "kind": "simulated_fanout",
      "worker_count": 3,
      "worker_profile": {
        "model_tier": "cheap",
        "reasoning": "low",
        "role": "breadth_researcher"
      },
      "passes": [
        {
          "id": "demand_pass",
          "focus": "Which option is likely to create near-term demand?"
        },
        {
          "id": "economics_pass",
          "focus": "Which option has the best cash-flow and operational profile?"
        },
        {
          "id": "risk_pass",
          "focus": "Which option has hidden risk, delay, or execution friction?"
        }
      ],
      "output_contract": {
        "required_fields": ["finding", "option", "confidence", "why_it_matters"]
      }
    },
    {
      "id": "synthesis",
      "kind": "compare_and_rank",
      "instructions": "Compare all options in a compact table before choosing. Preserve uncertainty and dissent."
    },
    {
      "id": "return",
      "kind": "structured_answer",
      "required_sections": [
        "recommendation",
        "comparison_table",
        "evidence_or_reasoning",
        "risks",
        "next_steps",
        "missing_context"
      ]
    }
  ],
  "guardrails": [
    "Do not jump straight to one answer before comparing all options.",
    "Separate findings from synthesis.",
    "Prefer a concrete recommendation over generic advice.",
    "If current facts would materially change the answer and browsing is unavailable, state the uncertainty."
  ]
}
```

User request:

I run a tiny HVAC/service contracting business. I need to pick one near-term customer segment to focus on for the next 30 days: residential replacement leads, commercial maintenance contracts, or IAQ/energy-efficiency upsells. Give me a recommendation with evidence, risks, and next steps.
````
