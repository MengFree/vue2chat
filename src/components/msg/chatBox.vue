<template>
<div class="box chat" id="chatBox">
    <div class="box_hd">
        <div class="mmpop members_wrp slide-down" id="chat_members">
            <div class="members">
                <div style="position: relative" class="members_inner scroll" id="members_inner">

                </div>
                <a href="javascript:;" class="btn" id="member_btn">删除并退出群组</a>
            </div>
        </div>
        <div class="title_wrap">
            <div class="title poi"  style="display: none">
                <a class="title_name"></a>
                <span></span>
                <i class="web_wechat_down_icon"></i>
            </div>
        </div>
    </div>
    <div class="box_bd scroll">
        <div class="message_empty">
            <i class="web_wechat_nomes_icon"></i>
            <p>未选择聊天</p>
        </div>
    </div>
    <div class="box_ft" style="display: none;">
        <div id="tool_bar" class="toolbar">
            <a title="表情" href="javascript:;" class="chat_face"></a>
            <a title="图片和文件" href="javascript:;" class="chat_file" id="chatFile">
            <a title="发送名片" href="javascript:;" class="chat_card" id="chatCard">
            </a>
            <!--emoji表情窗口-->
            <div id="mmpop_emoji_panel" class="mmpop emojiFace">
                <div class="expression">
                    <div class="emoji_face scroll">

                    </div>
                </div>
            </div>
            <!--@成员表情窗口-->
            <div id="atPanel" class="mmpop contact_box">
                <div class="launch_hd">
                    <span>群组成员</span><div class="close" id="close_at" title="点击关闭"><i class="close_icon"></i></div>
                </div>
                <div class="search_bar">
                    <input type="text" id="atPanel_text" placeholder="搜索" class="frm_search">
                    <i class="search_bar_search " id="atPanel_search"></i>
                </div>
                <div id="atPanel_list" class="scroll">

                </div>
            </div>
        </div>
        <div class="content">
            <textarea class="editArea" id="Msg"></textarea>
        </div>
        <div class="action">
            <span class="desc">按下Ctrl+Enter换行,Enter发送</span>
            <a href="javascript:;" class="btn btn_send" id="btn_send">发送</a>
        </div>
    </div>
</div>
<!--END chatBox-->
</div>
</template>

<script>
    import {
        mapState
    } from 'vuex'
    export default {
        data() {
            return {
                totalTime: 1
            }
        },
    }
</script>