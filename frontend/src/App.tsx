import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import ParkingDetails from './pages/ParkingDetails';
import BookingConfirm from './pages/BookingConfirm';
import Bookings from './pages/Bookings';
import MyParkings from './pages/MyParkings';
import OwnerDashboard from './pages/OwnerDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parking/:id"
            element={
              <ProtectedRoute>
                <ParkingDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking/confirm/:id"
            element={
              <ProtectedRoute>
                <BookingConfirm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <Bookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-parkings"
            element={
              <ProtectedRoute>
                <MyParkings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '10px',
            },
            success: {
              iconTheme: { primary: '#16a34a', secondary: '#fff' },
            },
            error: {
              duration: 5000,
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}