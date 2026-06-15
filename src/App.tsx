import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import RouteList from './pages/RouteList'
import RouteDetail from './pages/RouteDetail'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/routes/:type" element={<RouteList />} />
        <Route path="/routes/:type/:id" element={<RouteDetail />} />
      </Routes>
    </div>
  )
}
