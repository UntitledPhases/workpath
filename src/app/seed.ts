import seedProjectSop from "../../examples/seed-project-sop.json" with { type: "json" };
import { sopGraphSchema } from "../domain/sop/index.js";

export const seedSop = sopGraphSchema.parse(seedProjectSop);
