export type ChainBehavior = 'linked' | 'independent'
export type LayerKind = 'standard' | 'exception'

export interface CalendarEventDTO {
  id: string
  date: Date
  layerKey: string
  sequenceIndex: number
  title: string
  description: string
  notes: string
  durationDays: number
  metadata: Record<string, unknown>
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
  startDate: Date | null
  includeWeekends: boolean
  includeExceptions: boolean
  layers: CalendarLayerDTO[]
  scheduledItems: CalendarEventDTO[]
}

export type CalendarSummaryDTO = Pick<
  CalendarDTO,
  'id' | 'name' | 'startDate' | 'layers'
>

