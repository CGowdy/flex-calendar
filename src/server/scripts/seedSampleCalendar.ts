import { CalendarModel } from '../models/calendarModel.js'
import {
  connectToDatabase,
  disconnectFromDatabase,
} from '../config/database.js'
import { createCalendar } from '../services/calendarService.js'

async function seedSampleCalendar() {
  await connectToDatabase()

  const existing = await CalendarModel.findOne({
    name: 'Sample Abeka Calendar',
  })
    .lean()
    .exec()
  if (existing) {
    console.log('Sample calendar already exists, skipping seeding.')
    await disconnectFromDatabase()
    return
  }

  await createCalendar({
    name: 'Sample Abeka Calendar',
    source: 'abeka',
    startDate: new Date().toISOString(),
    totalDays: 170,
    includeWeekends: false,
    includeHolidays: false,
    groupings: [
      {
        key: 'abeka',
        name: 'Abeka',
        color: '#2563eb',
        autoShift: true,
      },
      {
        key: 'student-a',
        name: 'Student A',
        color: '#059669',
        autoShift: true,
      },
      {
        key: 'student-b',
        name: 'Student B',
        color: '#7c3aed',
        autoShift: true,
      },
      {
        key: 'holidays',
        name: 'Holidays',
        color: '#ca8a04',
        autoShift: false,
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

