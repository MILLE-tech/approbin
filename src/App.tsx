import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'

import SubjectsPage from './pages/Fiches/SubjectsPage'
import ChaptersPage from './pages/Fiches/ChaptersPage'
import SheetsPage from './pages/Fiches/SheetsPage'
import SheetDetailPage from './pages/Fiches/SheetDetailPage'

import QuestionsHome from './pages/Questions/QuestionsHome'
import CreateQuestionsSubjects from './pages/Questions/CreateQuestionsSubjects'
import CreateQuestionsChapters from './pages/Questions/CreateQuestionsChapters'
import CreateQuestionsManager from './pages/Questions/CreateQuestionsManager'
import QuizSelection from './pages/Questions/QuizSelection'
import QuizSession from './pages/Questions/QuizSession'

import StatsPage from './pages/Stats/StatsPage'
import CalendarPage from './pages/Calendar/CalendarPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/fiches" replace />} />

        <Route path="/fiches" element={<SubjectsPage />} />
        <Route path="/fiches/:subjectId" element={<ChaptersPage />} />
        <Route path="/fiches/:subjectId/:chapterId" element={<SheetsPage />} />
        <Route path="/fiches/:subjectId/:chapterId/:sheetId" element={<SheetDetailPage />} />

        <Route path="/questions" element={<QuestionsHome />} />
        <Route path="/questions/creer" element={<CreateQuestionsSubjects />} />
        <Route path="/questions/creer/:subjectId" element={<CreateQuestionsChapters />} />
        <Route path="/questions/creer/:subjectId/:chapterId" element={<CreateQuestionsManager />} />
        <Route path="/questions/quizz" element={<QuizSelection />} />
        <Route path="/questions/quizz/session" element={<QuizSession />} />

        <Route path="/statistiques" element={<StatsPage />} />
        <Route path="/calendrier" element={<CalendarPage />} />
        <Route path="/parametres" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
