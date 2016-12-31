import Vue from 'vue'
import Vuex from 'vuex'
import mutations from './mutations.js'
Vue.use(Vuex)

const state = {
        chatSession: [{
            name: '测试呵呵',
            photo: './assets/icon.jpg',
            uerid: '123',
            type: 'P',
            tId: 'P-123',
            isOn: false,
            msg: {
                "senderid": "48726",
                "msgtype": "text",
                "content": "holy shit！",
                "msgId": "48726_1482975420008",
                "operation": "sendmsg",
                "recevierid": "1038667",
                sendtime: "2016-12-30 22:06"
            }
        }, {
            name: '测试2',
            photo: './assets/icon.jpg',
            uerid: '32',
            type: 'P',
            tId: 'P-32',
            isOn: false,
            msg: {
                "senderid": "48726",
                "msgtype": "text",
                "content": "holy shit！",
                "msgId": "48726_1482975420008",
                "operation": "sendmsg",
                "recevierid": "1038667",
                sendtime: "2016-12-30 22:06"
            }
        }, {
            name: 'sger',
            photo: './assets/icon.jpg',
            uerid: '33',
            type: 'P',
            tId: 'P-33',
            isOn: false,
            msg: {
                "senderid": "48726",
                "msgtype": "text",
                "content": "holy shit！",
                "msgId": "48726_1482975420008",
                "operation": "sendmsg",
                "recevierid": "1038667",
                sendtime: "2016-12-30 22:06"
            }
        }, ],
        isChat: false,
        chatStore: {
            'P-123': [{
                "recevierid": 48726,
                "senderid": 1087329,
                "msgId": "1087329_1482404924223",
                "sendtime": "2016-12-22 19:08:44",
                "operation": "sendmsg",
                "msgtype": "text",
                "content": "[傻笑][害羞]",
                "msgSeq": "888799"
            }, {
                "recevierid": 48726,
                "senderid": 1087329,
                "filepath": "http://uat-wolianw-im.oss-cn-hangzhou.aliyuncs.com/1_1/2_1/3_28/4_37/1087329_1482404511380_2155_imPicWH78x78.gif",
                "msgId": "1087329_1482404511233",
                "sendtime": "2016-12-22 19:01:52",
                "operation": "sendmsg",
                "msgtype": "image",
                "content": "[图片]",
                "msgSeq": "888796"
            }, {
                "recevierid": 48726,
                "senderid": 1087329,
                "msgId": "1087329_1482404493623",
                "sendtime": "2016-12-22 19:01:33",
                "operation": "sendmsg",
                "msgtype": "text",
                "content": "记得",
                "msgSeq": "888795"
            }]
        },
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
    }
}
export default new Vuex.Store({
    state,
    mutations,
    actions,
})