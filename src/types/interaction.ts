export type InteractionSlot =
  | NavigationSlot
  | StateChangeSlot
  | FormSubmitSlot
  | ModalOpenSlot
  | DataFetchSlot
  | CustomSlot

export interface NavigationSlot {
  type: "navigation"
  target: string
  description: string
  params?: Record<string, string>
}

export interface StateEffect {
  targetId: string
  action: "show" | "hide" | "toggle-class" | "replace-children" | "update-props"
  className?: string
  replacementTree?: string
  propsDelta?: Record<string, unknown>
}

export interface StateChangeSlot {
  type: "state-change"
  stateKey: string
  description: string
  effects: StateEffect[]
}

export interface FormSubmitSlot {
  type: "form-submit"
  description: string
  fields: string[]
  onSubmitDescription: string
}

export interface ModalOpenSlot {
  type: "modal-open"
  description: string
  modalType: "dialog" | "sheet" | "drawer" | "popover"
  contentDescription: string
}

export interface DataFetchSlot {
  type: "data-fetch"
  description: string
  mockData?: string
  onLoadEffects: StateEffect[]
}

export interface CustomSlot {
  type: "custom"
  description: string
}

export interface InteractionDefinition {
  nodeId: string
  slot: InteractionSlot
}

export interface PageDefinition {
  id: string
  name: string
  description: string
  isGenerated: boolean
}

export interface ResolvedInteraction {
  handler?: (...args: unknown[]) => void
  visual: {
    cursor?: "pointer"
    hoverEffect?: boolean
  }
  slot: InteractionSlot
}

export interface InteractionRequestPayload {
  type: InteractionSlot["type"]
  description: string
  target?: string
  modalType?: ModalOpenSlot["modalType"]
  contentDescription?: string
  onSubmitDescription?: string
  params?: Record<string, string>
  currentPageContext?: string
}

export interface InteractionResponsePayload {
  uiTree: string
  styles: Array<{
    id: string
    className?: string
    classNames?: Record<string, string>
  }>
  interactions?: InteractionDefinition[]
  pages?: PageDefinition[]
}
