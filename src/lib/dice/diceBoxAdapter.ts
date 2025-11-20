import type { DiceValueProvider } from "./DiceRoller";
import { rollDiceBoxValues, rollDiceBoxComposite } from "../diceEngine";

export const diceBoxValueProvider: DiceValueProvider = {
  async rollDice(count: number, sides: number): Promise<number[]> {
    return rollDiceBoxValues(count, sides);
  },
  async rollComposite(requests) {
    return rollDiceBoxComposite(requests);
  },
};

export default diceBoxValueProvider;
