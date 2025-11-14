export type ChainBehavior = 'linked' | 'independent'
export type LayerKind = 'standard' | 'exception'
export type LayerTemplateMode = 'generated' | 'manual'

export interface CalendarEvent {
  id: string
  title: string
  description: string
  durationDays: number
  metadata: Record<string, unknown>
}

export interface ScheduledItem {
  id: string
  date: string
  layerKey: string
  sequenceIndex: number
  label: string
  notes: string
  events: CalendarEvent[]
}

export interface CalendarLayer {
  key: string
  name: string
  color: string
  description: string
  chainBehavior: ChainBehavior
  kind: LayerKind
}

export interface Calendar {
  id: string
  name: string
  presetKey?: string
  startDate: string
  includeWeekends: boolean
  includeExceptions: boolean
  layers: CalendarLayer[]
  scheduledItems: ScheduledItem[]
}

export type CalendarSummary = Pick<
  Calendar,
  'id' | 'name' | 'startDate' | 'layers'
>

export interface LayerTemplateConfig {
  mode: LayerTemplateMode
  itemCount?: number
  titlePattern?: string
}

export interface CreateCalendarLayerInput {
  key: string
  name: string
  color?: string
  description?: string
  chainBehavior?: ChainBehavior
  kind?: LayerKind
  templateConfig?: LayerTemplateConfig
}

export interface CreateCalendarRequest {
  name: string
  presetKey?: string
  startDate: string
  includeWeekends?: boolean
  includeExceptions?: boolean
  layers?: CreateCalendarLayerInput[]
  templateItemsByLayer?: Record<
    string,
    Array<{
      title: string
      description?: string
      durationDays?: number
    }>
  >
}

export interface ShiftScheduledItemsRequest {
  scheduledItemId: string
  shiftByDays: number
  layerKeys?: string[]
}

export interface UpdateCalendarRequest {
  layers?: Array<{
    key: string
    name?: string
    color?: string
    description?: string
    chainBehavior?: ChainBehavior
    kind?: LayerKind
  }>
  includeWeekends?: boolean
  includeExceptions?: boolean
}

