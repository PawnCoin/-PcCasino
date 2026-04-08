// Thin adapter: re-exports tailuge/billiards physics functions.
// Kept as plain JS so TypeScript never type-checks the vendor source files.

export {
  sliding,
  rollingFull,
  forceRoll,
  mathavenAdapter,
} from "billiards/src/model/physics/physics";

export { R as R_SI } from "billiards/src/model/physics/constants";
