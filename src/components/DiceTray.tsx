import { useEffect, useRef } from "react";
import DiceBox from "@3d-dice/dice-box-threejs/dist/dice-box-threejs.es";

type DiceBoxInstance = any; // we'll tighten this up later

const DICE_CONTAINER_ID = "dice-box-container";

export function DiceTray() {
  const diceBoxRef = useRef<DiceBoxInstance | null>(null);

  useEffect(() => {
    // Create the DiceBox instance and attach it to our div
    const box = new (DiceBox as any)(`#${DICE_CONTAINER_ID}`, {
      sounds: false,
      light_intensity: 0.8,
      gravity_multiplier: 400,
      baseScale: 100,
      strength: 2,
      onRollComplete: (results: unknown) => {
        console.log("Dice results:", results);
      },
    });

    diceBoxRef.current = box;

    (async () => {
      if (box.initialize) {
        await box.initialize();
      }
    })();

    return () => {
      if (diceBoxRef.current && typeof diceBoxRef.current.destroy === "function") {
        diceBoxRef.current.destroy();
      }
    };
  }, []);

  const rollD20 = async () => {
    if (!diceBoxRef.current?.roll) return;
    await diceBoxRef.current.roll("1d20");
  };

  const roll4d6 = async () => {
    if (!diceBoxRef.current?.roll) return;
    await diceBoxRef.current.roll("4d6");
  };

  return (
    <div className="dice-tray">
      <div className="dice-tray-controls">
        <button type="button" onClick={rollD20}>
          Roll 1d20
        </button>
        <button type="button" onClick={roll4d6}>
          Roll 4d6
        </button>
      </div>
      <div
        id={DICE_CONTAINER_ID}
        style={{
          width: "100%",
          height: 260,
          borderRadius: 8,
          overflow: "hidden",
        }}
      />
    </div>
  );
}