export type ReviewStatus = 'nouveau' | 'reussi' | 'apprentissage' | 'echec'
export type QuizResult = 'reussi' | 'apprentissage' | 'echec'
export type SheetSourceType = 'manual' | 'import'

export interface Subject {
  id: string
  user_id: string
  name: string
  position: number
  created_at: string
}

export interface Chapter {
  id: string
  subject_id: string
  user_id: string
  name: string
  position: number
  created_at: string
}

export interface Sheet {
  id: string
  chapter_id: string
  user_id: string
  title: string
  content: string | null
  source_type: SheetSourceType
  file_path: string | null
  file_name: string | null
  file_mime: string | null
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  chapter_id: string
  user_id: string
  question: string
  answer: string
  created_at: string
}

export interface QuestionReview {
  id: string
  question_id: string
  user_id: string
  status: ReviewStatus
  success_streak: number
  next_review_at: string
  last_reviewed_at: string | null
}

export interface QuizAnswer {
  id: string
  question_id: string
  chapter_id: string
  subject_id: string
  user_id: string
  result: QuizResult
  answered_at: string
}

export interface QuestionWithReview extends Question {
  review: QuestionReview | null
}
