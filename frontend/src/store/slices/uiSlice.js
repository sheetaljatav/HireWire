import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  showWelcomeBack: false,
  theme: 'light',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setWelcomeBack(state, action) {
      state.showWelcomeBack = action.payload
    },
    setTheme(state, action) {
      state.theme = action.payload
    },
  },
})

export const { setWelcomeBack, setTheme } = uiSlice.actions
export default uiSlice.reducer



