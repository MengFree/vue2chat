<template>
  
<div style="height:100%;">
<!--中间列表-->
<sessionMsg></sessionMsg>
<!--END panel-->
<!--BEGIN chat-->
<div id='chat' style="height:100%;">
  
<!--BEGIN chatBox-->
<chatBox></chatBox>
<!--END chat-->
</div>
</template>

<script>
    import {
        mapState
    } from 'vuex'
    import sessionMsg from './sessionMsg.vue'
    import chatBox from './chatBox.vue'
    export default {
        name: 'msg',
        components: {
            'sessionMsg': sessionMsg,
            'chatBox': chatBox
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

<style>
    #app {
        font-family: 'Avenir', Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-align: center;
        color: #2c3e50;
        margin-top: 60px;
    }
</style>