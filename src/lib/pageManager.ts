import type { InteractionDefinition, PageDefinition } from "@/types/interaction"
import type { UiTreeNode } from "@/lib/renderByAST"

export interface ManagedPage {
  definition: PageDefinition
  uiTree: UiTreeNode | null
  styles: Array<{ id: string; className: string; classNames?: Record<string, string> }>
  interactions: InteractionDefinition[]
}

export class PageManager {
  private pages: Map<string, ManagedPage> = new Map()
  private activePageId: string
  private pageHistory: string[] = []
  private onPageChange: ((pageId: string) => void) | null = null

  constructor(initialPageId: string) {
    this.activePageId = initialPageId
  }

  setActivePage(page: ManagedPage): void {
    this.pages.set(page.definition.id, page)
  }

  switchToPage(pageId: string): boolean {
    if (!this.pages.has(pageId)) return false
    this.pageHistory.push(this.activePageId)
    this.activePageId = pageId
    if (this.onPageChange) this.onPageChange(pageId)
    return true
  }

  goBack(): boolean {
    if (this.pageHistory.length === 0) return false
    const previousPageId = this.pageHistory.pop()!
    this.activePageId = previousPageId
    if (this.onPageChange) this.onPageChange(previousPageId)
    return true
  }

  getActivePage(): ManagedPage | undefined {
    return this.pages.get(this.activePageId)
  }

  getActivePageId(): string {
    return this.activePageId
  }

  getPage(pageId: string): ManagedPage | undefined {
    return this.pages.get(pageId)
  }

  hasPage(pageId: string): boolean {
    return this.pages.has(pageId)
  }

  getAllPageDefinitions(): PageDefinition[] {
    return [...this.pages.values()].map((p) => p.definition)
  }

  canGoBack(): boolean {
    return this.pageHistory.length > 0
  }

  setPageChangeCallback(callback: (pageId: string) => void): void {
    this.onPageChange = callback
  }

  updatePageTree(pageId: string, uiTree: UiTreeNode, styles: ManagedPage["styles"], interactions: InteractionDefinition[]): void {
    const page = this.pages.get(pageId)
    if (page) {
      page.uiTree = uiTree
      page.styles = styles
      page.interactions = interactions
      page.definition.isGenerated = true
    }
  }

  clear(): void {
    this.pages.clear()
    this.pageHistory = []
  }
}
