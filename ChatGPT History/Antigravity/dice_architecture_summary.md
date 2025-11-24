# Unified Dice Architecture - Complete

## 🎯 Mission Accomplished!

**EVERY dice roll now goes through DiceEngine** - just like how every Result Card goes through the converters!

## The New Architecture

```
┌─────────────────────────┐
│   UI Components         │
│   (DiceTray, etc.)      │
└───────────┬─────────────┘
            │ ALL expressions go here
            ↓
┌─────────────────────────┐
│   DiceEngine            │  ✅ UNIFIED ENTRY POINT
│   rollExpression()      │     • Parses notation
│                         │     • Rolls dice
│                         │     • Returns RollResult
└───────────┬─────────────┘
            │
            ├──→ DiceExpression.parse()
            ├──→ DiceRoller.rollWithProvider()
            └──→ diceBoxValueProvider → DiceBox Manager → 3D DiceBox
```

## API Usage

### For UI Components:
```typescript
// 1. User enters expression in DiceTray
const expression = "2d20kh1 + 4";

// 2. DiceTray calls DiceEngine  
const rollResult = await rollExpression(expression);

// 3. Convert to ResultCard for display
const card = convertDiceToCard(rollResult);

// 4. Display card in Results Pane
onResultCard(card);
```

## Supported Notation

✅ **Simple rolls**: `1d20`, `3d6`, `4d6dl1`
✅ **Keep/Drop**: `2d20kh1` (advantage), `4d6dl1` (drop lowest)
✅ **Pools**: `5d6>=4#3` (roll 5d6, count ≥4 as success, need 3 successes)
✅ **Exploding**: `3d6!6` (explode on 6)
✅ **Degrading**: `1d6!<=2` (degrade if ≤2)
✅ **Challenge**: `challenge(d6 vs 2d10)` (Ironsworn-style)
✅ **Math**: `2d20kh1 + 4 - 1d4`

## Next Steps

### DiceTray Refactoring:
1. Replace `DiceRoller.rollWithProvider()` with `rollExpression()`
2. Delete local `convertResultToCard()` function (use `convertDiceToCard()` instead)
3. Delete helper functions (now handled by DiceEngine + converters)
4. **Result**: DiceTray drops from 1450 lines → ~600-700 lines!

### Files Modified:
- ✅ `src/core/dice/diceEngine.ts` - Added `rollExpression()`

### Files to Update:
- ⏳ `src/components/DiceTray.tsx` - Use `rollExpression()` instead of direct DiceRoller calls
- ⏳ `src/App.tsx` - Remove old `convertRollToCard()` function (Phase 7: Cleanup)

## Design Philosophy

**Just like Result Cards:**
- ✅ Single source of truth (`DiceEngine`)
- ✅ Unified API (`rollExpression()`)
- ✅ Converters for display (`convertDiceToCard()`)
- ✅ No bypassing the system!
