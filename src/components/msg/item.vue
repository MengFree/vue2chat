<template>
    <div class="chat_item" :class="{active:user.isOn}" :title="user.name">
        <div class="avatar"><img src="http://goodsimg.wolianw.com/upload/group/20160514153920xiepmd.jpg" class="img" onerror="this.src=indexImg;"></div>
        <div class="ext">
            <p class="attr">22:50</p>
        </div>
        <div class="info">
            <h3 class="nickname"><span class="nickname_text ">{{user.name}}</span></h3>
            <p class="msg"><span class="atMe">[有人@我]</span><span>【链接】</span></p>
        </div>
    </div>
</template>

<script>
    import {
        mapState
    } from 'vuex'
    export default {
        name: 'item',
        props: ['user'],
        data() {
            return {
                // user: {
                //     name: '测试呵呵',
                //     photo: './assets/icon.jpg',
                //     userid: '123',
                //     type: 'P',
                //     tId: 'p-123'
                // },
                msg: {

                }
            }
        }
    }
</script>