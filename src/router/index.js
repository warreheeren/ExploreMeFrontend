import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import HomeView from '@/views/HomeView.vue'
import ProfileView from '@/views/ProfileView.vue'
import SettingsView from '@/views/SettingsView.vue'
import TripsView from '@/views/TripsView.vue'
import TripDetailView from '@/views/TripDetailView.vue'
import CreateTripView from '@/views/CreateTripView.vue'
import MessagesView from '@/views/MessagesView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { requiresAuth: true } },
  { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } },
  { path: '/register', name: 'register', component: RegisterView, meta: { guestOnly: true } },
  { path: '/u/:username', name: 'profile', component: ProfileView, meta: { requiresAuth: true } },
  { path: '/settings', name: 'settings', component: SettingsView, meta: { requiresAuth: true } },
  { path: '/trips', name: 'trips', component: TripsView, meta: { requiresAuth: true } },
  { path: '/trips/new', name: 'trip-create', component: CreateTripView, meta: { requiresAuth: true } },
  { path: '/trips/:id/edit', name: 'trip-edit', component: CreateTripView, meta: { requiresAuth: true } },
  { path: '/trips/:id', name: 'trip-detail', component: TripDetailView, meta: { requiresAuth: true } },
  { path: '/messages', name: 'messages', component: MessagesView, meta: { requiresAuth: true } },
  { path: '/messages/:userName', name: 'message-thread', component: MessagesView, meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'home' }
  }

  return true
})

export default router
