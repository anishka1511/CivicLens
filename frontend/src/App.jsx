import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'

const Home = React.lazy(() => import('./pages/Home'))
const Timeline = React.lazy(() => import('./pages/Timeline'))
const Quiz = React.lazy(() => import('./pages/Quiz'))
const Chat = React.lazy(() => import('./pages/Chat'))

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  )
}

export default App