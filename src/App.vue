<template>
  <div class="main"  id="app">
    <div class="main_inner">
    <!--BEGIN panel-->
    <div class="panel_menu">
        <div class="header">
            <div class="img_box">
                <div class="avatar" id="myself">
                    <img src="./assets/img/icon.jpg" class="img">
                </div>
            </div>
            <h3 class="user_name">
                我了个大草sssss
            </h3>
        </div>
        <ul class="menu" id="menu">
            <router-link tag="li" to='/msg' class="menu_list">
              <div class="avatar woxin_nav_message"></div>
                  <span class="info">
                      好友消息<span id="msg_num"></span>
                  </span>
            </router-link>
            <router-link tag="li" to='/contact' class="menu_list">
              <div class="avatar icon_contact"></div>
                <span class="info">
                      通讯录 <span id="cont_num"></span>
                  </span>
            </router-link>
            <router-link tag="li" to='/order' class="menu_list">
              <div class="avatar icon_order"></div>
              <span class="info">
                  订单通知<span id="order_num"></span>
              </span>
            </router-link>
            <li class="menu_list" data-href="#contact" id="menu_contact">
                <div class="avatar icon_contact"></div>
                        <span class="info">
                            通讯录 <span id="cont_num"></span>
                        </span>
            </li>
            <li class="menu_list"  data-href="#system" id="menu_system">
                <div class="avatar icon_system"></div>
                        <span class="info">
                            系统通知<span id="sys_num"></span>
                        </span>
            </li>
            <li class="menu_list" data-href="#order" id="menu_order">
                <div class="avatar icon_order"></div>
                        <span class="info">
                            订单通知<span id="order_num"></span>
                        </span>
            </li>
            <li class="menu_list" data-href="setting" style="position: relative;">
                <div class="avatar icon_setting"></div>
                        <span class="info">
                            我信设置
                        </span>
                <div class="mmpop setting" id="setting">
                    <a href="javascript:;" class="setting_item" id="launch">发起聊天</a>
                    <a href="javascript:;" class="setting_item" id="msgSet">信息设置</a>
                    <a href="javascript:;" class="setting_item" id="block">通讯录黑名单</a>
                    <a href="javascript:;" class="setting_item" id="ring">关闭声音</a>
                    <a href="javascript:;" class="setting_item" id="logout">退出登录</a>
                </div>
            </li>
            <!--设置弹窗-->
        </ul>
    </div>
    <router-view></router-view>
</template>

<script>
    import {
        mapState
    } from 'vuex'
    import siderMenu from './components/siderMenu.vue'
    // import msg from './components/msg.vue'
    // import chatBox from './components/chatBox.vue'
    export default {
        name: 'app',
        components: {
            'siderMenu': siderMenu,
            // 'msg': msg,
            // 'chatBox': chatBox
        },
        data() {
            return {
                totalTime: 1
            }
        },
        computed: mapState({
            totalTime: state => state.totalTime
        }),
        methods: {
            timeUpdate(timeEntry) {
                this.totalTime += parseFloat(timeEntry.totalTime)
            },
            deleteTime(timeEntry) {
                this.totalTime -= parseFloat(timeEntry.totalTime)
            }
        }
    }
</script>