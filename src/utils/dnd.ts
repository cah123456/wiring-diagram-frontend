export const SYMBOL_DRAG_TYPE = 'application/x-gridline-symbol'

export interface SymbolDragPayload {
  type: string
  from?: string
}

export const writeSymbolDrag = (event: DragEvent, payload: SymbolDragPayload): void => {
  if (!event.dataTransfer) return
  event.dataTransfer.setData(SYMBOL_DRAG_TYPE, JSON.stringify(payload))
  event.dataTransfer.setData('text/plain', payload.type)
  event.dataTransfer.effectAllowed = 'copy'
}

export const readSymbolDrag = (event: DragEvent): SymbolDragPayload | null => {
  const transfer = event.dataTransfer
  if (!transfer) return null
  const raw = transfer.getData(SYMBOL_DRAG_TYPE)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as SymbolDragPayload
      if (parsed && typeof parsed.type === 'string') return parsed
    } catch {
      // Fall through to the plain-text representation.
    }
  }
  const type = transfer.getData('text/plain')
  return type ? { type } : null
}
