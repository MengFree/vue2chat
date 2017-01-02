<template>
 <div class="message">
    <p class="message_system">
    <span class="content"></span>
    </p>
    <img class="avatar" src="http://uat-wolianw-goods.img-cn-qingdao.aliyuncs.com/shops/1_1/2_1/3_2/4_44/48726_1482390665055_8200.jpg" data-id="P-48726" onerror="this.src=indexImg;">
    <div class="content">
        <p class="name"></p>
        <div class="bubble bubble_primary right MT-text" data-id="48726_1482802700930" data-seq="927050">
            <div class="bubble_cont"  v-html="text(msg.content)" v-if="msg.msgtype=='text'"> </div>
            <div class="bubble_cont"  v-html="image(msg)" v-else-if="msg.msgtype=='image'"> </div>
            <div class="bubble_cont"  v-else-if="msg.msgtype=='file'">
                <div class="attach">
                    <div class="attach_bd">
                        <div class="cover" v-html="getLogo()">
                            
                        </div>
                        <div class="cont">
                            <p class="title">{{msg.content}}</p>
                            <div class="opr">
                                <a :href="msg.filepath" :download="msg.content">下载</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script>
    import {
        mapState
    } from 'vuex'
    export default {
        name: 'msgItem',
        props: ['msg'],
        data() {
            return {
                // msg:{}
            }
        },
        computed: mapState({
            totalTime: state => state.totalTime
        }),
        methods: {
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
            text(cont) {
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
            },
            image(msg){
                return '<div class="picture" title="点击查看大图"><img class="content_img" src="'+msg.filepath+'" /></div>';
            },
            fileName(Y) {
                var Z = Y.lastIndexOf("/");
                var L = Y.lastIndexOf("\\");
                var X = Math.max(Z, L);
                if (X < 0){
                    return Y;
                }else{
                    return Y.substring(X + 1)
                }
            },
         getLogo(){
            let arr=this.msg.filepath.split('.');
            let suffix=arr[arr.length-1].toLowerCase();
            var logo={
                txt:['txt'],
                word:['doc','docx'],
                excel:['xls','xlsx'],
                ppt:['ppt','pptx'],
                pdf:['pdf'],
                video:['mp4','mkv','rmvb'],
                compressed:['zip','rar','7z']
            };
            for(var key in logo){
                if(logo[key].indexOf(suffix)>-1){
                    return '<i class="woxin_file_'+key+'"></i>';
                }
            }
            return '<i class="woxin_file_other"></i>';
        }        
    }
}
</script>