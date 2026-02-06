import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider } from './contexts/UserContext'
import { UserLayout } from './layouts/UserLayout'
import { AuthLayout } from './layouts/AuthLayout'
import DashboardPage from './pages/dashboard'
import LoginPage from './pages/login'
import SignUpPage from './pages/signup'
import WordsPage from './pages/words'
import WordPairsPage from './pages/word-pairs'
import RandomPhrasePage from './pages/random-phrase'
import FlashcardsPage from './pages/flashcards'
import FavoritesPage from './pages/favorites'

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <Routes>
          {/* Auth routes with /auth prefix */}
          <Route path="/auth" element={<AuthLayout />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignUpPage />} />
          </Route>

          {/* Dashboard routes at root */}
          <Route element={<UserLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/words" element={<WordsPage />} />
            <Route path="/word-pairs" element={<WordPairsPage />} />
            <Route path="/flashcards" element={<FlashcardsPage />} />
            <Route path="/random-phrase" element={<RandomPhrasePage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </UserProvider>
    </BrowserRouter>
  )
}

export default App
