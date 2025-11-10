import { createRouter, createWebHistory } from 'vue-router'
import CalendarDashboardView from '@/features/calendar/views/CalendarDashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'calendar-dashboard',
      component: CalendarDashboardView,
    },
  ],
})

export default router
