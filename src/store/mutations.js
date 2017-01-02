const mutations = {
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
                state.isChat = state.chatSession[i];
            } else {
                state.chatSession[i].isOn = false;
            }
        }
        if (!state.chatStore[session.tId]) {
            state.chatStore[session.tId] = [];
        }
        let msgs = state.chatStore[session.tId]
        state.isChat = session;
        state.chatNow = msgs;
    },
    SAVEMSG(state, msg) {
        state.chatNow.push(msg);
        localStorage.setItem('msg', JSON.stringify(state.chatStore));
        state.isChat['msg'] = msg;
        $("#Msg").focus();
    },
}
export default mutations