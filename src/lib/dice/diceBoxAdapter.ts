import type { DiceValueProvider } from "./DiceRoller";
import {
  rollDiceBoxValues,
  rollDiceBoxComposite,
  rollDiceBoxList,
} from "./diceBoxManager";

export const diceBoxValueProvider: DiceValueProvider = {
  async rollDice(count: number, sides: number): Promise<number[]> {
    return rollDiceBoxValues(count, sides);
  },
  async rollComposite(requests) {
    return rollDiceBoxComposite(requests);
  },
  async rollCustomDice(dice) {
    return rollDiceBoxList(dice);
  },
};

export default diceBoxValueProvider;
