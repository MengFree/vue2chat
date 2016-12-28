<template>
  
<div style="height:100%;">
<!--中间列表-->
<session></session>
<!--END panel-->
<!--BEGIN chat-->
<div id='chat' style="height:100%;">
  
<!--BEGIN box-->
<box></box>
<!--END chat-->
</div>
</template>

<script>
    import {
        mapState
    } from 'vuex'
    import session from './session.vue'
    import box from './box.vue'
    export default {
        name: 'msg',
        components: {
            'session': session,
            'box': box
        },
        data() {
            return {
                
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