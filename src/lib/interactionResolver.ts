import type { InteractionSlot, InteractionDefinition, ResolvedInteraction, StateEffect } from "@/types/interaction"

export type InteractionCallback = (slot: InteractionSlot, nodeId: string) => void

export class InteractionResolver {
  private interactions: Map<string, InteractionDefinition> = new Map()
  private stateStore: Map<string, unknown> = new Map()
  private visibilityStore: Map<string, boolean> = new Map()
  private classStore: Map<string, Set<string>> = new Map()
  private onInteraction: InteractionCallback | null = null
  private onStateChange: ((changedNodeIds: string[]) => void) | null = null

  registerInteractions(interactions: InteractionDefinition[]): void {
    for (const interaction of interactions) {
      this.interactions.set(interaction.nodeId, interaction)
    }
  }

  setInteractionCallback(callback: InteractionCallback): void {
    this.onInteraction = callback
  }

  setStateChangeCallback(callback: (changedNodeIds: string[]) => void): void {
    this.onStateChange = callback
  }

  resolve(nodeId: string): ResolvedInteraction | undefined {
    const definition = this.interactions.get(nodeId)
    if (!definition) return undefined

    const { slot } = definition
    return {
      handler: () => this.executeSlot(slot, nodeId),
      visual: this.getVisualProps(slot),
      slot,
    }
  }

  resolveAll(): Record<string, ResolvedInteraction> {
    const result: Record<string, ResolvedInteraction> = {}
    for (const [nodeId] of this.interactions) {
      const resolved = this.resolve(nodeId)
      if (resolved) result[nodeId] = resolved
    }
    return result
  }

  getNodeVisibility(nodeId: string): boolean | undefined {
    return this.visibilityStore.get(nodeId)
  }

  getToggledClasses(nodeId: string): string[] {
    return [...(this.classStore.get(nodeId) ?? [])]
  }

  private getVisualProps(slot: InteractionSlot): ResolvedInteraction["visual"] {
    switch (slot.type) {
      case "navigation":
      case "modal-open":
      case "form-submit":
        return { cursor: "pointer", hoverEffect: true }
      case "state-change":
        return { cursor: "pointer", hoverEffect: true }
      case "data-fetch":
        return { cursor: "pointer", hoverEffect: false }
      case "custom":
        return { cursor: "pointer", hoverEffect: true }
      default:
        return {}
    }
  }

  private executeSlot(slot: InteractionSlot, nodeId: string): void {
    switch (slot.type) {
      case "navigation":
      case "modal-open":
      case "form-submit":
      case "data-fetch":
      case "custom":
        if (this.onInteraction) {
          this.onInteraction(slot, nodeId)
        }
        break
      case "state-change":
        this.executeStateChange(slot)
        break
    }
  }

  private executeStateChange(slot: StateChangeSlot): void {
    const currentState = this.stateStore.get(slot.stateKey)
    const newState = !currentState
    this.stateStore.set(slot.stateKey, newState)

    const changedNodeIds: string[] = []
    for (const effect of slot.effects) {
      this.applyEffect(effect, newState)
      changedNodeIds.push(effect.targetId)
    }

    if (this.onStateChange) {
      this.onStateChange(changedNodeIds)
    }
  }

  private applyEffect(effect: StateEffect, stateValue: boolean): void {
    switch (effect.action) {
      case "show":
        this.visibilityStore.set(effect.targetId, stateValue)
        break
      case "hide":
        this.visibilityStore.set(effect.targetId, !stateValue)
        break
      case "toggle-class":
        if (effect.className) {
          const currentClasses = this.classStore.get(effect.targetId) ?? new Set<string>()
          if (stateValue) {
            currentClasses.add(effect.className)
          } else {
            currentClasses.delete(effect.className)
          }
          this.classStore.set(effect.targetId, currentClasses)
        }
        break
      case "replace-children":
      case "update-props":
        if (this.onInteraction) {
          this.onInteraction(
            { type: "state-change", stateKey: effect.action, description: `Apply ${effect.action} to ${effect.targetId}`, effects: [effect] },
            effect.targetId,
          )
        }
        break
    }
  }

  clear(): void {
    this.interactions.clear()
    this.stateStore.clear()
    this.visibilityStore.clear()
    this.classStore.clear()
  }
}

type StateChangeSlot = Extract<InteractionSlot, { type: "state-change" }>
