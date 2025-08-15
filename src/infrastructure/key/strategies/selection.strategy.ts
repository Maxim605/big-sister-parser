import { KeyState, PickContext } from '../types';

export interface IKeySelectionStrategy {
  pick(keys: KeyState[], context: PickContext): KeyState | undefined;
}
