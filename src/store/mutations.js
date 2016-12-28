const mutations = {
    ADD(state, newNote) {
        state.timeEntries.push(newNote)
        state.totalTime += newNote.totalTime
    },
    DEL(state, Note) {
        let index = state.timeEntries.indexOf(Note)
        state.timeEntries.splice(index, 1)

        state.totalTime -= Note.totalTime
    }
}
export default mutations