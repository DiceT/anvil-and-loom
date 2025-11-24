import {
    rollDiceBoxValues,
    rollDiceBoxComposite,
    rollDiceBoxList,
} from "./diceBoxManager";
import {
    setDiceThemeName,
    setDiceThemeColor,
    setDiceTensThemeColor,
    setDiceTexture,
} from "../../core/dice/diceAppearance";
import type { DiceValueProvider } from "./DiceRoller";

/**
 * Provider that uses the 3D DiceBox for rolling values.
 */
export const diceBoxValueProvider: DiceValueProvider = {
    rollDice: rollDiceBoxValues,
    rollComposite: rollDiceBoxComposite,
    rollCustomDice: rollDiceBoxList,
    setThemeName: setDiceThemeName,
    setThemeColor: setDiceThemeColor,
    setTensThemeColor: setDiceTensThemeColor,
    setTexture: setDiceTexture,
};
