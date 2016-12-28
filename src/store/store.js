import Vue from 'vue'
import Vuex from 'vuex'
import mutations from './mutations.js'
Vue.use(Vuex)

const state = {
        timeEntries: [],
        user: {
            name: '二哲',
            uerid: 'kodo@forchange.cn',
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
}
export default new Vuex.Store({
    state,
    mutations,
    actions,
})