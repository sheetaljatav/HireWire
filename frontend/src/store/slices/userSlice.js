import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  id: null,
  role: 'candidate', // candidate | interviewer | admin
  name: null,
  email: null,
  token: null,
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser(state, action) {
      Object.assign(state, action.payload)
    },
    clearUser() {
      return { ...initialState }
    },
  },
})

export const { setUser, clearUser } = userSlice.actions
export default userSlice.reducer



