import { IKeySelectionStrategy } from "./selection.strategy";
import { KeyState, PickContext } from "../types";

export class RoundRobinStrategy implements IKeySelectionStrategy {
  private idx = 0;
  pick(keys: KeyState[], _context: PickContext): KeyState | undefined {
    if (!keys.length) return undefined;
    const start = this.idx;
    for (let i = 0; i < keys.length; i++) {
      const k = keys[this.idx % keys.length];
      this.idx = (this.idx + 1) % keys.length;
      if (k.status === "active") return k;
    }
    return keys[start % keys.length];
  }
}
