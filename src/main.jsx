import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import Auth from './components/Auth/Auth'
import './index.css'
import App from './App.jsx'
import FilePage from './components/File/FilePage/FilePage.jsx'
import TestPage from './components/TestPage/TestPage'
import ContextAlgo from './components/Testing/context_algo.jsx'
import QuickNotePage from './components/QuickNotePage/QuickNotePage.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />
          <Route path="/" element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          }>
            <Route index element={<div>Select a neural file to get started</div>} />
            <Route path="note/:noteId" element={<FilePage />} />
            <Route path="neuralfile/:neuralFileId" element={<FilePage />} />
            <Route path="neuralfile/:neuralFileId/note/:noteId" element={<FilePage />} />
            <Route path="file/:neuralFileId" element={<FilePage />} />
            <Route path="file/:neuralFileId/note/:noteId" element={<FilePage />} />
            <Route path="test/:fileId" element={<TestPage />} />
            <Route path="context/:fileId" element={<ContextAlgo />} />
            <Route path="quick-notes/today" element={<QuickNotePage/>}/>
            <Route path="quick-notes/:date" element={<QuickNotePage/>}/>
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  </React.StrictMode>
)