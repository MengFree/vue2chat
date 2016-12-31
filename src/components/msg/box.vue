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
            <div class="title poi" v-show="userChat">
                <a class="title_name">{{userChat.name}}</a>
                <span></span>
                <i class="web_wechat_down_icon"></i>
            </div>
        </div>
    </div>
    <div class="box_bd scroll">
        <div class="message_empty" v-show="!userChat">
            <i class="web_wechat_nomes_icon"></i>
            <p>未选择聊天</p>
        </div>
        <div class="message" :class=" msgWho(msg)" v-for="msg in msgs">
            <p class="message_system"><span class="content">{{msg.sendtime}}</span></p><img class="avatar" src="http://uat-wolianw-goods.img-cn-qingdao.aliyuncs.com/shops/1_1/2_1/3_2/4_44/48726_1482390665055_8200.jpg" data-id="P-48726" onerror="this.src=indexImg;">
            <div class="content">
                <p class="name"></p>
                <div class="bubble bubble_primary right MT-text" data-id="48726_1482802700930" data-seq="927050">
                    <div class="bubble_cont" v-html="content(msg.content)"> </div>
                </div>
            </div>
        </div>
    </div>
    <div class="box_ft" v-show="userChat">
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
            <textarea class="editArea" id="Msg" v-model="newMsg"></textarea>
        </div>
        <div class="action">
            <span class="desc">按下Ctrl+Enter换行,Enter发送</span>
            <a href="javascript:;" class="btn btn_send" id="btn_send" @click="sendMsg">发送</a>
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
        filters: {

        },
        computed: mapState({
            userChat: state => state.isChat,
            MY: state => state.MY,
        }),
        methods: {
            sendMsg() {
                let msg = this.newMsg;
                if (msg == '') {
                    return;
                }
                console.log(msg);
                this.newMsg = ''
            },
            msgWho(msg) {
                if (msg.senderid == this.MY.userid) {
                    return {
                        me: true
                    }
                } else if (this.userChat.senderid == this.MY.userid) {
                    return {
                        you: true
                    }
                }
            },
            content(cont) {
                if (cont == '' || !cont) {
                    return '';
                }
                cont = cont.replace(/\n/g, '<br />');
                let content = cont.replace(/\[([^\[\]]*)\]/g, function(code) {
                    let inner = '';
                    for (let i = 0; i < emojiFace.length; i++) {
                        if (emojiFace[i].code == code) {
                            inner = '<img  class="emoji woxinFace_' + emojiFace[i].key + '">';
                        }
                    }
                    if (inner == '') {
                        for (let i = 0; i < emojiOld.length; i++) {
                            if (emojiOld[i].code == code) {
                                inner = '<img  class="old_emoji old_woxinFace_' + emojiOld[i].key + '">';
                            }
                        }
                    }
                    return inner == '' ? code : inner;
                });
                return '<span>' + content + '</span';
            }
        },
        data() {
            return {
                msgs: [],
                newMsg: ''
            }
        }
    }
    //排序版
    var emojiFace = [{
        "code": "[微笑]",
        "key": "wf_smile"
    }, {
        "code": "[呲牙]",
        "key": "grin"
    }, {
        "code": "[傻笑]",
        "key": "wf_giggle"
    }, {
        "code": "[可爱]",
        "key": "blush"
    }, {
        "code": "[可怜]",
        "key": "wf_pitiful"
    }, {
        "code": "[委屈]",
        "key": "wf_wronged"
    }, {
        "code": "[撇嘴]",
        "key": "wf_curl_lip"
    }, {
        "code": "[抠鼻]",
        "key": "wf_pick_nose"
    }, {
        "code": "[惊讶]",
        "key": "wf_amazed"
    }, {
        "code": "[惊悚]",
        "key": "scream"
    }, {
        "code": "[惊呆]",
        "key": "flushed"
    }, {
        "code": "[害羞]",
        "key": "shy"
    }, {
        "code": "[鄙视]",
        "key": "fu"
    }, {
        "code": "[闭嘴]",
        "key": "wf_shutup"
    }, {
        "code": "[亲亲]",
        "key": "wf_kissing"
    }, {
        "code": "[白眼]",
        "key": "wf_rolling_eyes"
    }, {
        "code": "[嘘]",
        "key": "wf_hush"
    }, {
        "code": "[衰]",
        "key": "wf_unlucky"
    }, {
        "code": "[吐]",
        "key": "wf_vomit"
    }, {
        "code": "[色]",
        "key": "heart_eyes"
    }, {
        "code": "[哈欠]",
        "key": "wf_yawn"
    }, {
        "code": "[生气]",
        "key": "angry"
    }, {
        "code": "[发怒]",
        "key": "wf_rage"
    }, {
        "code": "[难过]",
        "key": "wf_grieved"
    }, {
        "code": "[抓狂]",
        "key": "confounded"
    }, {
        "code": "[疑问]",
        "key": "wf_query"
    }, {
        "code": "[困]",
        "key": "wf_tired"
    }, {
        "code": "[睡觉]",
        "key": "sleeping"
    }, {
        "code": "[叹气]",
        "key": "wf_sigh"
    }, {
        "code": "[左哼哼]",
        "key": "wf_left_hum"
    }, {
        "code": "[右哼哼]",
        "key": "wf_right_hum"
    }, {
        "code": "[鼓掌]",
        "key": "clap"
    }, {
        "code": "[晕]",
        "key": "dizzy_face"
    }, {
        "code": "[流泪]",
        "key": "wf_tears"
    }, {
        "code": "[大哭]",
        "key": "sob"
    }, {
        "code": "[流汗]",
        "key": "wf_sweat"
    }, {
        "code": "[黑线]",
        "key": "wf_black_line"
    }, {
        "code": "[饥饿]",
        "key": "wf_hunger"
    }, {
        "code": "[再见]",
        "key": "wf_bye"
    }, {
        "code": "[阴险]",
        "key": "wf_jesuitry"
    }, {
        "code": "[调皮]",
        "key": "wf_naughty"
    }, {
        "code": "[飞吻]",
        "key": "kissing_heart"
    }, {
        "code": "[开心]",
        "key": "wf_happy"
    }, {
        "code": "[斜眼]",
        "key": "wf_tropia"
    }, {
        "code": "[大笑]",
        "key": "wf_laughing"
    }, {
        "code": "[偷笑]",
        "key": "wf_titter"
    }, {
        "code": "[财迷]",
        "key": "wf_miser"
    }, {
        "code": "[奋斗]",
        "key": "wf_struggle"
    }, {
        "code": "[尴尬]",
        "key": "disappointed_relieved"
    }, {
        "code": "[傲慢]",
        "key": "wf_arrogance"
    }, {
        "code": "[咒骂]",
        "key": "wf_curse"
    }, {
        "code": "[敲打]",
        "key": "wf_beat"
    }, {
        "code": "[石化]",
        "key": "wf_petrifaction"
    }, {
        "code": "[耍酷]",
        "key": "wf_cool"
    }, {
        "code": "[失望]",
        "key": "wf_disappointment"
    }, {
        "code": "[思考]",
        "key": "wf_reflect"
    }, {
        "code": "[生病]",
        "key": "wf_ill"
    }, {
        "code": "[爽]",
        "key": "wf_invigorating"
    }, {
        "code": "[得意]",
        "key": "wf_proud"
    }, {
        "code": "[口罩]",
        "key": "wf_mask"
    }, {
        "code": "[强]",
        "key": "wf_strong"
    }, {
        "code": "[弱]",
        "key": "wf_weak"
    }, {
        "code": "[握手]",
        "key": "wf_handshake"
    }, {
        "code": "[OK]",
        "key": "wf_ok"
    }, {
        "code": "[耶]",
        "key": "wf_victory"
    }, {
        "code": "[no]",
        "key": "wf_no"
    }, {
        "code": "[拳头]",
        "key": "punch"
    }, {
        "code": "[来]",
        "key": "wf_come"
    }, {
        "code": "[炸弹]",
        "key": "wf_bomb"
    }, {
        "code": "[猪头]",
        "key": "wf_pig"
    }, {
        "code": "[红心]",
        "key": "heart"
    }, {
        "code": "[心碎]",
        "key": "broken_heart"
    }, {
        "code": "[威武]",
        "key": "wf_force"
    }, {
        "code": "[礼物]",
        "key": "gift"
    }, {
        "code": "[蛋糕]",
        "key": "wf_cake"
    }, {
        "code": "[夜晚]",
        "key": "wf_night"
    }, {
        "code": "[太阳]",
        "key": "wf_sunny"
    }, {
        "code": "[玫瑰]",
        "key": "rose"
    }, {
        "code": "[啤酒]",
        "key": "wf_beer"
    }, {
        "code": "[马到成功]",
        "key": "d_madaochenggong"
    }]

    //旧表情
    var emojiOld = [{
        "code": "[哈哈]",
        "key": "smile"
    }, {
        "code": "[笑脸]",
        "key": "grinning"
    }, {
        "code": "[呲牙]",
        "key": "grin"
    }, {
        "code": "[可爱]",
        "key": "blush"
    }, {
        "code": "[害羞]",
        "key": "shy"
    }, {
        "code": "[媚眼]",
        "key": "wink"
    }, {
        "code": "[色]",
        "key": "heart_eyes"
    }, {
        "code": "[飞吻]",
        "key": "kissing_heart"
    }, {
        "code": "[亲亲]",
        "key": "kissing_closed_eyes"
    }, {
        "code": "[惊呆]",
        "key": "flushed"
    }, {
        "code": "[悠闲]",
        "key": "relieved"
    }, {
        "code": "[鬼脸]",
        "key": "stuck_out_tongue_winking_eye"
    }, {
        "code": "[吐舌头]",
        "key": "stuck_out_tongue_closed_eyes"
    }, {
        "code": "[不屑]",
        "key": "unamused"
    }, {
        "code": "[哼哼]",
        "key": "smirk"
    }, {
        "code": "[我汗]",
        "key": "sweat"
    }, {
        "code": "[忧郁]",
        "key": "pensive"
    }, {
        "code": "[囧]",
        "key": "disappointed"
    }, {
        "code": "[抓狂]",
        "key": "confounded"
    }, {
        "code": "[尴尬]",
        "key": "disappointed_relieved"
    }, {
        "code": "[冷汗]",
        "key": "cold_sweat"
    }, {
        "code": "[可怕]",
        "key": "fearful"
    }, {
        "code": "[难受]",
        "key": "persevere"
    }, {
        "code": "[伤心]",
        "key": "cry"
    }, {
        "code": "[大哭]",
        "key": "sob"
    }, {
        "code": "[激动]",
        "key": "joy"
    }, {
        "code": "[晕]",
        "key": "dizzy_face"
    }, {
        "code": "[惊悚]",
        "key": "scream"
    }, {
        "code": "[生气]",
        "key": "angry"
    }, {
        "code": "[愤怒]",
        "key": "rage"
    }, {
        "code": "[瞌睡]",
        "key": "sleepy"
    }, {
        "code": "[口罩]",
        "key": "mask"
    }, {
        "code": "[恶魔]",
        "key": "imp"
    }, {
        "code": "[睡觉]",
        "key": "sleeping"
    }, {
        "code": "[呆板]",
        "key": "expressionless"
    }, {
        "code": "[苦逼]",
        "key": "anguished"
    }, {
        "code": "[美味]",
        "key": "yum"
    }, {
        "code": "[酷]",
        "key": "sunglasses"
    }, {
        "code": "[疲倦]",
        "key": "tired_face"
    }, {
        "code": "[担心]",
        "key": "worried"
    }, {
        "code": "[马到成功]",
        "key": "d_madaochenggong"
    }, {
        "code": "[肌肉]",
        "key": "muscle"
    }, {
        "code": "[拳头]",
        "key": "punch"
    }, {
        "code": "[厉害]",
        "key": "thumbsup"
    }, {
        "code": "[还不行]",
        "key": "noway"
    }, {
        "code": "[鼓掌]",
        "key": "clap"
    }, {
        "code": "[胜利]",
        "key": "victory"
    }, {
        "code": "[差劲]",
        "key": "thumbsdown"
    }, {
        "code": "[合十]",
        "key": "pray"
    }, {
        "code": "[好的]",
        "key": "ok_hand"
    }, {
        "code": "[向左]",
        "key": "point_left"
    }, {
        "code": "[向右]",
        "key": "point_right"
    }, {
        "code": "[向上]",
        "key": "point_up"
    }, {
        "code": "[向下]",
        "key": "point_dowm"
    }, {
        "code": "[鼻子]",
        "key": "nose"
    }, {
        "code": "[嘴唇]",
        "key": "lips"
    }, {
        "code": "[耳朵]",
        "key": "ear"
    }, {
        "code": "[鄙视]",
        "key": "fu"
    }, {
        "code": "[挥手]",
        "key": "wave"
    }, {
        "code": "[禁止]",
        "key": "raised_hand"
    }, {
        "code": "[天使]",
        "key": "angel"
    }, {
        "code": "[骷髅]",
        "key": "skull"
    }, {
        "code": "[支持]",
        "key": "information_desk_person"
    }, {
        "code": "[反对]",
        "key": "no_good"
    }, {
        "code": "[剪发]",
        "key": "haircut"
    }, {
        "code": "[爱情]",
        "key": "couplekiss"
    }, {
        "code": "[男女]",
        "key": "couple"
    }, {
        "code": "[跳舞]",
        "key": "dancers"
    }, {
        "code": "[舞蹈]",
        "key": "dancer"
    }, {
        "code": "[散步]",
        "key": "walking"
    }, {
        "code": "[跑步]",
        "key": "runner"
    }, {
        "code": "[大礼帽]",
        "key": "tophat"
    }, {
        "code": "[高跟鞋]",
        "key": "high_heel"
    }, {
        "code": "[口红]",
        "key": "lipstick"
    }, {
        "code": "[比基尼]",
        "key": "bikini"
    }, {
        "code": "[美甲]",
        "key": "nail_care"
    }, {
        "code": "[眼镜]",
        "key": "eyeglasses"
    }, {
        "code": "[雨伞]",
        "key": "closed_umbrella"
    }, {
        "code": "[钻戒]",
        "key": "ring"
    }, {
        "code": "[钻石]",
        "key": "gem"
    }, {
        "code": "[庆祝]",
        "key": "tada"
    }, {
        "code": "[用心送礼]",
        "key": "gift_heart"
    }, {
        "code": "[蝴蝶结]",
        "key": "ribbon"
    }, {
        "code": "[气球]",
        "key": "balloon"
    }, {
        "code": "[王冠]",
        "key": "crown"
    }, {
        "code": "[闪光]",
        "key": "sparkles"
    }, {
        "code": "[火]",
        "key": "fire"
    }, {
        "code": "[奖杯]",
        "key": "trophy"
    }, {
        "code": "[红心]",
        "key": "heart"
    }, {
        "code": "[丘比特]",
        "key": "cupid"
    }, {
        "code": "[心跳]",
        "key": "heartbeat"
    }, {
        "code": "[浪漫]",
        "key": "sparkling_heart"
    }, {
        "code": "[礼物]",
        "key": "gift"
    }, {
        "code": "[玫瑰]",
        "key": "rose"
    }, {
        "code": "[情书]",
        "key": "love_letter"
    }, {
        "code": "[圣诞老人]",
        "key": "santa"
    }, {
        "code": "[圣诞树]",
        "key": "christmas_tree"
    }, {
        "code": "[幽灵]",
        "key": "ghost"
    }, {
        "code": "[南瓜灯]",
        "key": "jack_o_lantern"
    }, {
        "code": "[心碎]",
        "key": "broken_heart"
    }, {
        "code": "[眼睛]",
        "key": "eyes"
    }];
</script>