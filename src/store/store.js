import Vue from 'vue'
import Vuex from 'vuex'
import mutations from './mutations.js'
Vue.use(Vuex)
let msgs = localStorage.getItem('msg');
if (!msgs) {
    msgs = {}
} else {
    msgs = JSON.parse(msgs);
}
const state = {
        chatSession: [{
            name: '测试呵呵',
            photo: './assets/icon.jpg',
            uerid: '2484',
            type: 'P',
            tId: 'P-2484',
            isOn: false,
            msg: {}
        }, {
            name: '测试2',
            photo: './assets/icon.jpg',
            uerid: '32',
            type: 'P',
            tId: 'P-32',
            isOn: false,
            msg: {}
        }, {
            name: 'sger',
            photo: './assets/icon.jpg',
            uerid: '33',
            type: 'P',
            tId: 'P-33',
            isOn: false,
            msg: {}
        }, ],
        isChat: false,
        chatStore: msgs,
        chatNow: [],
        timeEntries: [],
        MY: {
            name: '二哲',
            uerid: '48726',
            photo: 'https://sfault-avatar.b0.upaiyun.com/888/223/888223038-5646dbc28d530_huge256'
        },
        totalTime: 0
    }
    // const mutations = {
    //     ADD(state, newNote) {
    //         state.timeEntries.push(newNote)
    //         state.totalTime += newNote.totalTime
    //     },
    //     DEL(state, Note) {
    //         let index = state.timeEntries.indexOf(Note)
    //         state.timeEntries.splice(index, 1)
    //             // state.timeEntries.$remove(Note)

//         state.totalTime -= Note.totalTime
//     }
// }
const actions = {
    add({ commit, state }, newNote) {
        commit('ADD', newNote)
    },
    del({ commit, state }, index) {
        commit('DEL', index)
    },
    clickSession({ commit, state }, session) {
        commit('CHATITEM', session)
    },
    saveMsg({ commit, state }, msg) {
        commit('SAVEMSG', msg)
    },

}
export default new Vuex.Store({
    state,
    mutations,
    actions,
})