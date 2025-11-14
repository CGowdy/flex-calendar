export type ChainBehavior = 'linked' | 'independent'
export type LayerKind = 'standard' | 'exception'

export interface CalendarEventDTO {
  id: string
  title: string
  description: string
  durationDays: number
  metadata: Record<string, unknown>
}

export interface ScheduledItemDTO {
  id: string
  date: Date
  layerKey: string
  sequenceIndex: number
  label: string
  notes: string
  events: CalendarEventDTO[]
}

export interface CalendarLayerDTO {
  key: string
  name: string
  color: string
  description: string
  chainBehavior: ChainBehavior
  kind: LayerKind
}

export interface CalendarDTO {
  id: string
  name: string
  presetKey?: string
  startDate: Date
  includeWeekends: boolean
  includeExceptions: boolean
  layers: CalendarLayerDTO[]
  scheduledItems: ScheduledItemDTO[]
}

export type CalendarSummaryDTO = Pick<
  CalendarDTO,
  'id' | 'name' | 'startDate' | 'layers'
>

