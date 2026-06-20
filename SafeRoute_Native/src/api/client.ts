import axios from 'axios';
import auth from '@react-native-firebase/auth';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://20.40.61.11:8000';

// Create base API client pointing to the v1 API
export const apiClient = axios.create({
  baseURL: `${BACKEND_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to inject the Firebase JWT Bearer token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const currentUser = auth().currentUser;
      if (currentUser) {
        // Fetch the active ID token from Firebase
        const token = await currentUser.getIdToken(false);
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.warn('Failed to attach Firebase JWT to request', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
