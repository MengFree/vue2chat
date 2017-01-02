<template>
  <div class="panel_list" id="panel_list">
    <!--BEGIN search-->
    <div id="search_bar" class="search_bar">
        <input type="text" placeholder="搜索联系人、群组" class="frm_search" id="search_text">
        <i id="search_icon" class="search_bar_search"></i>
    </div>
    <!--END search-->
    <!--BEGIN chatList-->
    <div id="searchList" class="listPanle hide">
        <!--BEGIN nav view-->
        <div class="nav_view scroll">
            <div class="search_list">

            </div>
        </div>
        <!--END nav view-->
    </div>
    <!--END chatList-->

    <!--BEGIN chatList-->
    <div id="chatList" class="listPanle">
        <!--BEGIN nav view-->
        <div class="nav_view scroll">
            <div class="chat_list">
                <item v-for="user in chatList" :user="user" :key="user.tId" :msg="user.msg"></item>
                </div>
            </div>
        </div>
        <!--END nav view-->
    </div>
    <!--END chatList-->
</div>
</template>

<script>
    import {
        mapState
    } from 'vuex'
    import item from './item.vue'
    export default {
        name: 'sessionMsg',
        components: {
            'item': item
        },
        data() {
            return {
                
            }
        },
        computed: mapState({
            chatList: state => state.chatSession
        }),
        methods: {
            deleteTime(timeEntry) {
                this.totalTime -= parseFloat(timeEntry.totalTime)
            }
        }
    }
</script>