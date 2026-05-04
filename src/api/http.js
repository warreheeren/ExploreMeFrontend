import axios from 'axios'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL/api
})

// Token automatisch toevoegen aan elke request
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Bij 401 automatisch uitloggen
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('userName')
      localStorage.removeItem('displayName')
      localStorage.removeItem('profilePhotoUrl')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default http
