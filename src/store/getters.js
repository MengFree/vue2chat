const getters = {
    ADD(state, newNote) {
        state.timeEntries.push(newNote)
        state.totalTime += newNote.totalTime
    },
    DEL(state, Note) {
        let index = state.timeEntries.indexOf(Note)
        state.timeEntries.splice(index, 1)

        state.totalTime -= Note.totalTime
    },
    CHATITEM(state, session) {
        let index = state.chatSession.indexOf(session)
        for (var i = 0; i < state.chatSession.length; i++) {
            if (i == index) {
                state.chatSession[i].isOn = true;
            } else {
                state.chatSession[i].isOn = false;
            }
        }
    },
}
export default getters