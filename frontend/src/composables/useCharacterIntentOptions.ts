import { computed, ref } from 'vue'
import { findItemsWithAffordance } from '../stores/utils/pathfinding'
import { useSimulationStore } from '../stores/simulation'
import type { Intent, NeedName } from '../stores/types'

const NEED_TO_ACTION = {
  food: 'eat',
  sleep: 'sleep',
  bladder: 'use_toilet',
  hygiene: 'shower',
  health: 'medicate',
  romance: 'date',
  friends: 'chat_friend',
  family: 'call_mom',
  fulfillment: 'read'
} as const

interface CharacterTarget {
  id: string
  name: string
}

interface SelectableOption {
  label: string
  intent: Intent
}

export function useCharacterIntentOptions(character: CharacterTarget, availableRomanceTargets: CharacterTarget[]) {
  const simulationStore = useSimulationStore()
  const selectedNeed = ref<NeedName | null>(null)

  const characterState = computed(() => simulationStore.characterStates[character.id])

  const selectableOptions = computed<SelectableOption[]>(() => {
    const state = characterState.value
    if (!state || !selectedNeed.value) {
      return []
    }

    const availableSocialTargets = (availableRomanceTargets || []).filter((target) => target.id !== character.id)

    if (selectedNeed.value === 'romance') {
      return availableSocialTargets
        .flatMap((target) => ([
          { label: `Text ${target.name}`, intent: { action: 'text_romance', utility: 1, source: 'manual', socialTargetId: target.id, socialTargetName: target.name } },
          { label: `Call ${target.name}`, intent: { action: 'call_romance', utility: 1, source: 'manual', socialTargetId: target.id, socialTargetName: target.name } },
          { label: `Invite ${target.name} over`, intent: { action: 'invite_over', utility: 1, source: 'manual', socialTargetId: target.id, socialTargetName: target.name } }
        ]))
    }

    const action = NEED_TO_ACTION[selectedNeed.value as keyof typeof NEED_TO_ACTION]
    if (!action) {
      return []
    }

    const itemOptions = findItemsWithAffordance({
      characterId: character.id,
      action,
      characterContext: state,
      worldData: simulationStore.worldData,
      itemOccupancy: {}
    })
    const selectableTargets = action === 'chat_friend'
      ? availableSocialTargets
      : [{ id: '', name: '' }]

    return itemOptions
      .flatMap((option) => selectableTargets.map((target) => ({
        label: action === 'chat_friend'
          ? `Chat with ${target.name} at ${option.itemName} in ${option.lotName} → ${option.spaceName}`
          : `${option.itemName} in ${option.lotName} → ${option.spaceName}`,
        intent: {
          action,
          itemId: option.itemId,
          itemName: option.itemName,
          targetSpaceId: option.spaceId,
          targetSpaceName: option.spaceName,
          targetLotId: option.lotId,
          targetLotName: option.lotName,
          travelCost: option.travelCost,
          utility: option.affordanceWeight,
          source: 'manual' as const,
          socialTargetId: target.id || undefined,
          socialTargetName: target.name || undefined
        }
      })))
      .map((option) => ({
        ...option,
        intent: action === 'chat_friend' && !option.intent.socialTargetId
          ? { ...option.intent, action: 'idle', utility: 0 }
          : option.intent
      }))
      .filter((option) => option.intent.action !== 'idle')
      .sort((left, right) => {
        if (action !== 'sleep') {
          return 0
        }

        const leftComfort = left.intent.itemId
          ? simulationStore.worldData.items[left.intent.itemId]?.comfort ?? 0
          : 0
        const rightComfort = right.intent.itemId
          ? simulationStore.worldData.items[right.intent.itemId]?.comfort ?? 0
          : 0

        if (rightComfort !== leftComfort) {
          return rightComfort - leftComfort
        }

        return (left.intent.travelCost ?? 0) - (right.intent.travelCost ?? 0)
      })
  })

  return {
    characterState,
    selectedNeed,
    selectableOptions
  }
}
