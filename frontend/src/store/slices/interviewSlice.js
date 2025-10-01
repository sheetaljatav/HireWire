import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  activeInterviewId: null,
  candidateId: null,
  questions: [],
  answers: {}, // questionId -> { text, timestamp }
  remainingMs: null,
  lastSavedAt: null,
  status: 'idle', // idle | in_progress | submitted
}

const interviewSlice = createSlice({
  name: 'interview',
  initialState,
  reducers: {
    hydrateFromServer(state, action) {
      Object.assign(state, action.payload)
    },
    startInterview(state, action) {
      const { interviewId, candidateId, questions, durationMs } = action.payload
      state.activeInterviewId = interviewId
      state.candidateId = candidateId
      state.questions = questions
      state.remainingMs = durationMs
      state.status = 'in_progress'
      state.lastSavedAt = Date.now()
    },
    recordAnswer(state, action) {
      const { questionId, text } = action.payload
      state.answers[questionId] = { text, timestamp: Date.now() }
      state.lastSavedAt = Date.now()
    },
    tick(state, action) {
      const delta = action.payload || 1000
      if (state.remainingMs !== null && state.status === 'in_progress') {
        state.remainingMs = Math.max(0, state.remainingMs - delta)
      }
    },
    submit(state) {
      state.status = 'submitted'
    },
    resetInterview() {
      return { ...initialState }
    },
  },
})

export const {
  hydrateFromServer,
  startInterview,
  recordAnswer,
  tick,
  submit,
  resetInterview,
} = interviewSlice.actions

export default interviewSlice.reducer



