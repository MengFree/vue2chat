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
                <item v-for="user in list" :user="user" :key="user.tId"></item>
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
                list: [{
                    name: '测试呵呵',
                    photo: './assets/icon.jpg',
                    uerid: '123',
                    type: 'P',
                    tId: 'p-123',
                    isOn: true
                }, {
                    name: '测试2',
                    photo: './assets/icon.jpg',
                    uerid: '32',
                    type: 'P',
                    tId: 'p-32',
                    isOn: false
                }, {
                    name: 'sger',
                    photo: './assets/icon.jpg',
                    uerid: '33',
                    type: 'P',
                    tId: 'p-33',
                    isOn: false
                }, ]
            }
        }
    }
</script>