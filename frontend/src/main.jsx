import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import './index.css';
import AdminPage from './pages/AdminPage.jsx';
import DisplayPage from './pages/DisplayPage.jsx';
import PatientPage from './pages/PatientPage.jsx';

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/admin" replace /> },
  { path: '/admin', element: <AdminPage /> },
  { path: '/display', element: <DisplayPage /> },
  { path: '/patient/:tokenId', element: <PatientPage /> }
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
