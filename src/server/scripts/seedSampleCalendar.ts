import { CalendarModel } from '../models/calendarModel.js'
import {
  connectToDatabase,
  disconnectFromDatabase,
} from '../config/database.js'
import { createCalendar } from '../services/calendarService.js'

async function seedSampleCalendar() {
  await connectToDatabase()

  const existing = await CalendarModel.findOne({
    name: 'Sample Flex Calendar',
  })
    .lean()
    .exec()
  if (existing) {
    console.log('Sample calendar already exists, skipping seeding.')
    await disconnectFromDatabase()
    return
  }

  await createCalendar({
    name: 'Sample Flex Calendar',
    presetKey: 'sample-flex',
    startDate: new Date().toISOString(),
    includeWeekends: false,
    includeExceptions: false,
    layers: [
      {
        key: 'reference',
        name: 'Reference Layer',
        color: '#2563eb',
        chainBehavior: 'linked',
        kind: 'standard',
        templateConfig: {
          mode: 'generated',
          itemCount: 170,
          titlePattern: 'Reference {n}',
        },
      },
      {
        key: 'progress-a',
        name: 'Progress A',
        color: '#059669',
        chainBehavior: 'linked',
        kind: 'standard',
        templateConfig: {
          mode: 'generated',
          itemCount: 170,
          titlePattern: 'Progress {n}',
        },
      },
      {
        key: 'exceptions',
        name: 'Exceptions',
        color: '#ca8a04',
        chainBehavior: 'independent',
        kind: 'exception',
        templateConfig: { mode: 'manual' },
      },
    ],
  })

  console.log('Seeded sample calendar data.')

  await disconnectFromDatabase()
}

seedSampleCalendar().catch(async (error) => {
  console.error('Failed to seed sample calendar', error)
  await disconnectFromDatabase()
  process.exit(1)
})

