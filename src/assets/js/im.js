/**
 * Created by M.Free on 2016/9/23.
 */

//WebSocket================begin

$(function(){
    /////全局变量
    var tempOffMsgNum=0;///离线信息总数
    var readOffMsgNum=0;///已处理离线信息数量
    var nextHistory=50;///每次次加载聊天记录数量
    var historyNum=20;////每次登录加载系统通知数量
    var _socket;
    var localMsg={};///缓存历史聊天记录
    var unreadMsg={};//缓存未阅读信息
    var chatUser={};///缓存所有聊天对象信息
    var tempMsg={};//缓存发送消息等确认成功后删除
    var upfile={};///缓存未上传完的文件
    var currentMSg={};///本次聊天记录
    var disturbing=[];///屏蔽信息列表
    var pinned=[];///置顶会话列表,
    var serverList=[];//////客服列表
    var blackListTemp=[];////黑名单
    var sendMsgWaiTime=30000;////发送消息等待时间

    //页面初始化
    function init(){
        if(!user.userid){////取不到当前登录id退出
            tips.show('账号登录出错，请重新登录！',{
                auto:false,
                click:false
            });
            setTimeout(function(){
                window.location.href='/user/logout';
            },3000);
        }
        //getServerList(function(list){///获取客服列表
        //    serverList=list;
        //    if(serverList.indexOf(user.userid)==-1){
        //        $("#chatBox .box_hd").append('<div class="onlineNote" id="onlineNote"><i class="icon_note"></i></div>');
        //        $("#onlineNote").click(function(){
        //            onlineNote.show();
        //        })
        //    }
        //});
        getBlackList(function(block){///获取黑名单列表
            if(block.status){
                for(var i=0;i<block.data.length;i++){
                    blackListTemp.push('P-'+block.data[i].userid);
                }
            }
        },true);
        renderNotice.state.hasNotice =$("#menu_system").length !=0 ?true:false;//判断是否有系统通知栏
        renderOrder.state.hasOrder =$("#menu_order").length !=0 ?true:false;//判断是否有订单通知栏
        render.state.hasContact =$("#menu_contact").length !=0 ?true:false;//判断是否有通信录栏
        getDisturbQueue(function(json){///获取屏蔽列表
            if(json.status=="success"){
                for(var i=0;i<json.dataList.length;i++){
                    var type=json.dataList[i].operation=="sendgroup"?'G-'+json.dataList[i].otherid:'P-'+json.dataList[i].otherid;
                    if(disturbing.indexOf(type) == -1){
                        disturbing.push(type);
                    }
                }
            }
            getPinned(function(data){///获取置顶列表
                if(data.status){
                    for(var k=0;k<data.data.length;k++){
                        var temp=data.data[k]['operation']+'-'+data.data[k]['recevierid'];
                        pinned.push(temp);
                    }
                }
                openSocket();//开启socket,登录成功获取会话列表，然后获取通讯录
            })
        });
        contMenu();

    }
    var onlineNote={
        render:function(){
            var that=this;
            var html='<div class="dialog" id="onlineNote_panel" style="display: block">'+
                '<div class="dialog-overlay"></div>'+
                '<div class="Note msgSet" >'+
                '<p class="hd">'+
                '消息设置<span class="close_btn" id="close_onlineNote" title="点击关闭"><i class="close_icon"></i></span> </p>'+
                '<div class="bd">' +
                '<textarea placeholder="在此输入登记内容"></textarea><p>在线登记的内容，请登录客服平台查询</p>' +
                ' <a href="javascript:;" class="btn">保存</a></div></div></div>';
            $('body').append(html);
            that.elem=$("#onlineNote_panel");
            $("#close_onlineNote").click(function(){
                that.hide();
            })
        },
        show:function(){
            var that=this;
            that.render();
            that.elem.find('.Note').animateCss('zoomIn');
        },
        hide:function () {
            var that=this;
            that.elem.find(".Note").animateCss('zoomOut',function(){
                that.elem.remove();
            })
        }
    };
    //获取通讯录列表  call回调
    function getContactList(call){
        $.post('/chat/get-contact',function(json){
            //$("#contactList .nav_view").html('');
            var data=json.data;
            if($('#Fpanle').length>0){
                $('#Fpanle').siblings().remove();
            }else {
                $("#contactList .nav_view").html('');
            }
            if(data.groups){
                render.state.contactList.group=data.groups;
                if(render.state.hasContact){
                    var my=[],noMy=[];
                    for(var i=0;i<data.groups.length;i++){
                        if(data.groups[i].userid==user.userid){
                            my.push(data.groups[i]);
                        }else {
                            noMy.push(data.groups[i]);
                        }
                    }
                    render.contactGroup(my,'G');
                    render.contactGroup(noMy,'G');
                }
            }
            var ids=[];
            if(data.friends){
                render.state.contactList.friend=data.friends;
                if(render.state.hasContact){
                    for(var k=0; k < data.friends.length ;k++){
                        render.contactGroup(data.friends[k],'P');
                        for (var p=0;p<data.friends[k]['friends'].length;p++){
                            ids.push(data.friends[k]['friends'][p]['userid'].toString());
                        }
                    }
                }
            }
            render.state.contactList['ids']=ids;
            //未通过的好友请求
            var addSession=sessionStorage.getItem(user.userid+'-addFriend');
            if(addSession){
                addSession=JSON.parse(addSession);
                unreadFriend=addSession.num;
                render.state.addfriends=addSession.list;
                if(unreadFriend != 0){
                    $("#newFriend .avatar").append('<i class="icon woxin_reddot"></i>');
                }
                updateContNum();
            }
            if(call && typeof(call)==="function"){
                call();
            }
            if(render.state.detailBox){
                var contact=$("#contactList .contact_item[data-id="+render.state.detailBox+"]");
                contact.addClass('active').closest('.contact_list').addClass('on');
            }
            clickContactList();
        }, 'json');
    }
    //滚动条
    $('.scroll').perfectScrollbar();
    //点击页面隐藏
    $(document).click(function(){
        $("#mmpop_profile").hide();//个人信息弹窗
        $("#mmpop_emoji_panel").hide();///表情弹窗
        $("#mmpop_emoji_panel .emoji_face").empty();//清空表情
        $("#mmpop_collect_panel").hide();///收藏弹窗
        $("#setting").hide();//设置
        $('#chatBox .poi i').removeClass('web_wechat_up_icon').addClass('web_wechat_down_icon');//聊天标题箭头
        $("#members_inner").removeClass('edit');
        $("#chat_members").slideUp();
        $("#searchList").hide();
        $('#search_text').val('').attr('data-temp','');
        resetAtPanel();//清空@列表
    });
    $('#search_bar').click(function(e){
        e.stopPropagation();
    });
    $("#chatBox .box_bd").scroll(function(){///新信息提醒隐藏
        var elem=$(this);
        if((elem[0].scrollHeight-elem.scrollTop()-elem.height())<200){
            $("#ToNewMsg").remove();
        }
    });

    //设置弹窗
    $("#setting").click(function(e){
        e.stopPropagation();
    });
    //聊天成员显示
    $('#chatBox .poi').click(function(e){
        e.stopPropagation();
        var i=$(this).find('i');
        if(i.hasClass('web_wechat_down_icon')){
            i.removeClass('web_wechat_down_icon').addClass('web_wechat_up_icon');
            $("#chat_members").slideDown();
        }else{
            i.removeClass('web_wechat_up_icon').addClass('web_wechat_down_icon');
            $("#chat_members").slideUp();
            $("#members_inner").removeClass('edit');
        }

    });
    $("#chat_members").click(function(e){
        e.stopPropagation();
    });


    //emoji表情
    $('#tool_bar .chat_face').click(function(e){
        e.stopPropagation();
        if($("#mmpop_emoji_panel .faceIcon").length>0){
            return ;
        }
        var face='';
        for(var i=0; i<emojiFace.length;i++){
            var code=emojiFace[i].code;
            var key=emojiFace[i].key;
            face+='<a title="'+code+'" type="emoji" class="faceIcon woxinFace_'+key+'">'+code+'</a>'
        }
        $("#mmpop_emoji_panel .emoji_face").append(face);
        $("#mmpop_emoji_panel").animateCss('zoomInUp','show');
        $('#mmpop_emoji_panel .faceIcon').click(function(){
            var code=$(this).attr('title');
            var msg=$("#Msg");
            var content=msg.val();
            msg.val(content+code);
            $("#Msg").focus();
        });
    });
    $('#mmpop_emoji_panel').click(function(e){
        e.stopPropagation();
    });

    $("#chatCard").click(function(){
        renderLaunch.state.launch='card';;
        renderLaunch.show('选择对象');
        clickCard();
    });




    //收藏弹窗
    //$('#tool_bar .chat_collection').click(function(e){
    //    e.stopPropagation();
    //    $("#mmpop_collect_panel").show();
    //});
    //$('#mmpop_collect_panel').click(function(e){
    //    e.stopPropagation();
    //});




    //点击发送
    $('#btn_send').click(function(){
        getSendMsg();
    });
    $("#Msg").keydown(function(e){
        var val=$(this).val();
        if(e.ctrlKey && e.which == 13){      //13等于回车键(Enter)键值,ctrlKey 等于 Ctrl
            $(this).val(val+'\r\n');
        }else if(e.keyCode == 13){
            e.preventDefault();
            getSendMsg();
        }
    });
    $("#Msg").keyup(function(){//即输入@时
        var val=$(this).val();
        if(val.substr(val.length-1,1) == "@" && render.state.chatType=='G'){
            $("#atPanel").addClass('loading_bg').show();
            setTimeout(function(){
                renderAt.renderList();
            },150);
        }
    });

    //搜索At列表
    function searchAt(text){
        var result=[];
        var list=renderAt.state.list;
        for (var i=0;i<list.length;i++){
            var temp={
                letter:list[i].letter,
                data:[]
            };
            for(var k=0;k<list[i].data.length;k++){
                var name=getName(list[i].data[k],Gname);
                var Sdata=list[i].data[k];
                var Unpush=true;
                for(var p=0;p<Sdata.py.length;p++){
                    if(Sdata.py[p].indexOf(text.toUpperCase()) > -1){
                        temp.data.push(Sdata);
                        Unpush=false;
                        break;
                    }
                }
                if(name.indexOf(text) > -1 && Unpush){
                    temp.data.push(Sdata);
                }
            }
            if(temp.data.length>0){
                result.push(temp);
            }
        }
        renderAt.renderList(result);
    }
    $("#atPanel_text").keyup(function(event){
        var val=$(this).val().trim();
        var temp=$(this).attr('data-temp');
        if(val == '' && val!=temp){
            renderAt.renderList();
        }else if(val!=temp){
            searchAt(val);
        }
        $(this).prop('data-temp',val);
    }).click(function(e){
        e.stopPropagation();
        e.preventDefault();
    });
    var renderAt={
        state:{
            list:false,
            select:[],
            sum:0,
            all:{
                name:'所有人',
                photo:'::||/img/woxin_all.png',
                userid:0
            }
        },
        init:function(){
            var tId=render.state.chatId;
            if(render.state.groupMember.count > render.state.groupMember.source.length){
                getGroupMembers({
                    gid:tId.split('-')[1],
                    page:1,
                    size:render.state.groupMember.count
                },function(json){
                    render.state.group[tId]=json.data;
                    render.state.groupMember=json.data;
                },true);
            }
            var group=render.state.groupMember;
            var cer=[];
            for(var i=0;i<group.source.length;i++){
                var info=group.source[i];
                if(info['userid'] != user.userid){
                    var name=getName(info,Gname);
                    var obj={
                        name:name,
                        info:info
                    };
                    cer.push(obj);
                }

            }
            //var sorted=pySegSort(cer);
            var sorted=orderPY(cer);
            renderAt.state.list=sorted;
            renderAt.state.sum=render.state.groupMember.count;
        },
        renderList:function(list){
            if(!renderAt.state.list){
                renderAt.init();
            }
            var tomuch=false;
            var listed=list ? list:renderAt.state.list;
            var listHtml='';
            if(!list && renderAt.state.sum > 100){
                tomuch='<p class="empty_notice">成员太多请进行搜索</p>';
            }else {
                for(var i=0;i<listed.length;i++){
                    var group=listed[i];
                    listHtml+='<div class="title">'+group.letter.toUpperCase()+'</div>';
                    for(var k=0;k<group.data.length;k++){
                        listHtml+=renderAt.getItem(group.data[k]);
                    }
                }
            }
            var tId=render.state.chatId;
            if(!('userid' in render.state.chatList[tId])){
                getGroupDetail(tId.split('-')[1],function(json){
                    if(json.status){
                        json.data['type']='G';
                        json.data['tId']='G-'+json.data['gchatid'];
                        render.state.chatList[tId]=json.data;
                    }
                },true)
            }
            var all=render.state.chatList[tId]['userid']==user.userid ? renderAt.getItem(renderAt.state.all):'';
            var html= all +(tomuch ? tomuch : listHtml) ;
            $("#atPanel_list").html(html );
            clickAtList();
            $("#atPanel").removeClass('loading_bg');
            $("#atPanel_text").focus();
        },
        getItem:function(json){
            var name=getName(json,Gname);
            var ext=getName(json,Gat);
            var html='<label class="contact_item " data-id="'+json.userid+'" data-name="'+name+'" data-ext="'+ext+'"><div class="avatar">'+
                '<img src="'+getUserPhoto(json)+'"  class="img" alt="" onerror="this.src=indexImg;"></div><div class="info">'+
                '<h4 class="nickname">'+name+'</h4> </div> </label>';
            return html;
        }
    };
    $("#atPanel").click(function(e){
        e.stopPropagation();
    });
    $("#close_at").click(function(e){
       resetAtPanel();
    });
    function clickAtList(){
        //点击at列表
        $("#atPanel_list .contact_item ").unbind('click').click(function(e){
            e.stopPropagation();
            var id= $(this).attr('data-id');
            var name= $(this).attr('data-name');
            var ext= $(this).attr('data-ext');
            var msg=$("#Msg");
            if(renderAt.state.select.indexOf(id) < 0 ){
                var obj={
                    id:id,
                    name:'@'+name,
                    ext:'@'+ext
                };
                renderAt.state.select.push(obj);
            }
            var text= msg.val();
            if(text.substring(text.length-1,text.length) != '@'){
                text=text+'@';
            }
            var bef=text.substring(text.length-2,text.length-1);
            if(bef==' '||text.length<=2){
                msg.val(text+ext+' ');
            }else{
                text=text.substring(0,text.length-1);
                msg.val(text+' @'+ext+' ');
            }
            resetAtPanel();
            msg.focus();
            $("#atPanel_text").val('');
        })
    }
    function resetAtPanel(isClear){///还原@列表  isClear是否完全清空数据
        $("#atPanel").addClass('loading_bg').hide();
        $("#atPanel_list").html('');
        $("#atPanel_text").val('');
        if(isClear){
            renderAt.state.list=false;
            renderAt.state.select=[];
        }

    }


    //点击头像
    $("#myself").click(function(){
        getUserInfo(user.userid,'other',function(json){
            if(json.status){
                popProf(json.data,$("#myself"));
            }
        });
    });
    $("#mmpop_profile").click(function (e) {
        e.stopPropagation();
    });







    //点击放大图片背景隐藏
    $("#Preview").click(function(){
        var that=$(this);
        $("#preview_container").css('opacity',0);
        setTimeout(function(){
            that.hide();
        },650);
    });

    //精确搜索用户
    $("#add_search_text").keyup(function(e){
        if(e.keyCode==13){
            searchUser();
        }
        if($(this).val().trim()==''){
            $("#searchResult").html('');
        }
    });
    $("#add_search_btn").click(function(){
        searchUser();
    });
    function searchUser(){
        var text=$("#add_search_text").val();
        if($.trim(text) == ''){//搜索框为空时不做搜索
            $("#detail_panel").hide();
            $("#newFriend_panel").hide();
            return;
        }
        ///ajax send text get json
        getExactSearch(text,function(json){
            render.state.addTempData=json.data;
            var result=render.getAddFriendResult(json.data);
            $("#searchResult").html(result).show();
            $("#addDetail").hide();
            clickAddbtn();
        });
    }
    ///发送添加好友请求
    $("#btn_addFriend").click(function(){
        var otherUserId= render.state.addTempId;
        var checkText=$("#addDetail .checkText").val();
        var fcgryid=$("#addDetail input[name=FriendType]:checked").attr('data-id');
        if(!otherUserId){//id为空
            return ;
        }
        if($.trim(checkText)==''){//验证信息为空
            tips.show('请输入验证信息');
            return ;
        }
        if(!fcgryid){///好友分组为空
            tips.show('请选择分组');
            return ;
        }
        ////ajax  post
        AddFriend(otherUserId,fcgryid,checkText,function(json){
            tips.show(json.msg);
            //$("#searchResult").html("<span class='emty_result'>"+json.msg+"</span>").show();
            $("#searchResult").html("").show();
            $('#addDetail').hide();
            if(json.status=='success'){
                $("#add_search_text").val('');
                getContactList();
            }
        });

    });
    //搜索本地好友、群组
    $("#search_icon").click(function(e){
        e.stopPropagation();
        toSearch();
    });
    $("#search_text").keyup(function(){
        var temp=$(this).attr('data-temp');
        var val=$(this).val().trim();
        if(temp != val && val != ''){//当搜索框值改变时
            toSearch();
        }
        if(val == ''){
            $("#searchList").hide();
        }
        $(this).attr('data-temp',val);
    });
    function clickSession(){
        //聊天会话列表点击
        $('#chatList .chat_item').unbind("click").click(function(){
            var _sef=$(this);
            var type=_sef.attr('data-type');
            if(_sef.hasClass('at')){
                _sef.addClass('readed');
            }
            if(_sef.hasClass('active')){
                return ;
            }
            resetAtPanel(true);
            render.state.senderTemp=[];
            $("#Msg").val('');
            $("#chatBox .box_bd").html('<div id="chatLoading" class="message_empty"><img style="width:350px;" src="/img/loading.gif" alt="" /></div>');
            $("#chatList .chat_item").removeClass('active');
            _sef.addClass('active');
            _sef.find('.woxin_reddot').remove();
            var _id=_sef.attr('data-id');
            render.state.chatId=_id;
            render.state.chatType=render.state.chatList[_id].type;
            render.state.chatImg=getUserPhoto(render.state.chatList[_id]);
            render.state.chatName=getName(render.state.chatList[_id],Pname);
            updateMsgSet(_id);//更新离线设置
            goToChat();
            setTimeout(function(){
                appendMembers(render.state.chatList[_id]);
            },0);

        });
    }
    ///获取会话列表用户的离线咨询设置
    function getMsgSet(tId){
        if(!render.state.chatList[tId]['msgSet']){
            updateMsgSet(tId,true);
        }
        return render.state.chatList[tId]['msgSet'];
    }
    function updateMsgSet(tId,async){
        if(tId.split('-')[0]=='G'){
            return;
        }
        getOnlineStatus(tId.split('-')[1],true);
        async=async?true:false;
        getAutoReply(tId.split('-')[1],true,function(json){
            if(json.status){
                if(json.data){
                    var msgSet={
                        'offline':json.data.offline==1,
                        'offlineText':json.data.offText?json.data.offText:false,
                        'auto':json.data.advisory==1,
                        'autoText':json.data.adviText?json.data.adviText:false,
                        'isFirst':render.state.chatList[tId]['msgSet']?render.state.chatList[tId]['msgSet']['isFirst'] :json.data['isFirst']==0
                    };
                }else {
                    var msgSet={
                        'offline':false,
                        'offlineText':false,
                        'auto':false,
                        'autoText':false,
                        'isFirst':false
                    };
                }
                render.state.chatList[tId]['msgSet']=msgSet;
            }
        },async);
    }
    ///显示离线语句
    function  autoMsg(tId){
        if(tId.split('-')[0]=='G' || tId.split('-')[1]==user.userid){
            return;
        }
        if(!('status' in render.state.chatList[tId])){
            getOnlineStatus(tId.split('-')[1],true);
        }
        var status=getMsgSet(tId);
        if(render.state.chatList[tId]['status']==0 && status['offline'] && status['offlineText']){
            var msg={
                senderid:tId.split('-')[1],
                recevierid:user.userid,
                content:status.offlineText,
                msgtype:"text",
                operation:"offMsg",
                sendtime:getNow(),
                msgId:getMsgId(tId.split('-')[1])
            };
            newMsg(msg);
        }else if(render.state.chatList[tId]['status']==1 && status['isFirst'] && status['auto'] && status['autoText']){
            var msg={
                senderid:tId.split('-')[1],
                recevierid:user.userid,
                content:status.autoText,
                msgtype:"text",
                operation:"autoMsg",
                sendtime:getNow(),
                msgId:getMsgId(tId.split('-')[1])
            };
            render.state.chatList[tId]['msgSet']['isFirst']=false;
            newMsg(msg);
        }

    }
    //处理会话列表是否置顶
    function handleSession(tId,newList){
        var list=$("#chatList .chat_item[data-id="+tId+"]");
        if(pinned.indexOf(tId)!=-1 && list.length !=0){
            list[0].outerHTML=newList;
        }else if(pinned.indexOf(tId)!=-1 && list.length == 0){
            $("#pinned").append(newList);
        }else {
            list.remove();
            $("#pinned").after(newList);
        }
        updatelocalList();
    }
    //点击标题成员弹窗
    function clickMember(){
        $('#members_inner').click(function(){
            $("#mmpop_profile").hide();
        });

        $("#chat_members .member .avatar").unbind("click").click(function(e){
            e.stopPropagation();
            $("#mmpop_profile").hide();
            var _sef=$(this);
            var userid=$(this).parent('.member').attr('data-id');
            if (userid == 'more'){
                //点击加载更多
                var _index=$(this).attr('data-index');
                moreMember(_index);
                return ;
            }
            var data;
            if(tempInfo && tempInfo.userid == userid){
                data=tempInfo;
                popProf(data,_sef);
            }else {
                //ajax get userid信息
                getUserInfo(userid,'',function(json){
                    if(json.status){
                        popProf(json.data,_sef);
                    }
                });
            }
        });
        //显示添加群组成员版面
        $("#member_add").unbind("click").click(function(e){
            if(render.state.chatType=='G'){
                renderLaunch.state.launch='addMember';
                renderLaunch.show('选择联系人');
            }else {
                var id=render.state.chatId.split('-')[1];
                renderLaunch.state.select.push(id);
                renderLaunch.show('选择联系人');
                var selected=renderLaunch.getSelect(id);
                $('#launch_selected').append(selected);

            }

        });
        ///显示删除群组成员版面
        $("#member_del").unbind("click").click(function(e){
            $('#members_inner').toggleClass('edit');
        });
        ///删除群组成员
        $("#chat_members .chat_delete").unbind("click").click(function(e){
            e.stopPropagation();
            var member=$(this).closest('.member');
            var id=member.attr('data-id');
            delGroupChatUsers(id,render.state.chatId.split('-')[1],function(res){
                tips.show(res.msg);
                if(res.status){
                    member.animateCss('bounceOut','remove');
                    for(var i=0;i<render.state.group[render.state.chatId]['source'].length;i++){
                        if(render.state.group[render.state.chatId]['source'][i]['userid']==id){
                            render.state.group[render.state.chatId]['source'].splice(i,1);
                            render.state.group[render.state.chatId]['count']-=1;
                        }
                    }
                    setTitleName(render.state.chatList[render.state.chatId]);
                }
            })

        });
    }

    function clickProfPop(){
        ///点击弹窗隐藏
        $("#mmpop_profile .close").unbind("click").click(function(e){
            $("#mmpop_profile").hide();
        });
        ///点击弹窗聊天
        $("#mmpop_profile .p_send").unbind("click").click(function(e){
            if(tempInfo){
                toChat(tempInfo);
            }
            $("#mmpop_profile").hide();
        });
        ///点击弹窗添加好友
        $("#mmpop_profile .p_add").unbind("click").click(function(e){
            if(tempInfo){
                if(parseInt(tempInfo.userid,10) > 1000000000 || parseInt(user.userid,10) > 1000000000){
                    tips.show('暂不支持添加工厂账号好友');
                    return ;
                }
                addFriend(tempInfo);
            }
            $("#mmpop_profile").hide();
        });
        //点击备注
        $("#J_Text").click(function(e){
            var inner=$(this).html().trim();
            if(inner == '点击添加备注' ){
                $(this).html('');
            }
        });
        $("#J_Text").keyup(function(e){
            if(e.which == 13){
                $(this).blur();
            }
        });
        $("#J_Text").blur(function(){
            var that=$(this);
            var html=$(this).html().trim().replace(/[\r\n]/g,"");
            html=html.replace(/<[^>]+>/g,"");
            var temp=that.attr('data-temp');
            if(html==temp){
                $(this).html(temp);
                return;
            }else {
                that.attr('data-temp',html);
            }

            if(html == ''){
                $(this).html('点击添加备注');
                that.attr('data-temp',html);
            }
            //ajxa 提交备注
            function updataTemp(){
                updataInfo(tempInfo.userid);
            }
            changeFName(that,html,tempInfo.userid,updataTemp);
        });
    }
    ///更新会话列表用户信息以及聊天窗口会话信息
    function updataInfo(id){
        getUserInfo(id,'',function(json){
            if(json.status){
                if(tempInfo && tempInfo.userid==id){
                    tempInfo=json.data;
                }
                var info=json.data;
                var name=getName(info,Pname);
                if(info.userid==render.state.contact.userid){
                    render.state.contact=info;
                    var detail=render.contactDetail(info,"P");
                    $("#detail_panel").html(detail).show();
                    clickSendMsgTo();
                }
                info['type']='P';
                var tId='P-'+id;
                info['tId']=tId;
                var session=$("#chatList .chat_item[data-id="+tId+"]");
                var msg=$("#chatBox div.message[data-id="+render.state.chatType+'-'+id+"]");
                if(session.length>0){
                    render.state.chatList[tId]=info;
                    session.find('.nickname_text ').html(name);
                }
                if(info.isfriend ==1){
                    $("#contactList .contact_item[data-id="+tId+"]").attr('title',name).find('.nickname').html(name);
                }
                if(render.state.chatId == tId){
                    msg.find('.name').html(name);
                    render.state.chatName=name;
                    setTitleName(info);
                    $("#chat_members .member[data-id="+id+"]").find('.nickname').html(name);
                }else if(render.state.chatType == 'G'){//当前会话为群组时
                    getMemberDetail(render.state.chatId.split('-')[1],id,function(member){
                        if(member.status){
                            var MInfo=member.data;
                            for(var i=0;i<render.state.groupMember.source.length;i++){
                                if(render.state.groupMember.source[i].userid == MInfo.userid){
                                    render.state.groupMember.source[i]=MInfo;
                                    render.state.group[render.state.chatId].source[i]=MInfo;
                                    if(!chatUser[render.state.chatId]){
                                        chatUser[render.state.chatId]={};
                                    }
                                    chatUser[render.state.chatId][MInfo.userid]=MInfo;
                                    var name=getName(MInfo,Gname);
                                    msg.find('.name').html(name);
                                    $("#chat_members .member[data-id="+id+"]").find('.nickname').html(name);
                                    return;
                                }
                            }
                        }
                    })
                }
            }
        })
    }

    function addFriend(user){///添加好友
        render.state.addTempData=[user];
        render.state.addTempId=user.userid;
        render.renderAddFriendDetail();
        $("#searchResult").hide();
        $('#addDetail').show();
        $("#addDetail .checkText").val('认识一下').focus();
        $("#addDetail input[name=FriendType]").eq(0).prop('checked',true);
        $('.panel_list').children('div').hide();
        $('.box').hide();
        $("#search_bar").show();
        $("#detail_panel").hide();
        $("#contactList").show();
        $("#contactBox").show();
        $("#menu_contact").addClass('active').siblings().removeClass('active');
        $('#contactList .contact_item').removeClass('active');
        $("#addFriend").addClass('active');
        $("#contactBox .title_name").html('添加朋友');
        $("#addFriend_panel").show();
    }
//弹窗
    function popProf(data,sef){
        tempInfo=data;
        var prof=$("#mmpop_profile");
        var profHtml=render.getProf(data);
        prof.html(profHtml);
        var x=parseInt($(sef).offset().top)-30;
        var y=parseInt($(sef).offset().left)+50;
        var wh=parseInt($(document).scrollTop());
        var W=parseInt($(document).width());
        var H=parseInt($(document).height());
        x= x<wh? wh+10:x ;
        x= (x+295) > H ? H-300 : x;
        y= (y+220) > W ? y-320 : y;
        y= y < 0 ? 10: y;
        prof.css({'top':x,'left':y}).show().find('.profile_mini').animateCss('flipInY');
        clickProfPop();
    }

    ///点击通讯录
    function clickContactList(){
        //点击标题展开/收缩
        $('#contactList .title').unbind("click").click(function(){
            var list=$(this).parent('.contact_list');
            //list.toggleClass('on');
            list.autoH();
            $("#mmpop_profile").hide();
        });
        //点击通讯录联系人
        $('#contactList .contact_item').unbind("click").click(function(){
            var _self=$(this);
            var type=_self.attr('data-type');
            if(_self.hasClass('active')){
                return ;
            }
            $('#contactList .contact_item').removeClass('active');
            _self.addClass('active');
            var _id=_self.attr('id');
            $('#contactBox .profile').hide();
            if(_id == 'newFriend'){
                $("#contactBox .title_name").html('新的朋友');
                $("#newFriend").find('.icon').remove();
                var list=render.getNewFriendNotice(render.state.addfriends);
                $("#newFriend_panel").html(list).show();
                unreadFriend=0;
                updateContNum();
                clickAccept();
            }else if(_id == 'addFriend'){
                $("#contactBox .title_name").html('添加朋友');
                $("#addFriend_panel").show();

            }else {
                var tId=_self.attr('data-id');
                showContactDetail(tId);
            }
        });
    }
    function updateAddFriendSession(){
        var temp=[];
        for(var i=0;i<render.state.addfriends.length;i++){
            if(!render.state.addfriends[i]['accept']){
                temp.push(render.state.addfriends[i]);
            }
        }
        var session={
            num:unreadFriend,
            list:temp
        };
        sessionStorage.setItem(user.userid+'-addFriend',JSON.stringify(session));
    }
    var tempInfo=null;//缓存弹窗用户信息
    function clickMessage(){
        //点击聊天头像
        $("#chatBox .box_bd .avatar").unbind("click").click(function(e){
            e.stopPropagation();
            var _sef=$(this);
            var userid=$(this).attr('data-id');
            var data;
            if(tempInfo && tempInfo.userid == userid.split('-')[1]){
                data=tempInfo;
                popProf(data,_sef);
            }else {
                //ajax get userid信息
                getUserInfo(userid.split('-')[1],'',function(json){
                    if(json.status){
                        popProf(json.data,_sef);
                    }
                });
            }
        });
        $("#chatBox .card").unbind("click").click(function(){
            if($(this).attr('data-type')=='store'){
                return;
            }
            var tId='P-'+$(this).attr('data-id');
            goToContact();
            var list=$("#contactList .contact_item[data-id="+tId+"]");
            if(!list.hasClass('active')){
                $("#contactList .contact_list").removeClass('on').find('.item_box').height(0);
                $("#contactList .contact_item").removeClass('active');
                if(list.length != 0){
                    list.addClass('active').closest('.contact_list').addClass('on');
                    list.addClass('active').closest('.item_box').height('auto');
                }
            }
            $("#Fpanle").addClass('on').find('.item_box').height('auto');
            showContactDetail(tId);
        });
        ///点击播放视频
        $("#chatBox .msg_video").unbind("click").click(function(){
            var video=$(this).get(0);
            var icon = $(this).parent().find('.video_icon');
            playVideo(icon,video);
        });
        $("#chatBox .video_icon").unbind("click").click(function(){
            var video=$(this).parent().find('.msg_video').get(0);
            var icon = $(this);
            playVideo(icon,video);
        });
        function playVideo(icon,video){
            if(video.ended || video.currentTime == 0 || video.paused){
                icon.hide();
                video.play();
            }else{
                icon.show();
                video.pause();
            }
            video.onended=function(){
                icon.show();
            };
        }

    }
//点击放大聊天图片
    $("#chatBox").on('click','img.content_img',function(){
        var list=$("#chatBox img.content_img");
        var arr=[];
        for(var i=0;i<list.length;i++){
            arr.push(list[i].getAttribute('src'));
        }
        var src = $(this).attr("src");
        setPic(src,arr);
    });
    function setPic(src,imgArr){
        var _w = parseInt($(window).width());
        var _h = parseInt($(window).height());
        var _scale=_w/_h;
        var realWidth;//真实的宽度
        var realHeight;//真实的高度
        var h, w,top,left,scale;
        $("<img/>").attr("src", src).load(function() {
            realWidth = parseInt(this.width);
            realHeight = parseInt(this.height);
            scale=realWidth/realHeight;
            if( scale > _scale && realWidth+182>=_w){
                w=_w-182;
                h=w/scale;
            }else if(scale < _scale && realHeight+382>=_h){
                h=_h-382;
                w=h*scale;
            }else {
                w=realWidth;
                h=realHeight;
            }
            left=(_w-w)/2;
            top=(_h-200-h)/2;
            $("#img_dom").attr('style','');
            $("#img_preview").attr('style','').attr("src", src);
            imgScale=1;
            $('#img_dom').css({"width":w,"height":h,"top":top,"left":left});
            var rote=0;
            var index=imgArr.indexOf(src);
            $("#prevImg").unbind('click').click(function(){
                index=index-1;
                setPic(imgArr[index],imgArr);
            });
            $("#nextImg").unbind('click').click(function(){
                index=index+1;
                setPic(imgArr[index],imgArr);
            });
            $("#turnImg").unbind('click').click(function(){
                rote+=90;
                $("#img_preview").css({"transform": "rotate("+rote+"deg)"});
            });
            if(index==0){
                $("#prevImg").unbind('click').addClass('web_woxin_left_disable');
            }else{
                $("#prevImg").removeClass('web_woxin_left_disable');
            }
            if(index==(imgArr.length-1)){
                $("#nextImg").unbind('click').addClass('web_woxin_right_disable');
            }else {
                $("#nextImg").removeClass('web_woxin_right_disable');
            }
            $("#downloadImg").prop('href',src);
            $("#Preview").show().focus();
            $("#preview_container").css('opacity',1);
        });
    }
    $("#closePreview").click(function(){
        $("#preview_container").css('opacity',0);
        setTimeout(function(){$("#Preview").hide()},650);
    });
    var imgScale=1;
    $("#Preview").mousewheel(function(event, delta) {
        var img=$("#img_dom");
        delta=delta/10;
        imgScale=imgScale+delta;
        if(imgScale<0.2){
            imgScale=0.2;
        }
        img.css({"transform": "scale("+imgScale+")"});
    });
    $("#img_opr_container").click(function(e){
        e.stopPropagation();
    });
    var $div = $("#img_dom");
    /* 绑定鼠标左键按住事件 */
    $div.bind("mousedown",function(event){
        event.stopPropagation();
        event.preventDefault();
        /* 获取需要拖动节点的坐标 */
        var offset_x = $(this)[0].offsetLeft;//x坐标
        var offset_y = $(this)[0].offsetTop;//y坐标
        /* 获取当前鼠标的坐标 */
        var mouse_x = event.pageX;
        var mouse_y = event.pageY;
        /* 绑定拖动事件 */
        /* 由于拖动时，可能鼠标会移出元素，所以应该使用全局（document）元素 */
        $(document).bind("mousemove",function(ev){
            /* 计算鼠标移动了的位置 */
            var _x = ev.pageX - mouse_x;
            var _y = ev.pageY - mouse_y;
            /* 设置移动后的元素坐标 */
            var now_x = (offset_x + _x ) + "px";
            var now_y = (offset_y + _y ) + "px";
            /* 改变目标元素的位置 */
            $div.css({
                top:now_y,
                left:now_x
            });
        });
    }).click(function(event){
        event.stopPropagation();
        event.preventDefault();
    });
    /* 当鼠标左键松开，接触事件绑定 */
    $(document).bind("mouseup",function(event){
        event.stopPropagation();
        event.preventDefault();
        $(this).unbind("mousemove");
    });
    function clickAccept(){
        //通过好友请求
        $("#newFriend_panel .accept_btn").unbind("click").click(function(){
            if($(this).hasClass('on')){
                return ;
            }
            var that=$(this);
            var id=that.attr('data-id');
            var pop=render.getgroupListPop();
            $("#newFriend_panel").append(pop);
            render.state.acceptId=id;
            clickAddPopBtn();
        });
    }
    function clickAddPopBtn(){
        //点击通过好友请求弹窗按钮
        $("#btn_acceptFriend").unbind("click").click(function(){
            var gid=$("#gruop_list_pop input[name=FriendType]:checked").attr('data-id');
            var id=render.state.acceptId;
            if(!id){
                return ;
            }
            if(!gid){
                return ;
            }
            VerifyFriend(id,gid,'',function(json){
                $('#gruop_list_pop').remove();
                if(json.status=='success'){
                    for(var i in render.state.addfriends){
                        if(render.state.addfriends[i]['senderid']==id){
                            render.state.addfriends[i]['accept']=true;
                        }
                    }
                    $("#newFriend_panel .accept_btn[data-id="+id+"]").addClass('on').html('已添加');
                    getContactList();
                    updateContNum();
                }
            })
        });
    }
    function clickAddbtn(){
        //点击搜索结果添加按钮
        $("#searchResult .addF_btn").unbind("click").click(function(){
            var that=$(this);
            var id=that.attr('data-id');
            if(id==user.userid){
                $(this).addClass('on').html('不能添加自己');
                return;
            }
            render.state.addTempId=id;
            render.renderAddFriendDetail();
            $("#searchResult").hide();
            $('#addDetail').show();
            $("#addDetail .checkText").val('认识一下').focus();
            $("#addDetail input[name=FriendType]").eq(0).prop('checked',true);
        });
    }
    function clickSendMsgTo(){
        //通讯录详细信息-发消息
        $("#SendMsgTo").unbind("click").click(function(){
            if(!render.state.contact){
                return ;
            }
            toChat(render.state.contact);
        });
        //通讯录详细信息-加入群
        $("#joinTo").unbind("click").click(function(){
            if(!render.state.contact){
                return ;
            }
            var id=render.state.contact['groupId'];
            JoinByGroupQrCode(id,function(json){
                tips.show(json['message']);
                if(json['status']){

                    //$("#joinTo").replaceWith('<a class="button" id="SendMsgTo" href="javascript:void(0);">发消息</a>');
                    getContactList();
                    //clickSendMsgTo();
                    showContactDetail('G-'+id);
                }
            })
        });
        //点击修改好友分组
        $("#editFriend").unbind("click").click(function(){
            var change=$("#changeGroup");
            var flag=!change.prop('disabled');
            change.prop('disabled',flag);
            if(flag){
                $(this).html('修改');
            }else {
                $(this).html('取消');
            }
        });
        //修改分组select
        $("#changeGroup").change(function(){
            var that=$(this);
            var val=that.val();
            var temp=that.attr('data-temp');
            $(this).prop('disabled',true);
            changeFriend(render.state.detailBox.split('-')[1],'group',val,function(json){
                tips.show(json.message);
                if(json.status=='success'){
                    that.attr('data-temp',val);
                    that.prop('disabled',true);
                    $("#editFriend").html('修改');
                    getContactList();
                }else {
                    that.val(temp);
                }
            });
        });

        //修改备注
        $("#detail_panel .value").click(function(e){
            var inner=$(this).html().trim();
            if(inner == '点击添加备注' ){
                $(this).html('');
            }
        });
        $("#detail_panel .value").keyup(function(e){
            if(e.keyCode == 13){
                e.preventDefault();
                $(this).blur();
            }
        });
        $("#detail_panel .value").blur(function(){
            var that=$(this);
            var html=$(this).html().trim().replace(/[\r\n]/g,"");
            html=html.replace(/<[^>]+>/g,"");
            var temp=that.attr('data-temp');
            if(html==temp){
                $(this).html(temp);
                return;
            }else {
                that.attr('data-temp',html);
            }
            if(html == ''){
                $(this).html('点击添加备注');
                that.attr('data-temp',html);
            }
            //ajxa 提交备注
            function CInfo(){
                updataInfo(render.state.detailBox.split('-')[1]);
            }
            changeFName(that,html,render.state.detailBox.split('-')[1],CInfo);

        });
        //添加好友
        $("#addTofriend").click(function(){
            if(parseInt(render.state.contact.userid,10) > 1000000000 || parseInt(user.userid,10) > 1000000000){
                tips.show('暂不支持添加工厂账号好友');
                return ;
            }
            addFriend(render.state.contact);
        });
        $("#disturb_panel :radio").change(function(e){
            var that=$(this);
            var val=$(this).val();
            setDisturb(render.state.detailBox.split('-')[1],'sendgroup',val,function(json){
                var msg=val=='add'?'设置免打扰成功':'取消免打扰成功';
                if(json.status=="success"){//更新disturbing列表
                    tips.show(msg);
                    var index=disturbing.indexOf(render.state.detailBox);
                    var item=$("#chatList .chat_item[data-id="+render.state.detailBox+"]");
                    if(index >-1){
                        disturbing.splice(index,1);
                        item.find('i.chat_no-remind').closest('.attr').remove();
                    }else {
                        disturbing.push(render.state.detailBox);
                        item.find('div.ext').append('<p class="attr"><i class="chat_no-remind"></i></p>');
                    }
                }else {
                    tips.show(json.message);
                    that.parent('label').siblings().find("input").prop('checked',true);
                }
            });
        });
        $("#invite_panel :radio[name=invite]").change(function(e){
            var invite=$(this).val();
            UpdateGroupChat(render.state.detailBox.split('-')[1],invite,function(res){
                if(res.status){
                    //render.state.chatList[tId]['allowInvite']= invite==1;
                    tips.show('修改成功！');
                }else {
                    tips.show('修改失败，请稍后重试。');
                }
            })
        });
    }
    function changeFName(that,name,id,handle){
        changeFriend(id,'fname',name,function(json){
            tips.show(json.message);
            if(json.status=='success'){
                that.html(name);
                that.attr('data-temp',name);
                if(handle){
                    setTimeout(function(){
                        handle();
                    },1000);
                }
                renderAt.state.list=false;
            }else {
                var temp=that.attr('data-temp');
                that.html(temp);
            }
        });
    }
    function clickCloseAdd(){
        $("#close_add_detail").click(function(){
            $("#addDetail").hide();
            $("#searchResult").show();
        })
    }
    function clickSearchResult(){
        //点击本地搜索结果
        $("#searchList .contact_item").unbind("click").click(function(){
            var id=$(this).attr('data-id').split('-')[1];
            var type=$(this).attr('data-type');
            var rev=null;
            var temp=localSearch.state;
            if(type == 'G' && temp.group.length>0){
                for(var i=0;i<temp.group.length;i++){
                    if(id==temp.group[i].gchatid){
                        rev=temp.group[i];
                    }
                }
            }else{
                for(var i=0;i<temp.friend.length;i++){
                    if(id==temp.friend[i].userid){
                        rev=temp.friend[i];
                    }
                }
            }
            if(rev != null){
                $("#searchList").hide();
                $("#search_text").val('').attr("data-temp",'');
                toChat(rev);
            }
        });
    }
    //点击加载更多聊天记录
    function moreRecord(){
        var loadingRecord=false;
        ///点击加载更多聊天记录
        $("#moreMsg").unbind("click").click(function(){
            if(loadingRecord){
                return ;
            }
            loadingRecord=true;
            var index=parseInt($(this).attr('data-index'),10);
            var chat=render.state.chatId;
            if(chat in localMsg && localMsg[chat].length>=index){///存在历史消息并条数大于index
                render.chatBox(chat,index-nextHistory,index);
            }else {
                var sendtime='';
                if(chat in localMsg && localMsg[chat].length>=1){
                    sendtime=localMsg[chat][localMsg[chat].length-1].sendtime;
                    render.chatBox(chat,index-nextHistory,localMsg[chat].length);
                }else if(chat in currentMSg && currentMSg[chat].length>=1){
                    sendtime=currentMSg[chat][0].sendtime;
                }
                getLocalMsg(chat,sendtime);
            }
            $(this).html('<img src="/img/loadingFile.gif" />');
        });
    }

    function getLocalMsg(chat,sendtime){
        var sender=chat.split('-');
        var msg={
            "senderid":user.userid,
            "count":nextHistory,
            "operation":"hisMsg",
            "type":sender[0]=='P'?"sendmsg":"sendgroup",
            "sendtime":sendtime
        };
        if(sender[0]=='G'){
            if(render.state.group[chat] && render.state.group[chat].source[0].userid != user.userid){
                msg['recevierid']=render.state.group[chat].source[0].userid;
            }else {
                getGroupMembers({gid:sender[1],page:1,size:2},function(json){
                    msg['recevierid']=json.data.source[1].userid;
                },true);
            }
            msg['groupid']=sender[1];
        }else {
            msg['recevierid']=sender[1];
        }
        sendSocket(JSON.stringify(msg));
    }

//点击系统通知列表
    function clickNotice(){
        $("#systemList div.chat_item ").unbind("click").click(function(){
            var me=$(this);
            if(me.hasClass('active')){
                return ;
            }
            me.find('.woxin_reddot').remove();
            me.addClass('active').siblings().removeClass('active');
            var id=me.attr('data-id');
            var msg;
            renderNotice.state.now=id;
            if(id in renderNotice.state.msg){
                msg=renderNotice.state.msg[id];
            }else {
                //ajax
                msg=[]
            }
            var newNotice=renderNotice.state.newNotice;
            var msgq='';
            if(id in newNotice && newNotice[id].length>0){
                for(var k=0;k<newNotice[id].length;k++ ){
                    msgq+=newNotice[id][k]+',';
                    msg.push(newNotice[id][k]);
                }
                delete renderNotice.state.newNotice[id];
            }
            renderNotice.state.msg[id]=msg;
            renderNotice.appendMsg(msg);
            updateSysNum();
        });
    }
    //点击订单通知列表
    function clickOrder(){
        $("#orderList div.chat_item ").unbind("click").click(function(){
            var me=$(this);
            if(me.hasClass('active')){
                return ;
            }
            me.find('.woxin_reddot').remove();
            me.addClass('active').siblings().removeClass('active');
            var id=me.attr('data-id');
            var msg;
            renderOrder.state.now=id;
            if(id in renderOrder.state.msg){
                msg=renderOrder.state.msg[id];
            }else {
                //ajax
                msg=[]
            }
            var newOrder=renderOrder.state.newOrder;
            var msgq='';
            if(id in newOrder && newOrder[id].length>0){
                for(var k=0;k<newOrder[id].length;k++ ){
                    msgq+=newOrder[id][k]+',';
                    msg.push(newOrder[id][k]);
                }
                delete renderOrder.state.newOrder[id];
            }
            renderOrder.state.msg[id]=msg;
            renderOrder.appendMsg(msg);
            updateOrdNum();
        });
    }
//更新系统未读通知数目
    var tempNewNoticeNum=0;
    function updateSysNum(){
        var newNotice=renderNotice.state.newNotice;
        var num=0; var obj={};
        if(newNotice){
            for(var i in newNotice){
                num+=newNotice[i].length;
                obj[i]=newNotice[i].length;
            }
        }
        num+=tempNewNoticeNum;
        num= num==0?'':'('+num+')';
        obj['temp']=num;
        //localStorage.setItem('system-'+user.userid,JSON.stringify(obj));
        sessionStorage.setItem('system-'+user.userid,JSON.stringify(obj));
        $("#sys_num").html(num);
    }
    $("#menu_system").click(function () {
        tempNewNoticeNum=0;
        updateSysNum();
    });
//更新订单未读订单数目
    function updateOrdNum(){
        var newOrder=renderOrder.state.newOrder;
        var num=0;
        var obj={};
        if(newOrder){
            for(var i in newOrder){
                num+=newOrder[i].length;
                obj[i]=newOrder[i].length;
            }
        }
        num+=tempNewOrderNum;
        num= num==0?'':'('+num+')';
        obj['temp']=num;
        //localStorage.setItem('order-'+user.userid,JSON.stringify(obj));
        sessionStorage.setItem('order-'+user.userid,JSON.stringify(obj));
        $("#order_num").html(num);
    }
    $("#menu_order").click(function () {
        tempNewOrderNum=0;
        updateOrdNum();
    });
//更新好友请求未读通知数目
    function updateContNum(){
        var friends=render.state.addfriends;
        var num=unreadFriend;
        num= num==0?'':'('+num+')';
        $("#cont_num").html(num);
        updateAddFriendSession();
    }
    $("#menu_contact").click(function(){
        if($("#newFriend").hasClass('active')){
            unreadFriend=0;
            updateContNum();
        }
        getContactList();

    });
    ///搜索本地通讯录
    function toSearch(){
        var list=$("#searchList");
        var key=$("#search_text").val().trim().toUpperCase( );
        if(key == ''){
            return
        }
        var Gre=searchGroup(key);
        var Fre=searchFriend(key);
        var Glist=localSearch.getSearchList(Gre,'G','群聊');
        var Flist=localSearch.getSearchList(Fre,'P','联系人');
        localSearch.state.group=Gre;
        localSearch.state.friend=Fre;
        var html=Flist+Glist;
        list.find('.search_list').html(html==''?'<span class="emty_re">无本地搜索结果...</span>':html);
        list.show();
        clickSearchResult();
    }
    var localSearch={
        state:{
            group:[],//本地搜索群组结果
            friend:[],//本地搜索好友结果
            local:[]///本地搜索聊天记录结果
        },
        //返回本地搜索结果
        getSearchList:function(data,type,title){
            var contact='';
            for(var i=0;i<data.length;i++){
                contact+=this.getSearchItem(data[i],type);
            }
            var  group='<div class="contact_list on">'+
                '<div class="title">'+
                '<h4 class="contact_title">'+title+'</h4>'+
                '</div>'+
                '<div class="item_box">'+contact+'</div>'+
                '</div>';
            if(data.length == 0){
                group='';
            }
            return group;
        },
        //返回单个结果
        getSearchItem:function(jsonData,type){
            var id='';
            var photo='';
            if(type=='G'){
                id=jsonData.gchatid;
            }else {
                id=jsonData.userid;
            }
            var  contact='<div class="contact_item" title="'+getName(jsonData,Pname)+'" data-id="'+type+'-'+id+'" data-type="'+type+'">'+
                '<div class="avatar">'+
                '<img src="'+getUserPhoto(jsonData)+'" class="img" alt="'+getName(jsonData,Pname)+'" onerror="this.src=indexImg;">'+
                '</div>'+
                '<div class="info">'+
                '<h4 class="nickname">'+getName(jsonData,Pname)+'</h4>'+
                '</div>'+
                '</div>';
            return contact;

        }
    };
    function searchGroup(key){
        var re=[];
        var group=render.state.contactList.group;
        for(var i in group){
            if('name' in group[i]){
                var flag = group[i].name.toUpperCase( ).indexOf(key);
                if(flag>-1){
                    re.push(group[i]);
                }
            }
        }
        return re;
    }
    function isKeyInFriend(userData,key){
        if('fname' in userData){
            if(userData.fname.toUpperCase().indexOf(key)> -1){
                return true;
            }
        }
        if('storeName' in userData){
            if(userData.storeName.toUpperCase( ).indexOf(key)> -1){
                return true;
            }
        }
        if('name' in userData){
            if(userData.name.toUpperCase( ).indexOf(key)> -1){
                return true;
            }
        }
        if('username' in userData){
            if(userData.username.toUpperCase( ).indexOf(key)> -1){
                return true;
            }
        }
        if('phone' in userData){
            if(userData.phone.indexOf(key)> -1){
                return true;
            }
        }
        if('nickname' in userData){
            if(userData.nickname.toUpperCase( ).indexOf(key)> -1){
                return true;
            }
        }
        return false;
    }

    function searchFriend(key){
        var re=[];
        var reID=[user.userid.toString()];
        var friend=render.state.contactList.friend;
        var session=render.state.chatList;
        for(var i=0;i<friend.length;i++){
            if('friends' in friend[i] && friend[i].friends.length!=0){
                for (var k in friend[i].friends){
                    if(isKeyInFriend(friend[i].friends[k],key) && reID.indexOf(friend[i].friends[k].userid.toString())==-1){
                        re.push(friend[i].friends[k]);
                        reID.push(friend[i].friends[k].userid.toString());
                    }
                }
            }
        }
        for(var k in session){
            if(session[k].type=='P' && session[k].name.indexOf(key)>-1 && reID.indexOf(session[k].userid.toString())==-1){
                re.push(session[k]);
                reID.push(session[k].userid.toString());
            }
        }
        return re;
    }
//加载更多群组成员
    function moreMember(index){
        var more=render.getMembers(render.state.group[render.state.chatId],index);
        $("#moreMember").remove();
        $("#members_inner").append(more);
        clickMember();
    }


//设置聊天标题
    function setTitleName(user){
        var tittle=getName(user,Pname);
        var num='';
        if(user.type=='G'){
            num='('+(render.state.groupMember.count ? render.state.groupMember.count:0)+')';
        }
        $("#chatBox .title_name").html(tittle);
        $("#chatBox .poi span").html(num);
    }


//跳转到聊天  sender接收者/群信息
    function toChat(sender,isOnline){
        var _type=userType(sender);///判断是个人或者群
        if(_type == 'G'){
            if(sender.gchatid){
                var _id=sender.gchatid;
            }else {
                var _id=sender.groupid;
            }
        }else {
            var _id=sender.userid;
        }
        sender.type=_type;
        //聊天对象为自己则返回
        //if(_type == 'P' && _id==user.userid){
        //    tips.show('暂不支持自己给自己发信息');
        //    return ;
        //}
        var tId=_type+'-'+_id;
        sender['tId']=tId;
        render.state.chatList[tId]=sender;
        var appendChat=true;
        //改变聊天状态信息
        if(render.state.chatId == tId){
            appendChat=false;
        }else{
            resetAtPanel(true);
        }
        render.state.chatId=tId;
        render.state.chatImg=getUserPhoto(sender);
        render.state.chatType=_type;
        render.state.chatName=getName(sender,Pname);
        //
        goToChat();
        updateMsgSet(tId);//更新离线设置

        ///////链接跳转客服聊天，第一句
        //if(chatter && chatter.userid==_id  && serverList.indexOf(chatter.userid)>-1 && typeof isOnline !=='undefined'){///是客服
        //    var content='';
        //    if('time' in chatter && noWorkTime(chatter.time)){
        //        content=true;
        //    }else if(isOnline == '0'){
        //        content ='【自动回复】您好，很抱歉该客服不在线哦。如有紧急问题请留言，我们收到消息后会马上回复您，建议耐心等候，感谢您的支持与配合。';
        //    }
        //    if(content != ''){
        //        var autoMsg=getAutoMsg(_id,chatter.time);
        //        addCurrentMsg(autoMsg,tId);
        //    }
        //}
        reSetChat(sender,appendChat);

    }
//显示聊天界面并载入聊天记录
    function reSetChat(sender,appendChat){
        if(appendChat){
            $('#menu .menu_list').removeClass('active').eq(0).addClass('active');
            $('#panel_list .mainList').removeClass('active').eq(0).addClass('active');
            $("#Msg").val('');
            $("#chatBox .box_bd").html('');
            appendMembers(sender);
        }
        var state={
            active:true,
            at:false
        };
        var _id=render.state.chatId;
        var list=$("#chatList .chat_item[data-id="+_id+"]");
        state.at=(list.hasClass('at') && !list.hasClass('readed'));
        var Msg=currentMSg[_id]?currentMSg[_id][currentMSg[_id].length-1]:false;
        var newList = render.getChatList(sender,Msg,state);
        //$("#search_bar").hide();
        $("#chatList .chat_item").removeClass('active');
        handleSession(_id,newList);
        clickMessage();
        clickSession();
    }

    function appendMembers(sender,notRenderMsg){
        var _type=userType(sender);///判断是个人或者群
        if('gchatid' in sender){
            var _id=sender.gchatid;
        }else {
            var _id=sender.userid;
        }
        var tId=_type+'-'+_id;
        $("#chatLoading").remove();
        if(!notRenderMsg){
            var params=null;
            if(currentMSg[tId] && currentMSg[tId].length>0){
                //插入当前聊天记录
                render.chatBox(tId);
            }
            //插入历史聊天记录
            if(!localMsg[tId]){
                getLocalMsg(tId,'');
            }else if(localMsg[tId]){
                var len=localMsg[tId].length > nextHistory ? nextHistory : localMsg[tId].length;
                params={start:0, end:len,done:(localMsg[tId].length < nextHistory )};
            }
            if(params){
                render.chatBox(tId,params['start'],params['end'],params['done']);
            }
            $("#Msg").focus();
        }
        var members='';
        if(_type == 'G'){
            var set=getMemberSet(tId);
            if( tId in  render.state.group){
                render.state.groupMember=render.state.group[tId];
                members=render.getMembers(render.state.group[tId]);
            }else {
                getGroupMembers({gid:_id,page:1,size:20},function(json){
                    render.state.groupMember=json.data;
                    render.state.group[tId]=json.data;
                    members=render.getMembers(json.data);
                },true);
            }
            var memberSet='';
            if(!isMember && set.isMaster){
                memberSet=render.getMember('add')+render.getMember('del');
            }else if(!isMember && set.isMaster==false && set.allowInvite) {
                memberSet=render.getMember('add');
            }
            members=memberSet+members;
            $("#member_btn").show();
        }else {
            var addMember=isMember?'':render.getMember('add');
            members=addMember+render.getMember(sender);
            $("#member_btn").hide();
        }
        $("#members_inner").empty().append(members);
        clickMember();
        setTitleName(render.state.chatList[tId]);
    }
    function updateMember(tId){//更新群成员信息
        var members='';
        var set=getMemberSet(tId);
        getGroupMembers({gid:tId.split('-')[1],page:1,size:20},function(json){
            render.state.groupMember=json.data;
            render.state.group[tId]=json.data;
            members=render.getMembers(json.data);
        },true);
        var memberSet='';
        if(set.isMaster){
            memberSet=render.getMember('add')+render.getMember('del');
        }else if(set.isMaster==false && set.allowInvite) {
            memberSet=render.getMember('add');
        }
        members=memberSet+members;
        $("#members_inner").empty().append(members);
        clickMember();
        setTitleName(render.state.chatList[tId]);
    }
    function getMemberSet(tId){//获取是否群组isMaster，是否可邀请进群allowInvite
        if(tId.split('-')[0]=='P'){
            return {
                isMaster:true,
                allowInvite:true
            }
        }
        if(!('userid' in render.state.chatList[tId])){
            getGroupDetail(tId.split('-')[1],function(group){
                if(group.status){
                    for(var key in group.data){
                        if( group.data.hasOwnProperty(key)){
                            render.state.chatList[tId][key]=group.data[key];
                        }
                    }
                }
            },true);
        }
        return {
            isMaster:(render.state.chatList[tId]['userid'] == user.userid),
            allowInvite:(render.state.chatList[tId]['allowInvite']==1)
        }
    }
    $("#member_btn").click(function(){//退出群组
        var tId=render.state.chatId;
        var content = render.state.chatList[tId]['userid']==user.userid?
            '你是群主，退出后将解散此群，群成员之间将不能再互相接收发送群聊信息':
            '退出后不会通知群聊其他群成员，且不会再接收此群聊信息';
        confirmModel.show({
            content:content,
            btn:[{
                name:'确定',
                callback:function(){
                    delMyGroupChat(tId.split('-')[1],function(res){
                        tips.show(res.msg);
                        if(res.status){
                            render.state.chatId=null;
                            render.state.chatImg=null;
                            render.state.chatName=null;
                            var list=$("#chatList .chat_item[data-id="+tId+"]");
                            //清空历史，当前，聊天记录
                            currentMSg[tId]=[];
                            localMsg[tId]=[];
                            ///从会话列表删除
                            delete render.state.chatList[tId];
                            delete render.state.group[tId];
                            if(render.state.chatId==tId){
                                render.state.chatId=null;
                                render.state.chatImg=null;
                                render.state.chatName=null;
                            }
                            var ids=tId.split('-');
                            if((ids[0]=='G' && render.state.contact['gchatid']==ids[1])){
                                $("#contactBox .profile").hide();
                                render.state.contact=null;
                            }
                            list.animateCss('bounceOutLeft','remove');
                            emptyChat();
                        }
                        confirmModel.hide();
                    })
                }
            }]
        });

    });
///ajax请求======================================================begin

//获取id用户信息
    function getUserInfo(id,type,callback,noAsync){
        var async = noAsync ? false : true;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/get-detail",
            data: {uid:id,type:type},
            dataType: "json",
            success: function(json){callback(json)}
        });
        //$.post('/chat/get-detail',{uid:id},function(json){callback(json)},'json');
    }

//获取id群信息
    function getGroupDetail(id,callback,noAsync){
        var async = noAsync ? false : true;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/get-group-detail",
            data: {gid:id},
            dataType: "json",
            success: function(json){callback(json)}
        });
        //$.post('/chat/get-group-detail',{gid:id},function(json){callback(json)},'json');
    }

//获取id群成员{gid:_id,page:1,size:20}
    function getGroupMembers(param,callback,noAsync){
        var async = noAsync ? false : true;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/get-group-members",
            data: param,
            dataType: "json",
            success: function(json){callback(json)}
        });
        //$.post('/chat/get-group-members',{gid:id},function(json){callback(json)},'json');
    }

    ///获取群组成员详细信息
    function getMemberDetail(groupId,memberId,callback,noAsync){
        var async = noAsync ? false : true;
        var id=user.userid;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/get-member-detail",
            data: {
                groupId:groupId,
                memberId:memberId,
                userId: id
            },
            dataType: "json",
            success: function(json){callback(json)}
        });
    }
    ///搜索通讯录
    function getContactSearch(keyword,callback,noAsync){
        var async = noAsync ? false : true;
        var id=user.userid;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/contact-search",
            data: {
                keyword:keyword
            },
            dataType: "json",
            success: function(json){callback(json)}
        });
    }
    ///获取屏蔽列表
    function getDisturbQueue(callback,noAsync){
        var async = noAsync ? false : true;
        var id=user.userid;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/get-disturb-queue",
            data: {
                userId:id
            },
            dataType: "json",
            success: function(json){callback(json)}
        });
    }
    ///获取客服id列表
    function getServerList(callback,noAsync){
        var async = noAsync ? false : true;
        $.ajax({
            type: "POST",
            async: async,
            url: "/system/services",
            dataType: "json",
            success: function(json){callback(json)}
        });
    }
    ///屏蔽群或者个人
    function setDisturb(oid,act,type,callback,noAsync){
        var async = noAsync ? false : true;
        var id=user.userid;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/set-disturb",
            data: {
                uid:id,
                oid:oid,
                act:act,
                type:type
            },
            dataType: "json",
            success: function(json){callback(json)}
        });
    }
    ///修改好友备注、分组
    function changeFriend(oid,type,val,callback,noAsync){
        var async = noAsync ? false : true;
        var id=user.userid;
        var data={
            uid:id,
            oid:oid
        };
        if(type == 'group'){
            data['gid']=val;
        } else {
            data['title']=val;
        }
        $.ajax({
            type: "POST",
            async: async,
            url: "/user/modify-friend",
            data:data ,
            dataType: "json",
            success: function(json){callback(json)}
        });
    }
    ///获取置顶列表
    function getPinned(callback,noAsync){
        var async = noAsync ? false : true;
        var id=user.userid;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/session-top-queue",
            data: {
                sid:id
            },
            dataType: "json",
            success: function(json){callback(json)}
        });
    }
    ///置顶
    function pinnedTop(tId,callback,noAsync){
        var type=tId.split('-')[0];
        var rid=tId.split('-')[1];
        var async = noAsync ? false : true;
        var id=user.userid;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/session-top",
            data: {
                sid:id,
                rid:rid,
                type:type
            },
            dataType: "json",
            success: function(json){callback(json)}
        });
    }
    ///取消置顶
    function pinnedOff(tId,callback,noAsync){
        var type=tId.split('-')[0];
        var rid=tId.split('-')[1];
        var async = noAsync ? false : true;
        var id=user.userid;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/session-top-cancel",
            data: {
                sid:id,
                rid:rid,
                type:type
            },
            dataType: "json",
            success: function(json){callback(json)}
        });
    }

    ///获取黑名单列表
    function getBlackList(callback,noAsync){
        var async = noAsync ? false : true;
        var id=user.userid;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/get-black-list",
            data: {
                uid:id
            },
            dataType: "json",
            success: function(json){callback(json)}
        });
    }
    ///加入黑名单列表
    function addBlackList(oid,callback,noAsync){
        var async = noAsync ? false : true;
        var id=user.userid;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/add-black-list",
            data: {
                uid:id,
                oid:oid
            },
            dataType: "json",
            success: function(json){callback(json)}
        });
    }
    ///移出黑名单列表
    function delBlackList(oid,callback,noAsync){
        var async = noAsync ? false : true;
        var id=user.userid;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/del-black-list",
            data: {
                uid:id,
                oid:oid
            },
            dataType: "json",
            success: function(json){callback(json)}
        });
    }
    ///获取在线状态
    function getOnlineStatus(oid,noAsync){
        var async = noAsync ? false : true;
        var id=user.userid;
        $.ajax({
            type: "POST",
            async: async,
            url: "/user/get-online-status",
            data: {
                uid:id,
                oid:oid
            },
            dataType: "json",
            success: function(json){
                if(json.status){
                    for(var i=0;i<json.data.length;i++){
                        render.state.chatList['P-'+json.data[i]['userId']]['status']=json.data[i]['status'];
                    }
                }
            }
        });
    }
///设置自动回复
    function setAutoReply(type,param,offline,auto,callback,noAsync){
        var async = noAsync ? false : true;
        var id=user.userid;
        $.ajax({
            type: "POST",
            async: async,
            url: "/user/set-auto-reply",
            data: {
                uid:id,
                param:param,
                type:type,
                offline:offline?'1':'0',
                auto:auto?'1':"0"
            },
            dataType: "json",
            success: function(json){callback(json)}
        });
    }
    //获取自动回复设置
    function getAutoReply(id,req,callback,noAsync){
        var async = noAsync ? false : true;
        var data= {uid:id};
        if(req){
            data['reqId']=user.userid;
        }
        $.ajax({
            type: "POST",
            async: async,
            url: "/user/get-auto-reply",
            data:data,
            dataType: "json",
            success: function(json){callback(json)}
        });
    }
//保存聊天记录
    function saveMsgAjax(msg,callback,noAsync){
        var jsonData=JSON.stringify(msg);
        var type = 'P';
        var Sdata;
        if(msg['operation']=='sendgroup'){
            if(msg['gchatid']){
                type='G';
                Sdata={groupId:msg.gchatid,msg:jsonData,type:type};
            }else if(msg['groupid']){
                type='G';
                Sdata={groupId:msg.groupid,msg:jsonData,type:type};
            }
        } else {
            Sdata={sendId:msg.senderid,receiveId:msg.recevierid,msg:jsonData,type:type}
        }
        var async = noAsync ? false : true;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/create-message",
            data: Sdata,
            dataType: "json",
            success: function(json){callback(json)}
        });
    }

//创建与用户id的会话记录
    function createSession(id,type,callback){
        $.post('/chat/create-session',{param : type+'-'+id},function(json){callback(json)},'json');
    }

//获取与用户id的聊天历史记录
    function getChatRecord(id,type,callback,noAsync){
        var async = noAsync ? false : true;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/get-chat-record",
            data: {type:type,id:id},
            dataType: "json",
            success: function(json){callback(json)}
        });
        //$.post('/chat/get-chat-record',{type:type,id:id},function(json){callback(json)},'json');
    }

//添加好友 - 搜索用户
    function getExactSearch(keyword,callback,noAsync){
        var async = noAsync ? false : true;
        $.ajax({
            type: "POST",
            async: async,
            url: "/user/exact-search",
            data: {keyword:keyword},
            dataType: "json",
            success: function(json){callback(json)}
        });
    }
//添加好友 - 请求
    function AddFriend(fid,gid,msg,callback,noAsync){
        var async = noAsync ? false : true;
        $.ajax({
            type: "POST",
            async: async,
            url: "/user/add-friend",
            data: {
                fid:fid,
                gid:gid,
                msg:msg
            },
            dataType: "json",
            success: function(json){callback(json)}
        });
    }
//添加好友 - 通过好友认证

    function VerifyFriend(fid,gid,msg,callback,noAsync){
        var async = noAsync ? false : true;
        $.ajax({
            type: "POST",
            async: async,
            url: "/user/verify-friend",
            data: {
                fid:fid,
                gid:gid,
                msg:msg
            },
            dataType: "json",
            success: function(json){callback(json)}
        });
    }

//发起群聊
    function launch(ids,name,photo,callback,noAsync){
        var async = noAsync ? false : true;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/create-group-chat",
            data: {userId:user.userid,ids:ids,names:name,photos:photo},
            dataType: "json",
            success: function(json){callback(json)},
            error:function(){
                tips.show('链接错误，请稍后重试');
            }
        });
        //$.post('/chat/get-detail',{uid:id},function(json){callback(json)},'json');
    }
    //邀请进入群聊
    function inviteGroupChat(ids,gid,callback,noAsync){
        var async = noAsync ? false : true;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/invite-group-chat",
            data: {
                uid:user.userid,
                gid:gid,
                ids:ids
            },
            dataType: "json",
            success: function(json){callback(json)}
        });
        //$.post('/chat/get-detail',{uid:id},function(json){callback(json)},'json');
    }
    //邀请进入群聊
    function delGroupChatUsers(ids,gid,callback,noAsync){
        var async = noAsync ? false : true;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/del-group-chat-users",
            data: {
                uid:user.userid,
                gid:gid,
                ids:ids
            },
            dataType: "json",
            success: function(json){callback(json)}
        });
        //$.post('/chat/get-detail',{uid:id},function(json){callback(json)},'json');
    }
    //发起群聊
    function launch(ids,name,photo,callback,noAsync){
        var async = noAsync ? false : true;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/create-group-chat",
            data: {userId:user.userid,ids:ids,names:name,photos:photo},
            dataType: "json",
            success: function(json){callback(json)}
        });
        //$.post('/chat/get-detail',{uid:id},function(json){callback(json)},'json');
    }
    //退出群聊
    function delMyGroupChat(gid,callback,noAsync){
        var async = noAsync ? false : true;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/del-my-group-chat",
            data: {
                uid:user.userid,
                gid:gid
            },
            dataType: "json",
            success: function(json){callback(json)}
        });
        //$.post('/chat/get-detail',{uid:id},function(json){callback(json)},'json');
    }

    //退出群聊
    function UpdateGroupChat(gid,invite,callback,noAsync){
        var async = noAsync ? false : true;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/update-group-chat",
            data: {
                uid:user.userid,
                gid:gid,
                invite:invite.toString()
            },
            dataType: "json",
            success: function(json){callback(json)}
        });
        //$.post('/chat/get-detail',{uid:id},function(json){callback(json)},'json');
    }

    //解析二维码
    function parseQrcode(path,callback,noAsync){
        var async = noAsync ? false : true;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/parse-qrcode",
            data: {
                path:path
            },
            dataType: "json",
            success: function(json){callback(json)}
        });
    }
    ///查询群组信息---二维码
    function groupQrCode(gid,callback,noAsync){
        var async = noAsync ? false : true;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/group-qr-code",
            data: {
                uid:user.userid,
                gid:gid
            },
            dataType: "json",
            success: function(json){callback(json)}
        });
    }
    ///加入群--二维码
    function JoinByGroupQrCode(gid,callback,noAsync){
        var async = noAsync ? false : true;
        $.ajax({
            type: "POST",
            async: async,
            url: "/chat/join-by-group-qr-code",
            data: {
                uid:user.userid,
                gid:gid
            },
            dataType: "json",
            success: function(json){callback(json)}
        });
    }


///ajax请求======================================================end

//判断个人是G群组或者P个人
    function userType(user){
        if('type' in user){
            return user['type'];
        }else if('gchatid' in user){
            if(user.gchatid){
                return 'G';
            }
        }else if('groupid' in user){
            return 'G';
        }else if('userid' in user){
            return 'P';
        }
    }
//判断消息是G群组或者P个人
    function msgType(msg){
        if(msg['operation']=='sendgroup'){
            return 'G';
        }
        return 'P';
    }
    clickSendMsgTo();//点击弹窗发送信息
    clickNotice();///

    //开启WebSocket
    var tempOffMsg=false;
    function openSocket(call){
        function getLogin(){
            var loginJson = {
                'senderid'   : user.userid,
                'operation'  : 'online',
                'clientType' : 'web',
                'content'  : user.token
            };
            return JSON.stringify(loginJson);
        }
        if('WebSocket' in window){
            _socket = new WebSocket(_server);
        }else if('MozWebSocket' in window){
            window.WebSocket=window.MozWebSocket;
            _socket = new WebSocket(_server);
        }else{
            //new SockJs
            window.confirm('您的浏览器版本太过老旧，不支持聊天，请您升级浏览器或者切换极速内核');
            window.location.href='/user/logout';
        }
        _socket.onopen = function(){
            if(user==undefined||user==null){
                window.location.href='/user/logout';
            }
            //连接开启后 发送登录指令
            var loginMsg = getLogin();
            sendSocket(loginMsg);
        };
        //websocket关闭重连
        _socket.onclose = function() {
            if(render.state.isLogin){
                openSocket();
            }
        };
        //接收消息
        _socket.onmessage = function(event){
            console.log('接收='+event.data);
            var _data = JSON.parse(event.data);
            //客户端请求响应
            if(_data.type){
                switch(_data.type){
                    case 'online':
                        //登录返回信息
                        if(_data.status == 'success' && !render.state.isLogin) {
                            ///登录成功获取会话列表
                            render.state.isLogin=true;
                            var msg='{"senderid":'+user.userid+',"operation":"hisMsg","type":"session2"}';
                            sendSocket(msg);
                            tempOffMsg=_data;///暂存离线msg
                        }else if(render.state.isLogin){
                            if(typeof call ==='function'){
                                call();
                            }
                            $("#loading").hide();
                            $("#Msg").attr('disabled',false).focus();
                            //render.systemTips('断网重连 - -!');
                        }else {
                            openSocket();
                        }
                        break;
                    case 'hisMsg':
                        if(_data.status == 'success') {
                            //历史消息/会话列表
                            handleHisMsg(_data);
                        }
                        break;
                    case 'getOffMsg':
                        if(_data.status == 'success') {
                            //接收离线消息 发送已接收指令
                            handleOffMsg(_data);
                        }
                        break;
                    //case 'readOffMsgOk':
                    //    if( !(Object.prototype.isPrototypeOf(_data.group) && Object.keys(_data.group).length === 0)){
                    //        getGroupOffMsg(_data);
                    //    }
                    //    break ;
                    case 'sendmsg':
                    case 'sendgroup':
                        //发送消息返回确认信息
                        if(_data.status == 'success'){
                            sendMsgSuccess(_data);
                            if('groupid' in tempMsg[_data.msgId] && tempMsg[_data.msgId].groupid != 0){
                                var tId='G-'+tempMsg[_data.msgId].groupid;
                            }else {
                                var tId='P-'+tempMsg[_data.msgId].recevierid;
                            }
                            //if(tId==render.state.chatId){
                                autoMsg(tId);
                            //}

                            delete tempMsg[_data.msgId];
                        }else {
                            if(!(_data.message=='isBlack')){
                                render.systemTips(_data.message,false,render.state.chatId);
                            }
                            sendMsgFail(_data);
                        }
                        //var msgId=_data.msgId;
                        //var temp=tempMsg[msgId];
                        //if(_data.status == 'success'){
                        //    //确认消息发送成功并存储消息
                        //    temp.sendtime=_data.sendtime;
                        //    if('groupid' in temp && temp.groupid != 0){
                        //        var recevierid=temp.groupid;
                        //    }else {
                        //        var recevierid=temp.recevierid;
                        //    }
                        //    saveMsg(temp,recevierid);//缓存信息
                        //    var type=msgType(temp);
                        //    var tId=type+'-'+recevierid;
                        //    if(tId==render.state.chatId){
                        //        if(temp.msgtype == 'image' ||temp.msgtype == 'file'){
                        //            var content=render.getChat(temp,true);
                        //            var id='load'+upfile[_data.msgId];
                        //            delete  upfile[_data.msgId];
                        //            var elem=$("#chatBox .box_bd");
                        //            var bSrollTop=elem.scrollTop();
                        //            var bScrollHeight=elem[0].scrollHeight;
                        //            var bH=elem.height();
                        //            $("#chatBox .bubble_cont[data-padding='"+id+"']").html(content).removeAttr('data-padding').parent('.bubble').addClass(getMT(temp));
                        //            if(render.state.senderTemp.length>0){
                        //                render.getGroupSender();
                        //            }
                        //            clickMessage();
                        //            if( _data.senderid == user.userid|| (bSrollTop+bH) == bScrollHeight || (bScrollHeight-bSrollTop-bH)<200){///插入新信息前滚动条是否到底（200px 高度）
                        //                setTimeout(function(){
                        //                    scrollBottom();
                        //                },0);
                        //            }else{
                        //                render.ToNewMsgTips();
                        //            }
                        //        }else {
                        //            render.appendChat(temp);
                        //        }
                        //        if(type=='P'){
                        //            autoMsg(tId);
                        //        }
                        //    }
                        //    activeList(temp,(_data.senderid == user.userid));
                        //}else {
                        //    _data.message=='isBlack'?null:render.systemTips(_data.message,false,render.state.chatId);
                        //}
                        //delete tempMsg[_data.msgId];
                        break;
                    case 'unlogin':
                        render.state.isLogin=false;
                        var loginMsg=getLogin();
                        sendSocket(loginMsg);
                        break;
                    case 'offline':
                        if(_data.status== 'success'){
                            render.state.isLogin=false;
                            _socket.close();
                            window.location.href='/user/logout';
                        }
                        break;
                    case 'withdraw':
                        tips.show(_data.message);
                        if(_data.status=='success'){
                            //var tId=(_data.msgtype=='user'?'P-':'G-')+_data.recevierid;
                            var tId=render.state.chatId;
                            var flag=reMsg(tId,_data.msgId,'del');
                            if(flag){
                                var msg=$("#chatBox .bubble[data-id="+_data.msgId+"]").closest('.message');
                                msg.hasClass('me') ? msg.animateCss('zoomOutRight','remove') : msg.animateCss('zoomOutLeft','remove');
                            }
                            render.systemTips('您撤回了一条消息',false,tId);
                        }
                        break;
                    default:
                        break;
                }
            }
            //服务器主动推送
            if(_data.operation){
                switch(_data.operation){
                    case 'sendmsg':
                        //接受新消息并返回获取成功
                        newMsg(_data);
                        var tId='P-'+_data.senderid;
                        if((render.state.chatList[tId] && _data['v1'] > render.state.chatList[tId]['v1']) || !render.state.chatList[tId]){
                            getUserInfo(_data.senderid,'', function (json) {
                                if(json['status']){
                                    var info=json['data'];
                                    info['type']='P';
                                    info['tId']=tId;
                                    render.state.chatList[tId]=info;
                                    var name=getName(info,Pname);
                                    updateInfo(info);

                                }

                            });
                        }
                        if(isHandleMsg(_data)){
                            var getMsgOk={
                                "senderid":user.userid,
                                "operation":"getMsgOk",
                                "content":_data.msgSeq,
                                "msgType":"user"
                            };
                            sendSocket(JSON.stringify(getMsgOk));
                        }
                        break;
                    case 'sendgroup':
                        newMsg(_data);
                        var tId='G-'+_data.groupid;
                        if(chatUser[tId]&&chatUser[tId][_data.senderid] && (_data['v1'] > chatUser[tId][_data.senderid]['v1'])){
                            getMemberDetail(_data.groupid ,_data.senderid, function (json) {
                                if(json.status){
                                    var MInfo=json.data;
                                    for(var i=0;i<render.state.group[tId].source.length;i++){
                                        if(render.state.group[tId].source[i].userid == MInfo.userid){
                                            if(render.state.chatId==tId){
                                                render.state.groupMember.source[i]=MInfo;
                                            }
                                            render.state.group[tId].source[i]=MInfo;
                                            break;
                                        }
                                    }
                                    chatUser[tId][MInfo.userid]=MInfo;
                                    updateInfo(MInfo);//更新视图
                                }
                            });
                        }
                        var id=('groupid' in _data )? _data.groupid:_data.gchatid;
                        var Gid='G-'+id;
                        if(render.state.chatList[Gid] && _data['v2'] > render.state.chatList[Gid]['v2']){
                            getGroupDetail(id,function(json){
                                if(json['status']){
                                    json.data['type']='G';
                                    json.data['tId']=Gid;
                                    render.state.chatList[Gid]=json.data;
                                    var name=json.data.name;
                                    var photo=getUserPhoto(json.data);
                                    var chat=$("#chatList .chat_item[data-id="+Gid+"]");
                                    chat.attr('title',name).find('.nickname_text').html(name);
                                    chat.find('img').attr('src',photo);
                                    if(Gid==render.state.chatId){
                                        render.state.chatName=name;
                                        //appendMembers(sender,notRenderMsg)
                                        appendMembers(json.data,true);
                                    }
                                }
                            })
                        }
                        if(isHandleMsg(_data)){
                            var getMsgOk={
                                "senderid":user.userid,
                                "operation":"getMsgOk",
                                "content":_data.msgSeq,
                                "msgType":"group",
                                "groupid":('groupid' in _data )? _data.groupid:_data.gchatid
                            };
                            sendSocket(JSON.stringify(getMsgOk));
                        }
                        break;
                    //case 'offlineMsg':
                    //    //如果有离线消息的话接收
                    //    if(_data.userCount != 0){
                    //        if(readOffMsgNum>=tempOffMsgNum){
                    //            return ;
                    //        }
                    //        getUserOffMsg(_data);
                    //        $("#msg_num").html('('+_data.userCount+')');
                    //    }
                    //    break;
                    case 'forceline':
                        //强迫下线
                        render.state.isLogin=false;
                        _socket.close();
                        var ff=window.confirm(_data.content);
                        window.location.href='/user/logout';
                        break;
                    case 'notice':
                        handleNotice(_data);
                        break ;
                    case 'ordernotice':
                        handleOrder(_data);
                        break;
                    case 'withdraw':
                        var tId;
                        if(_data.msgtype=='user'){
                            tId='P-'+_data.senderid;
                            var name=getName(render.state.chatList[tId],Pname);
                        }else{
                            tId='G-'+_data.groupid;
                            if(!chatUser[tId] || !chatUser[tId][_data.senderid]){
                                getMemberDetail(_data.groupid,_data.senderid,function(json){
                                    if(!chatUser[tId]){
                                        chatUser[tId]={};
                                    }
                                    chatUser[tId][_data.senderid]=json.data;
                                },true);
                            }
                            var name=getName(chatUser[tId][_data.senderid],Gname);
                        }
                        var flag=reMsg(tId,_data.msgId,'del');
                        if(flag){
                            removeMsg(_data.msgId);
                            render.systemTips(name+'撤回了一条消息',false,tId);
                        }
                        break;
                    case 'ping':
                        sendPing();
                        break;
                }
            }
        };
    }
    function updateInfo(MInfo){
        var name=getName(MInfo,Gname);
        var photo=getUserPhoto(MInfo);
        var chat=$("#chatBox .message[data-id=G-"+MInfo.userid+"]");
        chat.attr('title',name).find('.name').html(name);
        chat.find('img').attr('src',photo);
        var memb=$("#chat_members .member[data-id="+MInfo.userid+"]");
        memb.attr('title',name).find('.nickname').html(name);
        memb.find('img').attr('src',photo);
        if(MInfo['type']=='P'){
            $("#chatBox .message[data-id=P-"+MInfo.userid+"]").find('.name').html(name);
        }else if(MInfo['type']=='G'){
            $("#chatBox .message[data-id=G-"+MInfo.userid+"]").find('.name').html(name);
        }
    }

//发送WebSocket  msg
    function sendSocket(msg){
        if(_socket.readyState == WebSocket.OPEN){
            console.log('发送='+msg);
            _socket.send(msg);
            if(sendTimer){
                clearTimeout(sendTimer);
                sendTimer=null;
            }
            sendTimer=setTimeout(function(){sendPing()},16*60*1000);
        }else {
            openSocket(function(){sendSocket(msg)});
        }
    }
    var sendTimer=setTimeout(function(){sendPing()},16*60*1000);
    function sendPing(){
        var ping={
            "senderid":user.userid,
            "operation":"ping",
            "content":"ping "+getNow()
        };
        sendSocket(JSON.stringify(ping));
    }
    function getOffMsgAndShow(){
        ///获取离线消息并显示窗口
        if(tempOffMsg){
            tempOffMsgNum=tempOffMsg.count;
            if(tempOffMsg.userCount != 0){
                getUserOffMsg(tempOffMsg);
            }
            if( !(Object.prototype.isPrototypeOf(tempOffMsg.group) && Object.keys(tempOffMsg.group).length === 0)){
                getGroupOffMsg(tempOffMsg);
            }
        }
        var main_inner=$("div.main_inner");
        var perLoad=$("#preLoad");
        if(chatter){//判断是否有接受者
            getUserInfo(chatter.userid,'',function(json){
                toChat(json.data,chatter.online);//跳转聊天
            });
        }
        perLoad.animateCss('fadeOutUp',function(per){
            per.remove();
            main_inner.show().animateCss('fadeInDown');
        });
        //perLoad.addClass('scal');
        //setTimeout(function(){
        //    perLoad.remove();
        //    main_inner.show();
        //    setTimeout(function(){
        //        main_inner.addClass('ready');
        //    },0);
        //},400);
        getContactList();
    }
///处理历史记录/会话列表
    function handleHisMsg(msg){
        switch (msg.hisType){
            case 'session2':
                render.chatList(msg.dataList);//生成会话列表
                updatelocalList();
                var ids=[];
                for(var k in render.state.chatList){
                    if(render.state.chatList[k].type=='P'){
                        ids.push(k.split('-')[1]);
                    }
                }
                ids=ids.join(',');
                getOnlineStatus(ids);
                if(renderNotice.state.hasNotice || renderOrder.state.hasOrder){
                    ///获取历史系统通知
                    var msg={
                        "senderid":user.userid,
                        "count":historyNum,
                        "operation":"hisMsg",
                        "type":"notice"
                    };
                    renderNotice.state.hasNotice?sendSocket(JSON.stringify(msg)):null;
                    ///获取历史订单通知
                    var msg={
                        "senderid":user.userid,
                        "count":historyNum,
                        "operation":"hisMsg",
                        "type":"ordernotice"
                    };
                    renderOrder.state.hasOrder?sendSocket(JSON.stringify(msg)):null;
                }else {
                    getOffMsgAndShow();
                }
                break;
            case 'notice':
                if(msg.status=='success'){
                    var list=sortByTime(msg.dataList);
                    var listId=[];
                    for(var i=list.length-1;i>=0;i--){
                        if(!('msgtype' in list[i] && list[i]['msgtype']=='addfriends' ) && list[i]['operation']!='ordernotice'){
                            var _id=list[i].senderid;
                            if(listId.indexOf(_id) == -1){
                                listId.push(_id);
                            }
                            if(_id in renderNotice.state.msg){
                                renderNotice.state.msg[_id].unshift(list[i]);
                            }else{
                                renderNotice.state.msg[_id]=[list[i]];
                            }
                        }

                    }
                    var systemList='';
                    for(var k=0;k<listId.length;k++){
                        var _old=renderNotice.state.msg[listId[k]][renderNotice.state.msg[listId[k]].length-1];
                        systemList+=renderNotice.getNoticeItem(_old,false,false);
                    }
                    if (systemList != '') {
                        $("#systemList .nav_view").html(systemList)
                    }
                    var systemTemp=sessionStorage.getItem('system-'+user.userid);
                    if(systemTemp && systemTemp!=''){
                        systemTemp=JSON.parse(systemTemp);
                        for (var key in systemTemp){
                            if(systemTemp[key]>0){
                                $("#systemList .chat_item[data-id="+key+"]").find(".avatar").append('<i class="icon woxin_reddot"></i>');
                            }
                        }
                        $("#sys_num").html(systemTemp['temp']);
                    }
                    clickNotice();
                    getOffMsgAndShow();
                }
                break;
            case 'ordernotice':
                if(msg.status=='success'){
                    var list=sortByTime(msg.dataList);
                    var listId=[];
                    for(var i=list.length-1;i>=0;i--){
                        if(!('msgtype' in list[i] && list[i]['msgtype']=='addfriends')){
                            var _id=list[i].senderid;
                            if(listId.indexOf(_id) == -1){
                                listId.push(_id);
                            }
                            if(_id in renderOrder.state.msg){
                                renderOrder.state.msg[_id].unshift(list[i]);
                            }else{
                                renderOrder.state.msg[_id]=[list[i]];
                            }
                        }

                    }
                    var orderList='';
                    for(var k=0;k<listId.length;k++){
                        var _old=renderOrder.state.msg[listId[k]][renderOrder.state.msg[listId[k]].length-1];
                        orderList+=renderOrder.getOrderItem(_old,false,false);
                    }
                    if (orderList != '') {
                        $("#orderList .nav_view").html(orderList)
                    }
                    var orderTemp=sessionStorage.getItem('order-'+user.userid);
                    if(orderTemp && orderTemp!=''){
                        orderTemp=JSON.parse(orderTemp);
                        for (var key in orderTemp){
                            if(orderTemp[key]>0){
                                $("#orderList .chat_item[data-id="+key+"]").find(".avatar").append('<i class="icon woxin_reddot"></i>');
                            }
                        }
                        $("#order_num").html(orderTemp['temp']);
                    }
                    clickOrder();
                    getOffMsgAndShow();
                }
                break;
            case 'sendmsg':
            case 'sendgroup':
                var tId,done=false;
                if(msg.dataList.length == 0){
                    $("#moreMsg").closest('.message').remove();
                    $("#chatBox .box_bd").prepend(render.systemTips('已无更多记录',true));
                    return ;
                }else if(msg.dataList.length < nextHistory){
                    done=true;
                }
                if(msg.hisType=='sendgroup'){
                    tId='G-'+msg.groupid;
                }else {
                    tId='P-'+msg.recevierid;
                }
                if(!(tId in localMsg)){
                    localMsg[tId]=[];
                }
                if(!(tId in currentMSg)){
                    currentMSg[tId]=[];
                }
                var start=localMsg[tId].length;
                for(var i =0 ;i<msg.dataList.length;i++){
                    var tempData=msg.dataList[i];
                    for(var k=0;k<localMsg[tId].length;k++){
                        if( ('msgId' in localMsg[tId][k] && 'msgId' in msg.dataList[i] &&  localMsg[tId][k].msgId == msg.dataList[i].msgId) || ('msgSeq' in localMsg[tId][k] && 'msgSeq' in msg.dataList[i] &&  localMsg[tId][k].msgSeq == msg.dataList[i].msgSeq)){
                            tempData=false;
                        }
                    }
                    for(var p=0;p<currentMSg[tId].length;p++){
                        if(('msgId' in currentMSg[tId][p] && 'msgId' in msg.dataList[i] && currentMSg[tId][p]['msgId'] == msg.dataList[i].msgId )|| ('msgSeq' in currentMSg[tId][p] && 'msgSeq' in msg.dataList[i] && currentMSg[tId][p]['msgSeq'] == msg.dataList[i].msgSeq)){
                            tempData=false;
                        }
                    }
                    if(tempData){
                        localMsg[tId].push(msg.dataList[i]);
                    }
                }
                if(render.state.chatId == tId){
                    //var start=parseInt($("#moreMsg").attr('data-index'),10)-nextHistory;
                    render.chatBox(tId,start,localMsg[tId].length,done);
                }
                break;
        }
    }
    function sortByTime(list){//list=[{sendtime:'yyyy-mm-dd hh:mm:ss'}]
        return list.sort(function(a,b){
            var atime= a.sendtime.split(' ');
            var btime= b.sendtime.split(' ');
            var adate=atime[0].split('-');
            var bdate=btime[0].split('-');
            for(var i= 0;i<3;i++){
                if(adate[i]>bdate[i]){
                    return 1;
                }else if(adate[i]<bdate[i]){
                    return -1
                }
            }
            if(atime[0]==btime[0]){
                var arr=atime[1].split(':');
                var brr=btime[1].split(':');
                for (var k= 0;k<3;k++ ){
                    if(arr[k]>brr[k]){
                        return 1;
                    }else if(arr[k]<brr[k]){
                        return -1
                    }else{
                        return 0;
                    }
                }
            }
        });

    }


//处理离线消息 data
    function handleOffMsg(data){
        var TEMP;
        if('dataList' in data){
            var type='P';
            var msgSeq=[];
            for(var i in data.dataList){
                TEMP=data.dataList[i];
                //通知信息处理
                if(data.dataList[i].operation=='notice'){
                    handleNotice(TEMP,true);
                }else if(TEMP.operation=='ordernotice'){
                    handleOrder(TEMP,true);
                }else {
                    if(isHandleMsg(TEMP)){
                        msgSeq.push(TEMP.msgSeq);
                    }
                    if(data.msgType=='group'){
                        type='G';
                        var senderid = data.groupid;
                    }else {
                        type='P';
                        var senderid = TEMP.senderid;
                    }
                    newMsg(TEMP);
                }

            }
            updataMsgNum(type+'-'+senderid);
            msgSeq=msgSeq.join(',');
            var read={
                "senderid":user.userid,
                "operation":"readOffMsgOk",
                "content":msgSeq
            };
            if(type== 'G'){
                read['msgType']='group';
                read['groupid']=data.groupid;
            }else {
                read['msgType']='user';
            }
            var readMsg=JSON.stringify(read);
            sendSocket(readMsg);
        }
    }

//获取离线消息
    function getUserOffMsg(data){
        if(readOffMsgNum>=tempOffMsgNum){
            return ;
        }
        var msg={
            "senderid":user.userid,
            "operation":"getOffMsg",
            "num":data.userCount,
            "msgType":"user",
            "sortType":"asc"
        };
        msg=JSON.stringify(msg);
        readOffMsgNum+=data.userCount;
        sendSocket(msg);
    }

    function getGroupOffMsg(data){
        if(readOffMsgNum>=tempOffMsgNum){
            return ;
        }
        for(var id in data.group){
            var msg={
                "senderid":user.userid,
                "operation":"getOffMsg",
                "num":data.group[id],
                "msgType":"group",
                "groupid": id,
                "sortType":"asc"
            };
            msg=JSON.stringify(msg);
            readOffMsgNum+=data.group[id];
            sendSocket(msg);
        }
    }

    ////确认弹窗
    ///
    var confirmModel={
        option:{
            hide:true,//
            content:'确定吗？',///显示内容
            btn:[],//按键
            cancel:true,///默认有取消按键，回调为隐藏弹窗
            confirm:false///默认确定按键，回调为隐藏弹窗
        },
        cancelBtn:{//取消按键
            name:'取消',//按键名称
            className:'cancel',//按键样式classname
            callback:function(){///按键回调事件
                confirmModel.hide();
            }
        },
        confirmBtn:{//取消按键
            name:'确定',//按键名称
            className:'',//按键样式classname
            callback:function(){///按键回调事件
                confirmModel.hide();
            }
        },
        elem:null,
        isShow:false,
        render:function(option){
            var that=this;
            var newOption= $.extend({},that.option,option);
            var html='<div class="confirm-overlay" id="confirm-overlay" tabindex="-1" ></div><div class="confirmModel" id="confirmModel">' +
                '<p class="confirm_content">'+newOption.content+'</p>' + '</div>';
            $('body').append(html);
            that.isShow=true;
            that.elem=$("#confirmModel");
            var btn=newOption.btn;
            if(newOption.confirm){
                btn.push(that.confirmBtn);
            }
            if(newOption.cancel){
                btn.push(that.cancelBtn);
            }
            that.btns(btn);
        },
        btns:function(btn){
            var that=this;
            for(var i=0;i<btn.length;i++){
                var button=$('<button class="confirm_btn '+(btn[i].hasOwnProperty('className')?btn[i]['className']:'')+'">'+btn[i].name+'</button>');
                that.elem.append(button);
                if(typeof btn[i].callback ==='function'){
                    (function(i){
                        return button.click(function(){
                            btn[i].callback();
                        });
                    })(i);
                }
            }
        },
        show:function(option){
            var that=this;
            if(that.isShow){
                that.hide();
            }
            that.render(option);
            $("#confirm-overlay").show();
            that.elem.show().animateCss('bounceIn');
        },
        hide:function(){
            var that=this;
            that.elem.hide().remove();
            that.option.btn=[];
            $("#confirm-overlay").hide().remove();
            that.isShow=false;
        }
    };
//WebSocket===========================================end
//是否可处理信息
    function isHandleMsg(msg,opera){
        var type=[
            'text','file','image','url','hint','position','movie','vibration',//聊天
            'offline',//离线
            'addfriends','newfriend',///好友请求
            'promotion','promotioncity','promotionself','withdrawcash','transfer',//系统通知
            'order'//订单通知
        ];
        if('msgtype' in msg){
            if(type.indexOf(msg.msgtype)>=0){
                return true;
            }
        }
        if(opera){
            var operation=['sendmsg','sendGroup','offlline','ordernotice','notice'];
            if('operation' in msg){
                if(operation.indexOf(msg.operation)>=0){
                    return true;
                }
            }
        }
        return false;
    }


    //////发送信息中
    function  sendingMsg(temp){
        activeList(temp,(temp.senderid == user.userid));
        if('groupid' in temp && temp.groupid != 0){
            var recevierid=temp.groupid;
        }else {
            var recevierid=temp.recevierid;
        }
        saveMsg(temp,recevierid);//缓存信息
        //if(isResend){
        //    var msg=$("#chatBox .right[data-id="+temp.msgId+"]");
        //    msg.find(".ico_send_fail").replaceWith('<img class="ico_sending" src="/img/sending.gif" alt="">');
        //    return ;
        //}
        if(temp['tId'] == render.state.chatId){
            var id='load'+upfile[temp.msgId];
            var bubble=$("#chatBox .bubble_cont[data-padding='"+id+"']");
            if((temp.msgtype == 'image' ||temp.msgtype == 'file') && bubble.length>0){
                var content=render.getChat(temp,true);
                var elem=$("#chatBox .box_bd");
                var bSrollTop=elem.scrollTop();
                var bScrollHeight=elem[0].scrollHeight;
                var bH=elem.height();
                bubble.html(content).removeAttr('data-padding').parent('.bubble').addClass(getMT(temp));
                if(render.state.senderTemp.length>0){
                    render.getGroupSender();
                }
                clickMessage();
                if( temp.senderid == user.userid|| (bSrollTop+bH) == bScrollHeight || (bScrollHeight-bSrollTop-bH)<200){///插入新信息前滚动条是否到底（200px 高度）
                    setTimeout(function(){
                        scrollBottom();
                    },0);
                }else{
                    render.ToNewMsgTips();
                }
                tempMsg[temp.msgId]['elem']=bubble.closest('.message');
            }else {
                tempMsg[temp.msgId]['elem']=render.appendChat(temp);

            }
        }
    }
    ///发送信息失败
    function sendMsgFail(data){
        var tId=tempMsg[data.msgId]['tId'];
        var temp=currentMSg[tId];
        for(var i=temp.length-1;i>=0;i--){
            if(temp[i].hasOwnProperty('msgId') && temp[i]['msgId']==data.msgId){
                currentMSg[tId][i]['send']='error';
                clearTimeout(currentMSg[tId][i]['timer']);
                var msg=$("#chatBox .right[data-id="+data.msgId+"]");
                msg.find(".ico_sending").replaceWith(getSendMsgError(data.msgId));
                bindResend();
                break;
            }
        }
    }
    function getSendMsgError(msgId){
        return '<i class="ico_send_fail" title="重新发送" data-msgId="'+msgId+'"></i>';
    }
    ///发送信息成功
    function sendMsgSuccess(data){
        var tId=tempMsg[data.msgId]['tId'];
        var temp=currentMSg[tId];
        for(var i=temp.length-1;i>=0;i--){
            if(temp[i].hasOwnProperty('msgId') && temp[i]['msgId']==data.msgId){
                currentMSg[tId][i]['send']='success';
                currentMSg[tId][i]['sendtime']=data['sendtime'];
                var msg=$("#chatBox .right[data-id="+data.msgId+"]");
                clearTimeout(tempMsg[data.msgId]['timer']);
                msg.find(".ico_sending").remove();
                var time=msg.closest(".message").find('.message_system>.content');
                if(time != ''){
                    time.html(data['sendtime'].split(' ')[1]);
                }
                if(temp[i]['msgtype'] == 'image' || temp[i]['msgtype'] == 'file'){
                    delete  upfile[temp[i].msgId];
                }
                break;
            }
        }
    }
    ///点击图标重新发送
    function bindResend(){
        $("#chatBox .ico_send_fail").unbind('click').click(function(){
            var msgId= $(this).attr('data-msgId');
            var msg=JSON.parse(tempMsg[msgId]['msg']);
            var tId=render.state.chatId;
            var msgDOM=$("#chatBox .right[data-id="+msgId+"]");
            msgDOM.closest(".message").remove();
            delCurrentMsg(tId,msgId);
            sendMsg(msg,render.state.chatId);
        });
    }

//聊天收发消息=============================================begin

    function sendMsg(data,tId,noShow){
        var msg=JSON.stringify(data);
        //临时缓存对话
        tempMsg[data.msgId]=data;
        tempMsg[data.msgId]['send']='sending';////信息状态'sending'发送中 'error'发送失败或者超时 'success'发送成功
        tempMsg[data.msgId]['sendtime']=getNow();
        tempMsg[data.msgId]['tId']=tId;
        tempMsg[data.msgId]['msg']=msg;
        if(!noShow){
            tempMsg[data.msgId]['timer']=setTimeout(function(){
                sendMsgFail(tempMsg[data.msgId]);
            },sendMsgWaiTime);
            sendingMsg(tempMsg[data.msgId]);
        }
        sendSocket(msg);
    }

//保存消息至服务器以及本地缓存currentMSg
    function saveMsg(data,id){
        if(id == undefined || id ==null){
            return false;
        }
        var type=msgType(data);
        var tempId=type+'-'+id;
        return addCurrentMsg(data,tempId);
        //ajax 保存聊天记录
        //saveMsgAjax(data);
    }

//接收新消息
    function newMsg(data){
        var senderid,newList;
        var type=msgType(data);
        if(type == 'G'){
            if('gchatid' in data && data.gchatid){
                senderid=data.gchatid;
            }else {
                senderid=data.groupid;
            }
        }else {
            senderid=data.senderid;
        }
        var tempId=type+'-'+senderid;
        ///已存储信息跳出
        if(tempId in localMsg && data.hasOwnProperty('msgSeq')){
            for(var m=0;m<localMsg[tempId].length;m++){
                if(localMsg[tempId][m]['msgSeq'] == data.msgSeq){
                    return ;
                }
            }
        }
        if(tempId in currentMSg && data.hasOwnProperty('msgSeq')){
            for(var m=0;m<currentMSg[tempId].length;m++){
                if(currentMSg[tempId][m]['msgSeq'] == data.msgSeq){
                    return ;
                }
            }
        }
        if(tempId in currentMSg && data.hasOwnProperty('msgId')){
            for(var I=0; I < currentMSg[tempId].length ; I++){
                if(currentMSg[tempId][I]['msgId'] == data.msgId){
                    return ;
                }
            }
        }
        if(tempId in localMsg && data.hasOwnProperty('msgId')){
            for(var I=0; I < localMsg[tempId].length ; I++){
                if(localMsg[tempId][I]['msgId'] == data.msgId){
                    return ;
                }
            }
        }
        addUnreadMsg(data,tempId);
        //保存信息
        if(disturbing.indexOf(tempId)<0){
            ring();//提示有新信息
        }
        saveMsg(data,senderid);
        //是否有会话有移除会话DOM添加信息
        var list=$("#chatList .chat_item[data-id="+tempId+"]");
        var state={
            active:list.hasClass('active'),
            at:(list.hasClass('at') && !list.hasClass('readed'))
        };
        if(list.length !=0 && list.hasClass('active')){
            render.appendChat(data);
        }
        if(data['msgtype'] && data['msgtype']=='vibration' ){//抖动窗口
            //var win=$('div.main_inner').addClass('shakeWin');
            //setTimeout(function(){
            //    win.removeClass('shakeWin');
            //},1200);
            $('div.main_inner').animateCss('shake');
        }


        //是否在用户列表里
        if(tempId in render.state.chatList){
            var sender=render.state.chatList[tempId];
            newList = render.getChatList(sender,data,state);
        }else {
            //ajax创建对话
            //ajax获取个人信息
            if(type=='P'){
                getUserInfo(senderid,'',function(json){
                    json.data['type']='P';
                    json.data['tId']='P-'+senderid;
                    render.state.chatList[tempId]=json.data;
                    newList = render.getChatList(json.data,data,state);
                    updateMsgSet(tempId);
                },true);
            }else {
                getGroupDetail(senderid,function(json){
                    json.data['type']='G';
                    json.data['tId']='G-'+senderid;
                    render.state.chatList[tempId]=json.data;
                    newList = render.getChatList(json.data,data,state);
                },true)
            }
        }
        if((disturbing.indexOf(tempId)==-1) && !state.active ){
            popNotice(data,render.state.chatList[tempId]);
        }

        handleSession(tempId,newList);
        updataMsgNum(tempId);
        clickSession();

    }
    function ring(){
        flash.flash_title();
        if(render.state.ring){
            var voice = document.getElementById('chatAudio');
            voice.volume=1.0;
            voice.play();
        }
    }
    function addUnreadMsg(jsonData,tid){
        if(disturbing.indexOf(tid)>-1){
            return ;
        }
        //if(isHandleMsg(jsonData)){
            if(tid in unreadMsg){
                unreadMsg[tid].push(jsonData);
            }else {
                unreadMsg[tid]=[jsonData];
            }
            if(!$("#menu_chat").hasClass('active') && $("#chatList .chat_item[data-id="+tid+"]").hasClass('active')){
                unreadMsgNum+=1;
            }
            updataMsgNum(tid);
        //}
    }

//删除未读缓存
    function delUnreadMsg(jsonData,tid){
        if( tid in unreadMsg){
            var temp=unreadMsg[tid];
            for(var i=0;i< temp.length;i++){
                if(temp[i].msgId==jsonData.msgId){
                    temp.splice(i,1);
                }
            }
        }
        updataMsgNum(tid);
    }

//更新未读消息数量
    var unreadMsgNum=0;
    function updataMsgNum(tid,noNum){
        var msgNum=unreadMsgNum;
        var num=0;
        for(var k in unreadMsg){
            msgNum+=unreadMsg[k].length;
        }
        if(msgNum!=0){
            $("#msg_num").html('('+msgNum+')');
        }else {
            $("#msg_num").html('');
        }
        if(!noNum && tid && tid in unreadMsg){
            num=unreadMsg[tid].length;
            var id=tid.split('-')[1];
            var list=$("#chatList .chat_item[data-id="+tid+"]");
            if( num!=0 && disturbing.indexOf(tid)==-1){
                list.find('i.woxin_reddot').html(num);
            }
        }
    }
    $("#menu_chat").click(function(){
        unreadMsgNum=0;
        updataMsgNum();
    });

/////增加本次会话聊天记录
    function addCurrentMsg(jsonData,tid){
        if( tid in currentMSg){
            currentMSg[tid].push(jsonData);
        }else {
            currentMSg[tid]=[jsonData];
        }
    }
    function delCurrentMsg(tId,msgId){
        if(currentMSg.hasOwnProperty(tId)){
            for(var i=currentMSg[tId].length-1;i>=0;i--){
                if(currentMSg[tId][i].hasOwnProperty('msgId')&& currentMSg[tId][i]['msgId']==msgId){
                    currentMSg[tId].splice(i,1);
                    return true;
                }
            }
        }
    }

//根据消息data将会话列表用户 移到顶端并更新会话显示
    function activeList(data,noReddot){
        var _type=msgType(data);
        if(_type=='P'){
            var recevierid=data.recevierid;
        }else if(_type=='G'){
            if(data['groupid']){
                var recevierid=data.groupid;
            }else{
                var recevierid=data.gchatid;
            }
        }
        var tempId=_type+'-'+recevierid;
        var list=$("#chatList .chat_item[data-id="+tempId+"]");
        var state={
            active:list.hasClass('active'),
            at:(list.hasClass('at') && !list.hasClass('readed')),
            noReddot: noReddot ? true : false
        };
        if(!render.state.chatList[tempId]){
            getUserInfo(recevierid,_type,function(json){
                if(json.status){
                    json.data['type']=_type;
                    json.data['tId']=tempId;
                    render.state.chatList[tempId]=json.data;
                }
            },true)
        }
        var newList = render.getChatList(render.state.chatList[tempId],data,state);
        handleSession(tempId,newList);
        clickSession();
    }
    function updatelocalList(){
        var list=$("#chatList .chat_item");
        var relist=[];
        for(var i=0;i<list.length;i++){
            var tid=list.eq(i).attr('data-id');
            if(relist.indexOf(tid)==-1){
                relist.push(tid);
            }
        }
        relist=JSON.stringify(relist);
        window.localStorage.setItem('list-'+user.userid,relist);
    }
    function sortList(arr){
        var res=[];
        var list=window.localStorage.getItem('list-'+user.userid);
        if(list &&  list !='' ){
            list=JSON.parse(list);
            for(var i=0;i<list.length;i++){
                for(var k=0;k<arr.length;k++){
                    if(list[i] == arr[k]['tId']){
                        res.push(arr[k]);
                    }
                }
            }
            if(arr.length != res.length){
                for(var d=0;d<arr.length;d++){
                    if(list.indexOf(arr[d]['tId'])==-1){
                        res.push(arr[d]);
                    }
                }
            }
        }else {
            res=arr;
        }
        return res;
    }
//获取输入框内容并发送
    function getSendMsg(){
        var msg=$("#Msg").val();
        if(msg=='' || $.trim(msg)==''){
            render.systemTips('请输入发送内容');
            return ;
        }
        var type=render.state.chatType;
        var msgId=getMsgId(user.userid);
        var _json={
            'senderid'  : user.userid,
            'msgtype'   : 'text',
            'content'   : msg.replace(/<[^>]+>/g,""),
            'msgId'     : msgId
        };
        switch (type){
            case 'P':
                _json['operation'] = 'sendmsg';
                _json['recevierid']=render.state.chatId.split('-')[1];
                break;
            case 'G':
                if(renderAt.state.select.length!=0){
                    var arr=msg.split(' ');
                    var nameArr=[],selected=[],temp=renderAt.state.select;
                    for(var k=0;k<arr.length;k++){
                        if(arr[k].indexOf('@')==0){
                            nameArr.push(arr[k]);
                        }
                    }
                    for(var i=0;i<temp.length;i++){
                        if(nameArr.indexOf(temp[i].ext)>-1 && selected.indexOf(temp[i].id) == -1){
                            selected.push(temp[i].id);
                        }
                    }
                    _json['at'] = selected.join(',');
                }
                _json['operation'] = 'sendgroup';
                _json['groupid'] =render.state.chatId.split('-')[1];
                break;
        }
        $("#Msg").val('').focus();
        sendMsg(_json,render.state.chatId);
        renderAt.state.select=[];
    }
//聊天收发消息=============================================end


//发送已读取
    function sendReaded(msgSeq,isOffMsg){

        var read={
            "senderid":user.userid,
            "operation":"getMsgOk",
            "msgType":'user',
            "content":msgSeq
        };
        if(isOffMsg){
            read.operation='readOffMsgOk';
        }
        var readMsg=JSON.stringify(read);
        sendSocket(readMsg);
    }



    ///处理notice
    var unreadFriend=0;
    function handleNotice(json,isOffMsg){
        if(!renderNotice.state.hasNotice){
            return ;//没有系统通知栏返回不做信息处理
        }
        switch (json.msgtype){
            case 'addfriends':
                ring();
                json['accept']=false;
                render.state.addfriends.push(json);
                if($("#newFriend").hasClass('active')){
                    var list=render.getNewFriendNotice(render.state.addfriends);
                    $("#newFriend_panel").html(list);
                    if(!$("#menu_contact").hasClass('active')){
                        unreadFriend+=1;
                    }
                    clickAccept();
                }else {
                    $("#newFriend").find('.avatar').append('<i class="icon woxin_reddot"></i>');
                    unreadFriend+=1;
                }
                sendReaded(json.msgSeq,isOffMsg);
                updateContNum();
                break;
            case 'withdrawcash'://提现通知
            case 'promotionself '://发送自己会员
            case 'promotioncity'://同省，同城，同区，自己会员
            case 'promotion'://促销类型
            default:
                handleSystem(json,isOffMsg);
                break;
        }
    }
    ///处理系统通知
    function handleSystem(json,isOffMsg){
        if(!renderNotice.state.hasNotice){
            return ;//没有系统通知栏返回不做信息处理
        }
        sendReaded(json.msgSeq,isOffMsg);
        var id= json.senderid;
        var isActive;
        ring();
        if(id == renderNotice.state.now){//当前窗口
            if(!$("#menu_system").hasClass('active')){
                tempNewNoticeNum+=1;
            }
            if(id in renderNotice.state.msg){
                renderNotice.state.msg[id].push(json);
            }else {
                renderNotice.state.msg[id]=[json];
            }
            var newNotice=renderNotice.getNoticeMsg(json);
            $("#systemBox div.box_bd").prepend(newNotice);
            isActive=true;
        }else {//非当前窗口
            if(id in renderNotice.state.newNotice){
                renderNotice.state.newNotice[id].push(json);
            }else {
                renderNotice.state.newNotice[id]=[json];
            }
            isActive=false;
        }
        updateSysNum();
        //刷新排序
        var newItem=renderNotice.getNoticeItem(json,true,isActive);
        $("#systemList p.empty_notice").remove();
        $("#systemList div.chat_item[data-id="+id+"]").remove();
        $("#systemList div.nav_view").prepend(newItem);
        clickNotice();
    }
    ///处理订单通知
    var tempNewOrderNum=0;
    function handleOrder(json,isOffMsg){
        if(!renderOrder.state.hasOrder){
            return ;//没有订单通知栏返回不做信息处理
        }
        sendReaded(json.msgSeq,isOffMsg);
        ring();
        var id= json.senderid;
        var isActive;
        if(id == renderOrder.state.now){//当前窗口
            if(!$("#menu_order").hasClass('active')){
                tempNewOrderNum+=1;
            }
            renderOrder.state.msg[id].push(json);
            var newOrder=renderOrder.getOrderMsg(json);
            $("#orderBox div.box_bd").prepend(newOrder);
            isActive=true;
        }else {//非当前窗口
            if(id in renderOrder.state.newOrder){
                renderOrder.state.newOrder[id].push(json);
            }else {
                renderOrder.state.newOrder[id]=[json];
            }
            isActive=false;
        }
        updateOrdNum();
        //刷新排序
        var newItem=renderOrder.getOrderItem(json,true,isActive);
        $("#orderList p.empty_notice").remove();
        $("#orderList div.chat_item[data-id="+id+"]").remove();
        $("#orderList div.nav_view").prepend(newItem);
        clickOrder();
    }


//聊天状态/聊天记录缓存/拼接html============================================begin

    var render={
        state:{
            contactList:{
                group:false,//通讯录群组
                friend:false,//通讯录好友
            },
            detailBox:false,//当前详细框显示群组或者个人tId
            hasContact:false,
            addfriends:[],/////缓存添加好友请求信息
            senderTemp:[],////缓存加载记录无本地个人信息id
            isLogin:false,//登录状态
            chatId:'',//当前聊天接受者id
            chatType:'',//当前聊天接受者类型
            chatImg:'',//当前聊天接受者头像
            chatName:'',///
            chatList:{},//当前收发信息列表
            contact:{},//当前选中联系人
            ring:true,///收到消息发声音
            groupMember:false,///当前聊天群组成员
            group:{},//缓存群组成员
            addTempData:false,////缓存搜索个人信息
            addTempId:false,///选中添加人id
            acceptId:false,///同意好友请求id
            at:'有人@我'
        },
        //生成收发消息列表
        chatList:function(jsonData){
            var top='';
            var _html='';
            //对数据进行排序重组
            for(var i=0;i < jsonData.length ;i++){
                var listType=jsonData[i].type;
                var _type,id;
                if(listType=='group'){
                    _type='G';
                    if(!('gchatid' in jsonData[i]) &&'userid' in jsonData[i]){
                        var newData={};
                        for(var k in jsonData[i]){
                            if(k=='userid'){
                                newData['gchatid']=jsonData[i]['userid'];
                            }else {
                                newData[k]=jsonData[i][k];
                            }
                        }
                        jsonData[i]=newData;
                    }
                    id=jsonData[i].gchatid;
                    jsonData[i].type='G';
                    jsonData[i]['v2']=0;
                    jsonData[i]['tId']='G-'+id;
                }else {
                    _type='P';
                    id=jsonData[i].userid;
                    jsonData[i]['type']='P';
                    jsonData[i]['v1']=0;
                    jsonData[i]['tId']='P-'+id;
                }
            }
            var printed=[];//已置顶列表
            jsonData=sortList(jsonData);
            for (var t = 0; t < pinned.length; t++) {
                for (var q = 0; q < jsonData.length; q++) {
                    var Htype = jsonData[q]['type'];
                    var Hid = Htype == 'P' ? Htype + '-' + jsonData[q]['userid'] : Htype + '-' + jsonData[q]['gchatid'];
                    if (pinned[t] == Hid && blackListTemp.indexOf(Hid)==-1) {///在置顶列表并不在黑名单中
                        printed.push(Hid);
                        top += render.getChatList(jsonData[q]);
                    }
                }
            }
            for(var q=0;q < jsonData.length ;q++){
                var Htype=jsonData[q]['type'];
                var Hid= Htype=='P' ? Htype+'-'+jsonData[q]['userid']:Htype+'-'+jsonData[q]['gchatid'];
                if(printed.indexOf(Hid)==-1 && blackListTemp.indexOf(Hid)==-1){///不在置顶列表并不在黑名单中
                    _html+=render.getChatList(jsonData[q]);
                }
            }
            top='<div class="pinned" id="pinned">'+top+'</div>';
            $("#chatList .chat_list").empty().append(top + _html);
            clickSession();
        },
        //单个收发信息人  jsonData:个人信息，newMsg：新消息，state.active：是否当前选中
        getChatList:function(jsonData,newMsg,state){
            var notice= '';
            var content= '';
            var time='';
            var id='';
            state=state?state:{active:false,at:false};
            var act=state.active ? 'active':'';
            if(newMsg){
                notice= state.active ? '':'<i class="icon woxin_reddot"></i>';
                if('noReddot' in state  && state['noReddot']){
                    notice='';
                }
                switch (newMsg.msgtype){
                    case 'text':
                        content=newMsg.content.replace(/<[^>]+>/g,"");
                        break;
                    case 'image':
                        content="【图片】";
                        break;
                    case 'file':
                        content="【文件】";
                        break;
                    case 'page':
                        content='【红包】给您发送了一个红包，此版本暂不支持接收';
                        break;
                    case 'vibration':
                        content='给您发送了一个窗口抖动';
                        //var win=$('div.main_inner').addClass('shakeWin');
                        //setTimeout(function(){
                        //    win.removeClass('shakeWin');
                        //},1200);
                        break;
                    case 'movie':
                        content='【视频】';
                        break;
                    case 'voice':
                        content='【语音】';
                        break;
                    case 'position':
                        content='【位置】';
                        break;
                    case 'url':
                        var Url=handleUrl(newMsg['url']);
                        if(Url['type']=='store' || Url['type']=='user') {
                            content = '【名片】';
                        }else {
                            content = '【链接】';
                        }
                        break;
                    case 'hint':
                        content=newMsg.content.replace(/<[^>]+>/g,"");;
                        break;
                    default :

                        break;
                }
                time=getSessionTime(newMsg['sendtime']);
            }
            var _type='P';
            if('type' in jsonData){
                _type=jsonData.type;
                if(_type=='G'){
                    id=jsonData.gchatid;
                    jsonData.type='G';
                }else {
                    id=jsonData.userid;
                    jsonData['type']='P';
                }
            }else {
                _type=userType(jsonData);
                if(_type=='P'){
                    id=jsonData.userid;
                }else if (_type=='G'){
                    if('gchatid' in jsonData){
                        id=jsonData.gchatid;
                    }else {
                        id=jsonData.groupid;
                    }
                }
            }
            var tId=_type+'-'+id;
            var at='';
            if(_type=='G'&& newMsg && ('at' in newMsg)){
                if(newMsg.at){
                    var atList=newMsg.at.split(',');
                    for(var q=0;q<atList.length;q++){
                        if(atList[q] == user.userid){
                            at='at';
                            render.state.at='有人@我';
                        }
                    }
                }
                if(newMsg.at==0){
                    at='at';
                    render.state.at='@所有人';
                }
            }
            if(state.at){
                at='at';
            }
            var read=(state.active && at=='at') ? 'readed': '' ;
            var isSilent= disturbing.indexOf(tId)> - 1 ? '<p class="attr"><i class="chat_no-remind"></i></p>':'';
            render.state.chatList[tId]=jsonData;//缓存用户信息至聊天列表
            var name =getName(jsonData,Pname);
            var _html='<div class="chat_item '+act+' '+ at +' '+read +'" data-id="'+tId+'" data-type="'+_type+'" title="'+name+'">'+
                '<div class="avatar">'+
                '<img src="'+getUserPhoto(jsonData)+'" class="img" onerror="this.src=indexImg;">'+notice+
                '</div>'+
                '<div class="ext">'+
                '<p class="attr">'+time+'</p>'+isSilent+
                '</div>'+
                '<div class="info">'+
                '<h3 class="nickname">'+
                '<span class="nickname_text ">'+name+'</span>'+
                '</h3>'+
                '<p class="msg">'+
                '<span class="atMe">['+render.state.at+']</span><span >'+content+'</span>'+
                '</p>'+
                '</div>'+
                '</div>';
            return _html;
        },
        /**加载聊天内容
         * @param jsonData 消息
         * @param tid 发送者type-id
         * @param index 偏移量
         */
        chatBox:function (tid,start,end,done){
            var list='';
            var next=nextHistory;
            var history=localMsg[tid];
            var len=history ? history.length : 0;
            start= start ? parseInt(start,10) : 0;
            end= end ? parseInt(end,10) : 0;
            var nextIndex=end+next;
            var current='';
            var point='<div id="point" style="height:1px;float:left;width:100%;"></div>';
            var more=render.systemTips('<a id="moreMsg" data-index="'+nextIndex+'">加载更多</a>',true);
            var nomore=render.systemTips('已无更多记录',true);
            if(tid in currentMSg){
                for(var k=0;k<currentMSg[tid].length;k++){
                    current+=render.getChat(currentMSg[tid][k]);
                }
            }
            if(end && len!=0||done){//显示历史
                for(var i=end-1; i>=start ; i--){
                    history[i]['isH']='history';
                    list+=render.getChat(history[i]);
                }
                if(done){
                    list=nomore+list;
                }else if((nextIndex-next) <= len){
                    list=more+list;
                }
                $('#point').remove();
                $("#moreMsg").closest('.message').remove();
                $("#chatBox .box_bd").prepend(list+point);
                setTimeout(function(){
                    $("#chatBox .box_bd").scrollTop($('#point')[0].offsetTop);
                    var imgNum=$('#chatBox .content_img').length;
                    $('#chatBox .content_img').load(function(){
                        // 加载完成
                        $("#chatBox .box_bd").scrollTop($('#point')[0].offsetTop);
                    });
                },0);
            }else {
                $("#chatBox .box_bd").html(point+more+current);
                setTimeout(function(){
                    scrollBottom();
                },200);
            }
            if(render.state.senderTemp.length>0){
                render.getGroupSender();
            }
            moreRecord();
            clickMessage();
        },
        getGroupSender:function(){
            var send=render.state.senderTemp;
            for(var i=0;i<send.length;i++){
                var one=send[i];
                getMemberDetail(render.state.chatId.split('-')[1],one,function(json){
                    var tId=render.state.chatId;
                    if(!chatUser[tId]){
                        chatUser[tId]={};
                    }
                    chatUser[tId][one]=json.data;
                    //for(var i=0;i<render.state.group[tId]['source'].length;i++){
                    //    if(render.state.group[tId]['source'][i]['userid']==one){
                    //        render.state.group[tId]['source'][i]=json.data;
                    //    }
                    //}
                    var imgSrc  = getUserPhoto(chatUser[tId][one]);
                    var name    = getName(chatUser[tId][one],Gname);
                    var that=$("#chatBox .message[data-id='G-"+one+"']");
                    that.find('p.name').html(name);
                    that.find('img.avatar').attr('src',imgSrc);
                },true);
            }
            render.state.senderTemp=[];
        },
        //单条聊天内容
        getChat:function(jsonData,getContent){
            var msgContent=jsonData.content?jsonData.content.replace(/<[^>]+>/g,""):'';
            var list='';
            var imgSrc='/img/icon.jpg';//头像链接
            var cl1 = jsonData.senderid == user.userid ?'me':'you';
            var cl2 = jsonData.senderid == user.userid ?'right':'left';
            //var type=msgType(jsonData);
            var type=render.state.chatType,name='',userInfo=false,tId=render.state.chatId;

            if(jsonData.msgtype != 'tips'){
                if(type=='P'){
                    imgSrc  = jsonData.senderid == user.userid ? user.photo : render.state.chatImg;
                    name = jsonData.senderid == user.userid ? '' : render.state.chatName;
                }else {
                    //if(render.state.group[tId] && !(chatUser[tId] && chatUser[tId][jsonData.senderid])){
                    //    var members=render.state.group[tId].source;
                    //    for(var o=0 ; o<members.length ; o++){
                    //        if(members[o].userid==jsonData.senderid){
                    //            userInfo=members[o];
                    //            if(!chatUser[tId]){
                    //                chatUser[tId]={};
                    //            }
                    //            chatUser[tId][jsonData.senderid]=members[o];
                    //            break;
                    //        }
                    //    }
                    //}
                    if(jsonData.senderid == user.userid){
                        imgSrc  = user.photo ;
                        name = '';
                    //}else if(userInfo){//是否在本地缓存
                    //    imgSrc  = getUserPhoto(userInfo);
                    //    name    = getName(userInfo,Gname);
                    }else if(chatUser[tId] && jsonData.senderid in chatUser[tId]){//是否在本地缓存
                        imgSrc  = getUserPhoto(chatUser[tId][jsonData.senderid]);
                        name    = getName(chatUser[tId][jsonData.senderid],Gname);
                    }else if(tId,jsonData.senderid,jsonData.msgtype!='hint' && jsonData.msgtype!='newfriend') {
                        //缓存id，等加载完内容再请求
                        var ID=jsonData.senderid.toString();
                        if(render.state.senderTemp.indexOf(ID) == -1){
                            render.state.senderTemp.push(ID);
                        }
                    }

                }
            }
            delUnreadMsg(jsonData,tId);
            var content='';
            var isH=jsonData.hasOwnProperty('isH')&&jsonData['isH']=='history';
            var time=getMsgTime( jsonData['sendtime'],jsonData['msgId'],true,isH);
            var system='';
            if(time != ''){
                system='<p class="message_system"><span class="content">'+time+'</span></p>';
            }
            switch (jsonData.msgtype){
                case 'text':
                    var cont=msgContent;
                    cont=cont.replace(/\n/g,'<br />');//替换回车
                    //显示表情
                    var content=cont.replace(/\[([^\[\]]*)\]/g, function(code){
                        var  inner='';
                        for(var i=0;i<emojiFace.length;i++){
                            if(emojiFace[i].code==code){
                                inner='<img src="/img/spacer.gif" class="emoji woxinFace_'+emojiFace[i].key+'">';
                            }
                        }
                        if(inner==''){
                            for(var i=0;i<emojiOld.length;i++){
                                if(emojiOld[i].code==code){
                                    inner='<img src="/img/spacer.gif" class="old_emoji old_woxinFace_'+emojiOld[i].key+'">';
                                }
                            }
                        }
                        return inner==''?code:inner;
                    });
                    break;
                case 'image':
                    content='<div class="picture" title="点击查看大图">'+
                        '<img class="content_img" src="'+jsonData.filepath+'" alt="" onerror="this.src=_errorImg;">'+
                        '</div>';
                    if(getContent){
                        return content;
                    }
                    break;
                case 'file':
                    var fileName=getFileName(jsonData.filepath);
                    var suffix=fileName.split('.');
                    suffix= suffix[suffix.length-1];
                    var logo=suffix.toLowerCase();
                    var className='';
                    className='woxin_file_'+getLogo(logo);
                    content='<div class="attach"><div class="attach_bd"><div class="cover">'+
                        '<i class="'+className+'"></i></div>'+
                        '<div class="cont">'+
                        '<p class="title">'+msgContent+'</p>'+
                        '<div class="opr">'+
                        //'<span>&emsp;&emsp;&emsp;&emsp;</span>'+
                        //'<span class="sep">&emsp;</span>'+
                        '<a href="'+jsonData.filepath+'" download="'+msgContent+'">下载</a>'+
                        '</div></div></div></div>';
                    if(getContent){
                        return content;
                    }
                    break;
                case 'loadingimg':
                case 'loadingfile':
                    content='<img src="/img/loadingFile.gif" >';
                    break;
                case 'page':
                    content='【红包】给您发送了一个红包，此版本暂不支持接收';
                    break;
                case 'vibration':
                    content='给您发送了一个窗口抖动';
                    break;
                case 'movie':
                    //content='【视频】给您发送了一段视频，此版本暂不支持接收';
                    var picUrl=jsonData.url?jsonData.url:'/img/movie.jpg';
                    content='<div class="video">' +
                        '<i class="video_icon web_woxin_paly"></i>' +
                        '<video class="msg_video" src="'+jsonData.filepath+'" poster="'+picUrl+'" onerror="videoError(this);">' +
                        '【视频】给您发送了一段视频，您的浏览器不支持播放,可以下载播放 <a download href="'+jsonData.filepath+'">下载视频</a></video>' +
                        '</div>';
                    break;
                case 'voice':
                    content='【语音】给您发送了一段语音，此版本暂不支持播放。可<a href="'+jsonData.filepath+'" download>下载</a>收听';
                    break;
                case 'position':
                    var Lat,Long;
                    if('latitude' in jsonData){
                        Lat=jsonData.latitude;
                        Long=jsonData.longitude;
                    }else {
                        Lat=jsonData.title.split(',')[0];
                        Long=jsonData.title.split(',')[1];
                    }
                    content='<div class="location">'+
                        '<a target="_blank" href="http://ditu.amap.com/?q='+Lat+','+Long+'&name='+msgContent+'">'+
                        '<i class="point"></i><img class="img" src="'+jsonData.filepath+'" alt="'+msgContent+'" onerror="this.src=mapImg;">' +
                        '<p class="desc">'+msgContent+'</p></a>'+
                        '</div>';
                    //content='【位置-'+msgContent+'】给您发送了一个位置，此版本暂不支持查看';
                    break;
                case 'url':
                    var param=getParam(jsonData['url']);
                    var Url=handleUrl(jsonData['url']);
                    if(Url['type']=='store'||Url['type']=='user'){
                        var urlPath='javascript:;';
                        if(Url['type']=='store' && param && param.hasOwnProperty('sid')){
                            urlPath='https://wolianw.com/shopDetail?sid='+param['sid'];
                        }
                        content='<a href="'+urlPath+'" target="_blank"  class="card" data-type="'+Url['type']+'" data-id="'+Url.id+'">' +
                            '<div class="card_hd"><p>'+(Url['type']=='user'?'个人名片':'店铺名片')+'</p></div>'+
                            '<div class="card_bd"><div class="card_avatar">'+
                            '<img class="img" src="'+jsonData.filepath+'" onerror="this.src=indexImg">'+
                            '</div><div class="info">'+
                            '<h3 class="display_name">'+jsonData.title+'</h3>'+
                            '<h3 class="display_content">'+jsonData.content+'</h3>'+
                            '</div></div></a>';
                    }else {
                        var gid=false;
                        if(param){
                            if(jsonData.url.indexOf('wolianw.com')>-1 && param.hasOwnProperty('gid')){
                                gid=param['gid'];
                            }else if(jsonData.url.indexOf('wolianw.com')>-1 && param.hasOwnProperty('goodsid')){
                                gid=param['goodsid'];
                            }
                        }
                        var urlPath= gid ? 'https://wolianw.com/buyer/goodsDetail?gid='+gid : jsonData.url;
                        content='<a href="'+urlPath+'" target="_blank" class="app">' +
                            '<img src="'+jsonData.filepath+'" alt="" class="cover" onerror="this.src=_errorImg">' +
                            '<p class="desc">'+jsonData.title+'</p>' +
                            '<span class="price">'+(jsonData['countmoney']?'￥'+jsonData['countmoney']:'')+'</span></a>';
                    }
                    //content='【链接】<a href="'+jsonData.url+'" target="_blank">'+jsonData.title+'</a>';
                    //content='【店铺产品】给您发送了一个店铺产品，此版本暂不支持查看';

                    break;
                case 'hint':
                    if(tId=='G-1078'){
                        if(jsonData.recevierid==user.userid || jsonData.senderid ==user.userid){
                            content=render.systemTips(msgContent,true);
                        }else {
                            content='';
                        }
                    }else {
                        content=render.systemTips(msgContent,true);
                    }
                    return content;
                case 'newfriend':
                    return render.systemTips(msgContent,true);
                case 'tips':
                    return render.systemTips(msgContent,true);
                default :

                    break;
            }
            if( 'pagetype' in jsonData && jsonData['msgtype']!='page'){
                content=render.systemTips(msgContent,true);
                return content;
            }
            var padding='';
            if('padding' in jsonData){
                padding= 'data-padding="load'+jsonData.padding+'"';
            }
            var tId=type+'-'+jsonData.senderid;
            var msgT=getMT(jsonData);
            var msgID=jsonData['msgId'];
            var msgSeq=jsonData['msgSeq']? 'data-seq="'+jsonData['msgSeq']+'"':'';
            var sending=jsonData.hasOwnProperty('send') && jsonData['send']=='sending' ? '<img class="ico_sending" src="/img/sending.gif" alt="">':'';
            var sendError=jsonData.hasOwnProperty('send') && jsonData['send']=='error' ? getSendMsgError(msgID):'';
            list='<div class="message '+cl1+'" data-id="'+tId+'">'+system+
                '<img class="avatar" src="'+imgSrc+'" data-id="'+tId+'" onerror="this.src=indexImg;" >'+
                '<div class="content"><p class="name">'+name+'</p>'+
                '<div class="bubble bubble_primary '+cl2+' '+ msgT +'" data-id="'+msgID+'" '+msgSeq+' >' +
                '<div class="bubble_cont" '+padding+' >'+content+'</div>'+sending+sendError+'</div>'+
                '</div>'+
                '</div>';
            return list;
        },
        //插入单条消息
        appendChat:function(jsonData){
            var list=render.getChat(jsonData);
            var elem=$("#chatBox .box_bd");
            var bSrollTop=elem.scrollTop();
            var bScrollHeight=elem[0].scrollHeight;
            var bH=elem.height();
            list=$(list);
            $("#chatBox .box_bd").append(list);
            if(render.state.senderTemp.length>0){
                render.getGroupSender();
            }
            clickMessage();
            if( jsonData.senderid == user.userid|| (bSrollTop+bH) == bScrollHeight || (bScrollHeight-bSrollTop-bH)<200){///插入新信息前滚动条是否到底（200px 高度）
                setTimeout(function(){
                    scrollBottom();
                },0);
            }else{
                render.ToNewMsgTips();
            }
            return list;
        },
        ToNewMsgTips:function(){//新消息提醒
            if($("#ToNewMsg").length > 0){
                return ;
            }
            var float='<div id="ToNewMsg">您有新的消息</div>';
            $("#tool_bar").append(float);
            $("#ToNewMsg").click(function(){
                $(this).remove();
                $("#chatBox .box_bd").animate({scrollTop:$("#chatBox .box_bd")[0].scrollHeight+'px'});
            })
        },
        //聊天提示消息
        systemTips:function(content,getCont,tId){
            var timeHtml='';
            var sTime=false;
            if(typeof content === "object"){
                var system='<p class="message_system"><span class="content '+(getCont?"":"sys_tips")+'">'+content.content+'</span></p>';
                //sTime=content.sendtime;
            }else {
                var system='<p class="message_system"><span class="content '+(getCont?"":"sys_tips")+'">'+content+'</span></p>';
            }
            if(tId){
                var msg={
                    msgId:getMsgId('tips'),
                    content:content,
                    msgtype:'tips',
                    sendtime:getNow()
                };
                addCurrentMsg(msg,tId);
                sTime=msg.sendtime;
            }
            if(sTime){
                var time=getMsgTime(sTime);
                timeHtml='<p class="message_system"><span class="content">'+time+'</span></p>';
            }
            var list='<div class="message me">'+timeHtml+system+'</div>';
            if(getCont) {
                return list;
            }
            if( !tId || (tId == render.state.chatId)){
                $("#chatBox .box_bd").append(list);
                setTimeout(function(){
                    scrollBottom();
                },0);
            }
        },
        //返回聊天成员//data=个人信息、add（添加按键）、del（删除按键）
        getMember:function(data){
            if(typeof data ==='string'){
                var tit=data=='add'?'点击邀请好友群聊':'点击删除群成员';
                var member='<div class="member" id="member_'+data+'" title="'+tit+'">'+
                    '<i class="chat_'+data+'_member"></i>'+
                    '</div>'+
                    '<p class="nickname"></p>'+
                    '</div>';
            }else {
                var deleteBtn= data.userid==user.userid ? '':'<div class="opt" title="点击删除该群成员"><i class="chat_delete"></i></div>';
                var name= data.userid==user.userid?getName(data,Pname):getName(data,Gname);
                var member='<div data-id="'+data.userid+'" class="member" title="'+name+'">'+
                    '<img class="avatar" src="'+getUserPhoto(data)+'" onerror="this.src=indexImg;"/>'+
                    deleteBtn+ '<p class="nickname">'+name+'</p></div>';
            }
            return member;
        },
        //加载群成员
        getMembers:function (data,index){
            if(!data.source){
                return '';
            }
            var num=20;//初次加载数量
            var next=20;//一次添加量
            var _index=index ? parseInt(index,10) : 0;//索引位置
            var members='';
            if(data.count<num){
                for(var i =0;i<data.source.length;i++){
                    members+=render.getMember(data.source[i]);
                }
            }else {
                var next_index=_index+next;
                var pre=(next_index < data.count) ? next_index :data.count;
                var list= index ? pre:num;
                var page=list/next;
                if((page-parseInt(page))>0){
                    page=parseInt(page,10)+1;
                }else {
                    page=parseInt(page,10);
                }
                if(list > data.source.length){
                    getGroupMembers({
                        gid:render.state.chatId.split('-')[1],
                        page:page,
                        size:next
                    },function(json){
                        var groups=json.data.source;
                        for(var i=0;i<groups.length;i++){
                            render.state.group[render.state.chatId]['source'].push(groups[i]);
                            members+=render.getMember(groups[i]);
                        }
                    },true);
                }else{
                    for(var i=_index;i<list;i++){
                        members+=render.getMember(data.source[i]);
                    }
                }
                if(list < data.count){
                    members+='<div data-id="more" id="moreMember" data-index="'+list+'"  class="member" title="点击加载更多">' +
                            '<img class="avatar" src="/img/more2.png">' +
                            '<p class="nickname">加载更多</p></div>';
                }
            }

            return members;
        },
        //返回通讯录单个联系人
        getContact:function(jsonData,type){
            var id='';
            var photo='';
            if(type=='G'){
                id=jsonData.gchatid;
            }else {
                id=jsonData.userid;
            }
            var dt= type == 'P' && id==user.userid?'':'data-type="'+type+'"';
            var  contact='<div class="contact_item" title="'+getName(jsonData,Pname)+'" data-id="'+type+'-'+id+'"  '+dt+'>'+
                '<div class="avatar">'+
                '<img src="'+getUserPhoto(jsonData)+'" class="img" alt="'+getName(jsonData,Pname)+'" onerror="this.src=indexImg;">'+
                '</div>'+
                '<div class="info">'+
                '<h4 class="nickname">'+getName(jsonData,Pname)+'</h4>'+
                '</div>'+
                '</div>';
            return contact;

        },
        //返回通讯录分组
        contactGroup:function(jsonData,type){
            var contact='',title='';
            if(type=='P' && !jsonData['friends']){
                return ;
            }
            if(type=='P'){
                var myself='';
                for(var i=0 ;i<jsonData.friends.length;i++){
                    if(jsonData.friends[i].userid == user.userid){
                        myself=render.getContact(jsonData.friends[i],type);
                    }else {
                        contact += render.getContact(jsonData.friends[i],type);
                    }
                }
                contact= myself+contact;
                title=jsonData.groups;
                var num=jsonData.friends.length?jsonData.friends.length:0;
            }else if(type=='G'){
                if(jsonData.length==0) return;
                for(var i=0 ;i<jsonData.length;i++){
                    contact += render.getContact(jsonData[i],type);
                }
                title=jsonData[0].userid==user.userid ? '我发起的群':'我加入的群';
                var num=jsonData.length?jsonData.length:0;
            }
            var  group='<div class="contact_list">'+
                '<div class="title">'+
                '<h4 class="contact_title">'+title+'<span class="num_members">'+num+'</span><i class="contact_arrow_right"></i></h4>'+
                '</div>'+
                '<div class="item_box">'+contact+'</div>'+
                '</div>';
            $("#contactList .nav_view").append(group);
        },
        //返回联系人BOX详细信息
        contactDetail:function(jsonData,type){
            var P='';//个人时
            var editable=false,join=false,dist=false;
            var fname='';
            var temp='';
            var G='';
            if( type=='P' && jsonData.isfriend){
                P=render.getContactSelect(jsonData.fcgryid);
                fname = jsonData.fname ? jsonData.fname:'点击添加备注';
                temp = jsonData.fname ? jsonData.fname:'';
                editable= jsonData.userid==user.userid ? false : true;
            }else if( type=='P' && jsonData.isfriend == 0 && $("#addFriend").length>0){
                P='<a class="button" id="addTofriend" href="javascript:void(0);">添加到通讯录</a>';
            }

            if(type == 'G'){
                var notice='',open=false;
                if(jsonData.hasOwnProperty("isJoin") && jsonData['isJoin']==0){
                    join='<a class="button" id="joinTo" href="javascript:void(0);">加入群聊</a>';
                    dist=true;
                }
                if('publicNotice' in jsonData){
                    var Ptime='publicNoticeTime' in jsonData ? '('+jsonData["publicNoticeTime"]+')&emsp;':'';
                    notice=Ptime+jsonData['publicNotice'];
                }
                if(disturbing.indexOf('G-'+jsonData.gchatid) > -1){
                    open = true;
                }
                var canInvite=(jsonData.hasOwnProperty('allowInvite') && jsonData['allowInvite']==1);
                var invite=jsonData['userid']==user.userid?'<div><div>允许群成员邀请好友加入：<div class="switch" id="invite_panel">' +
                '<label><input type="radio" name="invite" value="1" '+(canInvite ? "checked":"" )+'>允许</label>' +
                '<label><input type="radio" name="invite" value="0" '+(!canInvite ? "checked":"")+'>禁止</label>' +
                '</div></div></div>':'';
                var Gnot='<div class="Gnotice"><p>群公告：&emsp;'+notice+'</p></div>';
                dist=dist?'':'<div><div>免打扰：<div class="switch" id="disturb_panel">' +
                    '<label><input type="radio" name="switch" value="add" '+(open ? "checked":"" )+'>开启</label>' +
                    '<label><input type="radio" name="switch" value="del" '+(!open ? "checked":"")+'>关闭</label>' +
                    '</div></div></div>';
                G='<div class="group_area">'+ Gnot + dist +invite+'</div>';
            }
            var sex='hide';
            if(jsonData.hasOwnProperty('sex')){
                if(jsonData['sex']==1){
                    sex='chat_male';
                }else if(jsonData['sex']==0){
                    sex='chat_female';
                }
            }
            var btn=join?join:'<a class="button" id="SendMsgTo" href="javascript:void(0);">发消息</a>';
            var Detail='<div class="avatar"><img src="'+getUserPhoto(jsonData)+'" class="img" onerror="this.src=indexImg;"></div>'+
                '<div class="nickname_area">'+
                '<h4 class="nickname">'+getName(jsonData,Pext)+'</h4>'+
                '<i class="'+sex+' chat_icon"></i>'+
                '</div>'+
                '<div class="meta_area">'+
                '<div class="meta_item" style="display: '+(type=='G'?'none':'block')+'">'+
                '<label class="label">备&emsp;注: </label>'+
                '<p class="value" data-temp="'+ temp +'" contenteditable="'+editable+'" >'+fname+'</p></div>'+
                '</div>'+P+
                '<div class="action_area">'+btn+
                '</div>'+G;
            return Detail;
        },
        //返回好友分组select
        getContactSelect:function(fcgryid){
            var option='';
            var friend=render.state.contactList.friend;
            for (var i=0;i<friend.length;i++){
                var seleced='';
                if(fcgryid == friend[i].fcgryid){
                    seleced=' selected="selected" ';
                }
                option+='<option value="'+friend[i].fcgryid+'" '+seleced+'>'+friend[i].groups+'</option>';

            }
            var sele='<div class="changeGroup">'+
                '<select name="" data-temp="'+fcgryid+'" id="changeGroup" disabled>'+option +'</select>' +
                '<a href="javascript:;" id="editFriend">修改</a></div>';
            return sele;
        },
        //返回弹窗个人信息
        getProf:function(jsonData){
            var name=getName(jsonData,Pext);
            var img=getUserPhoto(jsonData);
            var tfname=jsonData.fname ? jsonData.fname:'';
            var fname = tfname==''?'点击添加备注':tfname;
            var icon='';
            var _sex='';
            if('sex' in jsonData){
                if(jsonData.sex){
                    _sex='female';
                }else {
                    _sex='male';
                }
                icon='<i class="chat_'+_sex+'"></i>';
            }
            var add='';
            var editable=false;
            if('isfriend' in jsonData && jsonData.isfriend == 0){
                add='<a href="javascript:;" class="meta_btn p_add" style="text-align: right"><i class="meta_add"></i>加好友</a>';
                fname='';
            }else if('isfriend' in jsonData && jsonData.isfriend != 0){
                editable=!(jsonData.userid==user.userid);

            }
            var prof='<div class="profile_mini"><div class="profile_mini_hd"><div class="avatar">'+
                '<div class="nickname_area">'+
                '<h4 class="nickname">'+name+'</h4>'+icon+'</div>'+
                '<div class="close" title="点击关闭" style=""><i class="close_icon"></i></div>'+
                '<img class="img" src="'+img+'" alt="" onerror="this.src=indexImg;">'+
                '</div> </div> <div class="profile_mini_bd"> <div class="meta_area"> <div class="meta_item"> <label class="label">备&emsp;注：</label>'+
                '<p class="value J_Text" data-temp="'+tfname+'" contenteditable="'+editable+'" id="J_Text">'+fname+'</p>'+
                '</div></div></div><div class="profile_mini_ft">'+
                '<a href="javascript:;" class="meta_btn p_send"><i class="meta_send"></i>发消息</a>'+
                add+'</div></div>';
            return prof;
        },
        getNewFriendNotice:function(json){
            var notice='';
            for(var i in json){
                var cln= json[i]['accept']?'on':'';
                var btn= json[i]['accept']?'已添加':'接受';
                notice+='<div class="ask" title="'+getName(json[i],Pname)+'"><div class="avatar">' +
                    '<img src="'+getUserPhoto(json[i])+'" alt="" onerror="this.src=indexImg;"></div><div class="content">' +
                    '<p>'+getName(json[i],Pname)+'</p><span>'+json[i].content+'</span>' +
                    '<a href="javascript:;" class="btn accept_btn '+cln+'" data-id="'+json[i].senderid+'">'+btn+'</a></div></div>';
            }
            return notice;
        },
        getAddFriendResult:function(json){
            if(!json){
                tips.show('未搜到用户！');
                return '';
            }
            var Result='';
            for(var i in json){
                var onF=(render.state.contactList.ids.indexOf(json[i].userid.toString())==-1);
                var btn= onF?'添加好友':'已是好友';
                var dis= onF?'':'disabled="disabled"';
                Result+='<div class="ask" title="'+getName(json[i],Pname)+'"><div class="avatar">' +
                    '<img src="'+getUserPhoto(json[i])+'" alt="" onerror="this.src=indexImg;"></div><div class="content">' +
                    '<p>'+getName(json[i],Pname)+'</p><span></span>' +
                    '<button class="btn accept_btn addF_btn '+(onF?'':'on')+'" '
                    + dis +' data-id="'+json[i].userid+'">'+btn+'</button></div></div>';
            }
            return Result;
        },
        renderAddFriendDetail:function(){
            var friend=render.state.contactList.friend;
            if(!friend){
                return ;
            }
            var Result=render.getGruopRadio();
            var addF=render.state.addTempData;
            var name='',src='';
            for(var i=0;i<addF.length;i++){
                if(addF[i].userid == render.state.addTempId){
                    name=getName(addF[i],Pname);
                    src=getUserPhoto(addF[i]);
                }
            }
            var detail='<div id="close_add_detail" title="点击关闭">X</div><div class="imgbox">' +
                '<img src="'+src+'" alt="" onerror="this.src=indexImg;"></div><div class="info">'+
                '<h4 class="nikname">'+name+'</h4></div>';
            $("#addDetail .detail").html(detail);
            $("#addDetail .group_list").html(Result);
            clickCloseAdd();
        },
        getGruopRadio:function(){
            var friend=render.state.contactList.friend;
            if(!friend){
                return ;
            }
            var Result='';
            for(var i=0;i<friend.length;i++){
                Result+='<li><input type="radio" id="Type'+friend[i].fcgryid+'" name="FriendType" data-id="'+friend[i].fcgryid+'">' +
                    '<label for="Type'+friend[i].fcgryid+'">'+friend[i].groups+'</label></li>';
            }
            return Result;
        },
        getgroupListPop:function(){
            var list='<div class="gruop_list" id="gruop_list_pop">' +
                '<div class="title">添加好友到分组</div>' +
                '<ul class="group_list">'+
                render.getGruopRadio()+'</ul><a href="javascript:;" class="btn_addFriend" id="btn_acceptFriend">确定添加</a></div>';
            return list;
        }
    };
    function getLastMsgId(){
        var msgList=currentMSg[render.state.chatId] ? currentMSg[render.state.chatId] : [];
        for(var i=msgList.length-1;i>=0;i--){
            if(msgList[i].hasOwnProperty('msgId')){
                return msgList[i]['msgId'];
            }
        }
    }

    function getLastTime(msgId,isH){
        if(isH){
            var msgList=localMsg[render.state.chatId] ? localMsg[render.state.chatId] : [];
            for(var i=0;i<msgList.length;i++){
                if(msgList[i].hasOwnProperty('msgId') && msgList[i]['msgId']==msgId && (i+1)<msgList.length){
                    if(msgList[i+1].hasOwnProperty('sendtime')){
                        return msgList[i+1]['sendtime'];
                    }
                }
            }
        }else {
            var msgList=currentMSg[render.state.chatId] ? currentMSg[render.state.chatId] : [];
            for(var i=msgList.length-1;i>=0;i--){
                if(msgList[i].hasOwnProperty('msgId') && msgList[i]['msgId']==msgId && i>0){
                    if(msgList[i-1].hasOwnProperty('sendtime')){
                        return msgList[i-1]['sendtime'];
                    }
                }
            }
        }
        return false;
    }
    //msg时间解析
    function getMsgTime(time,msgId,fullTime,isH){
        var temp='';
        var lastTime=false;
        if(msgId){
            lastTime=getLastTime(msgId,isH);
        }
        if(time){
            var t=showTime(time,lastTime);
            if(t.day){//发送日期大于当前日期1天 显示日期
                temp= fullTime ? time:time.split(' ')[0];
            }else if(t.min || t.now){//当天 显示时间
                //var ms=time.split(' ')[1];
                //ms=ms.split(':');
                //time=ms[0]+':'+ms[1];
                var today=showTime(time);
                if(isH && today.day){
                    temp=time;
                }else {
                    temp=time.split(' ')[1];
                }
            }
        }
        return temp;
    }
    function getSessionTime(time){
        var temp='';
        if(time){
            var t=showTime(time);
            if(t.day){//发送日期大于当前日期1天 显示日期
                temp= time.split(' ')[0];
            }else {//当天 显示时间
                var ms=time.split(' ')[1];
                ms=ms.split(':');
                temp=ms[0]+':'+ms[1];
                //temp=time.split(' ')[1];
            }
            return temp;
        }
        return '';
    }
    function getNoticeTime(time){
        var temp='';
        if(time){
            var t=showTime(time);
            if(t.day){//发送日期大于当前日期1天 显示日期
                temp= time.split(' ')[0];
            }else {//当天 显示时间
                //var ms=time.split(' ')[1];
                //ms=ms.split(':');
                //time=ms[0]+':'+ms[1];
                temp=time.split(' ')[1];
            }
            return temp;
        }
        return '';
    }
//是否显示时间
//day：是否大于1天
//min：与当前时间是否大于5分钟
    function showTime(time,last){
        var now=getNow();
        var res={
            day:false,
            min:false,
            now:false
        };
        if(last){
            now=time;
            time=last;
        }
        var times=time.split(' ');
        var front=times[0].split('-');
        var behind=times[1].split(':');

        var nows=now.split(' ');
        var frontNow=nows[0].split('-');
        var behindNow=nows[1].split(':');

        if((parseInt(frontNow[0])-parseInt(front[0]))>0){
            res.day=true;
        }else if((parseInt(frontNow[1])-parseInt(front[1]))>0){
            res.day=true;
        }else if((parseInt(frontNow[2])-parseInt(front[2]))>0){
            res.day=true;
        }
        if(!res.day){
            if((parseInt(behindNow[0])-parseInt(behind[0]))>1){
                res.min=true;
            }else if((parseInt(behindNow[0])-parseInt(behind[0]))==1 && (parseInt(behindNow[1]) + 60 - parseInt(behind[1]))>5){
                res.min=true;
            }else if((parseInt(behindNow[0])-parseInt(behind[0]))==0 && (parseInt(behindNow[1]) - parseInt(behind[1]))>5){
                res.min=true;
            }
        }
        if(res.day==false && res.min==false && !last){
            res.now=true;
        }
        return res;
    }

    function handleUrl(path){
        var type='goods';
        if(path.indexOf('t=store')>-1){
            type='store';
            var id=getParam(path,'sid');
        }
        if(path.indexOf('t=user')>-1){
            type='user';
            var id=getParam(path,'uid');
        }
        return {
            id:id,
            type:type
        };
    }
    //获取userData名称
    var Pname=['fname','storeName', 'name', 'username', 'phone'];
    var Pext=['storeName', 'name', 'username', 'phone'];
    var Gname=['fname','nickname','storeName', 'name', 'username', 'phone'];
    var Gat=['nickname','storeName', 'name', 'username', 'phone'];
    function getName(userData,arr){
        if(!userData){
            return false;
        }
        for(var i=0;i<arr.length;i++){
            if(arr[i] in userData && $.trim(userData[arr[i]]) != ''){
                var re=userData[arr[i]];
                var temp=re.split('');
                if(arr[i]=='phone' && temp.indexOf('*')==-1){
                    if(temp.length>=5){
                        for(var i=3;i<temp.length-2;i++){
                            temp[i]='*';
                        }
                    }
                    re = temp.join('');
                }else if(arr[i]=='username' && temp.indexOf('*')==-1){
                    if(temp.length>2){
                        for(var i=1;i<temp.length-1;i++){
                            temp[i]='*';
                        }
                    }else if(temp.length==2) {
                        temp[1]='*';
                    }
                    re = temp.join('');
                }

                return re;
            }
        }
        return '';
    }


//获取userData 头像连接
    function getUserPhoto(userData){
        var photo='';
        if('photo' in userData){
            if(userData.photo.indexOf('::||')>-1){
                photo=userData.photo.replace('::||','');
            }else if(userData.photo.indexOf('http:')==-1){
                photo=_imgPath+userData.photo;
            }else {
                photo=userData.photo;
            }
            return photo;
        }else if('ico' in userData){
            if(userData.ico.indexOf('http:')==-1){
                photo=_imgPath+userData.ico;
            }else {
                photo=userData.ico;
            }
            return photo;
        }
        return '/img/icon.jpg';
    }

//根据文件后缀suffix获取logo
    function getLogo(suffix){
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
                return key;
            }
        }
        return 'other';
    }


//获取当前时间yyy-mm-dd hh:mm:ss
    function getNow(){
        var d = new Date();
        var mon=d.getMonth()+1;
        var t = d.getFullYear()+'-'+mon+'-'+d.getDate()+' '+d.getHours()+':'+d.getMinutes()+':'+d.getSeconds();
        return t;
    }


//聊天状态/聊天记录缓存/拼接html============================================end


//系统通知处理============================================begin
    var renderNotice={
        state:{
            hasNotice:false,////是否存在通知菜单
            now:false,///当前选中
            List:{},///发人信息列表
            msg:{},////已读信息
            newNotice:{}///未读信息
        },
        getNoticeList:function(json){
            var list='';
            var noticeList=renderNotice.state.List;
            for (var i in noticeList){
                list+=renderNotice.getNoticeItem(noticeList[i]);
            }
            $("#systemList div.nav_view").html(list);
        },
        //返回单个信息通知人
        getNoticeItem:function(msg,isNew,isActive){
            var sender;
            if(msg.senderid in renderNotice.state.List){
                sender = renderNotice.state.List[msg.senderid];
            }else {
                getUserInfo(msg.senderid,'',function(data){
                    if(data.status){
                        sender=data.data;
                    }else {
                        sender=null;
                    }
                },true);
            }
            if(!sender){
                return '';
            }
            var red= isNew && !isActive?'<i class="icon woxin_reddot"></i>':'';
            var act= isActive?'active':'';
            var time=getSessionTime(msg['sendtime']);
            var time=getSessionTime(msg['sendtime']);
            var name=getName(sender,Pext);
            var item='<div class="chat_item '+act+'" data-id="'+sender.userid+'" title="'+name+'">'+
                '<div class="avatar">'+
                '<img src="'+getUserPhoto(sender)+'" class="img">'+
                red+'</div><div class="ext">'+
                '<p class="attr">'+time+'</p> </div> <div class="info"><h3 class="nickname">'+
                '<span class="nickname_text ">'+name+'</span> </h3> <p class="msg">'+
                '<span >'+msg.content+'</span> </p> </div> </div>';
            return item;
        },
        appendMsg:function(json){//填充数据
            var list='';
            for(var i=json.length-1;i>=0;i-- ){//倒叙显示
                list+=renderNotice.getNoticeMsg(json[i]);
            }
            $("#systemBox div.box_bd").html(list);

        },
        getNoticeMsg:function(json){//获取单个信息html
            var time=getNoticeTime(json['sendtime'],true);
            var title=json.title?json.title:'';
            var msg='<div class="message"><p class="message_system">'+
                '<span class="content">'+time+'</span> </p><div class="systemMsg">'+
                '<p>'+title+'</p>'+
                '<span>'+json.content+'</span> </div> </div>';
            return msg;
        }
    };
//系统通知处理============================================end


    //订单通知处理============================================begin
    var renderOrder={
        state:{
            hasOrder:false,//是否有订单栏
            now:false,//
            List:{},//当前订单发送者列表
            msg:{},//已读消息
            newOrder:{}//新信息
        },
        getOrderList:function(json){
            var list='';
            var OrderList=renderOrder.state.List;
            for (var i in OrderList){
                list+=renderOrder.getOrderItem(OrderList[i]);
            }
            $("#orderList div.nav_view").html(list);
        },
        //返回单个信息通知人
        getOrderItem:function(msg,isNew,isActive){
            var sender=null;
            if(msg.senderid in renderOrder.state.List){
                sender = renderOrder.state.List[msg.senderid];
            }else {
                getUserInfo(msg.senderid,'',function(data){
                    sender=data.data;
                },true);
            }
            if(!sender){
                return '';
            }
            var red= isNew && !isActive?'<i class="icon woxin_reddot"></i>':'';
            var act= isActive?'active':'';
            var time=getSessionTime(msg['sendtime']);
            var name=getName(sender,Pext);
            var item='<div class="chat_item '+act+'" data-id="'+sender.userid+'" title="'+name+'">'+
                '<div class="avatar">'+
                '<img src="'+getUserPhoto(sender)+'" class="img" onerror="this.src=indexImg;">'+
                red+'</div><div class="ext">'+
                '<p class="attr">'+time+'</p> </div> <div class="info"><h3 class="nickname">'+
                '<span class="nickname_text ">'+name+'</span> </h3> <p class="msg">'+
                '<span >'+msg.content+'</span> </p> </div> </div>';
            return item;
        },
        appendMsg:function(json){
            var list='';
            for(var i=json.length-1;i>=0;i-- ){
                list+=renderOrder.getOrderMsg(json[i]);
            }
            $("#orderBox div.box_bd").html(list);

        },
        getOrderMsg:function(json){
            var time=getNoticeTime(json['sendtime'],true);
            //var title=json.title?json.title:'';
            var msg='<div class="message"><p class="message_system">'+
                '<span class="content">'+time+'</span></p><div class="systemMsg">'+
                '<p>'+json.content+'</p>'+
                '<span>'+json.sendtime+'</span></div></div>';
            return msg;
        }
    };
//订单通知处理============================================end

    //FF,chrome新信息通知
    var popNotice = function(msg,sender) {
        if(window.Notification){
            if (Notification.permission == "granted") {
                var content='';
                switch (msg.msgtype){
                    case 'text':
                        content=msg.content;
                        break;
                    case 'image':
                        content="【图片】";
                        break;
                    case 'file':
                        content="【文件】";
                        break;
                    case 'page':
                        content='【红包】给您发送了一个红包，此版本暂不支持接收';
                        break;
                    case 'vibration':
                        content='给您发送了一个窗口抖动';
                        break;
                    case 'movie':
                        content='【视频】';
                        break;
                    case 'voice':
                        content='【语音】';
                        break;
                    case 'position':
                        content='【位置】';
                        break;
                    case 'url':
                        content='【链接】';
                        break;
                    case 'hint':
                        content=msg.content;
                        break ;
                    default :
                        content=msg.content;
                        break;
                }
                var type=msgType(msg);
                var id;
                if(type=='G'){
                    if('groupid' in msg){
                        id=msg['groupid'];
                    }else {
                        id=msg['gchatid'];
                    }
                }else {
                    id=sender.userid
                }
                var tag=type+'-'+id;
                var photo=new Image();
                function popMsg(src){
                    var notification = new Notification(getName(sender,Pname)+"：", {
                        body: content,
                        tag:  tag,
                        icon: src,
                        renotify:true
                    });
                    setTimeout(function(){notification.close()},7000);
                    notification.onclick = function() {
                        toChat(sender);
                        window.focus();
                        notification.close();
                    };
                }
                photo.onload=function(){
                    popMsg(this.src);
                };
                photo.onerror=function(){
                    popMsg(indexImg);
                };
                photo.src=getUserPhoto(sender);
            }else if (Notification.permission != "denied") {
                Notification.requestPermission(function (permission) {
                    popNotice(msg,sender);
                });
            }
        }

    };

    ///////////////////设置
    ///消息设置单弹窗
    var msgSet={///消息设置缓存
        isInit:false,//是否初始化
        offline:{
            isOn:false,//是否打开离线回复
            content:false///离线回复内容
        },
        auto:{
            isOn:false,//是否打开第一次咨询
            content:false///咨询回复内容
        },
        render:function(){
            var that=this;
            if(!that.isInit){
                /////异步获取设置
                getAutoReply(user.userid,false,function(json){
                    if(json.status){
                        if(json.data){
                            msgSet.offline.isOn=(json.data.offline==1);
                            msgSet.offline.content=json.data.offText?json.data.offText:false;
                            msgSet.auto.isOn=(json.data.advisory==1);
                            msgSet.auto.content=json.data.adviText?json.data.adviText:false;
                        }
                        that.isInit=true;
                    }else {
                        that.isInit=false;
                        tips.show(json.msg);
                    }
                },true);
            }
            $("#offlineMsg").prop('checked',that.offline.isOn);
            $("#autoMsg").prop('checked',that.auto.isOn);
            if(that.offline.content){
                $("#offlineMsg_text").val(that.offline.content);
            }
            if(that.auto.content){
                $("#autoMsg_text").val(that.auto.content);
            }
        },
        done:function(btn){//清除完成动画
            var n=btn.siblings('.clear_done');
            if(n.length > 0){
                if(msgSet.doneTimer)clearTimeout(msgSet.doneTimer);
            }else {
                n=$('<span class="clear_done">清除完成</span>');
                btn.after(n);
            }
            n.animateCss('flipInY',function(){
                msgSet.doneTimer=setTimeout(function(){
                    n.animateCss('fadeOut','remove');
                },1500);
            })
        },
        doneTimer:null
    };
    //消息设置-点击显示消息设置面板
    $("#msgSet").click(function(){
        $("#setting").hide();
        var panel= $("#msgSet_panel");
        msgSet.render();
        panel.show();
        panel.find('.msgSet').animateCss('fadeInDown');
    });
    //消息设置-隐藏设置面板
    function hideMsgSet(){
        var panel= $("#msgSet_panel");
        panel.find('.msgSet').animateCss('fadeOutUp',function(){
            panel.hide();
        });
        //$("#msgSet_offline").hide();
        //$("#msgSet_auto").hide();
    }
    $("#close_msgSet").click(function(){
        hideMsgSet();
    });
    $("#msgSet_panel .dialog-overlay").click(function(){
        hideMsgSet();
    });
    //消息设置-清空消息
    $("#msgSet_clearMsg").click(function(){
        for(var key in currentMSg){
            currentMSg[key]=[];
        }
        for(var tId in localMsg){
            localMsg[tId]=[];
        }
        unreadMsg={};
        $("#msg_num").html('');
        $("#chatList .msg").find('span').html('');
        $("#chatList .woxin_reddot").remove();
        if(render.state.chatId)render.chatBox(render.state.chatId);
        msgSet.done($(this));
    });
    ///消息设置-清空系统、订单通知
    $("#msgSet_clearNotice").click(function(){
        for(var key in renderNotice.state.msg){
            renderNotice.state.msg[key]=[];
        }
        for(var tId in renderOrder.state.msg){
            renderOrder.state.msg[tId]=[];
        }
        renderOrder.state.newOrder={};
        renderNotice.state.newNotice={};
        sessionStorage.setItem('system-'+user.userid,'');
        sessionStorage.setItem('order-'+user.userid,'');
        $("#sys_num").html('');
        $("#order_num").html('');
        $("#systemList .woxin_reddot").remove();
        $("#orderList .woxin_reddot").remove();
        $("#systemList .msg").find('span').html('');
        $("#orderList .msg").find('span').html('');
        $("#systemBox div.box_bd").html('');
        $("#orderBox div.box_bd").html('');
        msgSet.done($(this));
    });
    //消息设置-修改离线回复
    $("#msgSet_offline").click(function(){
        //var flag=$("#offlineMsg").prop('checked');
        //if(flag){
            var msg=$("#offlineMsg_text").val().trim();
            if(msg==''){
                tips.show('内容不能为空!');
                return;
            }
            if(msg.length>100){
                tips.show('回复内容不能超过100字!');
                return;
            }
            if(msg==msgSet.offline.content && msgSet.offline.isOn==flag) {
                //$("#msgSet_offline").hide();
                return;
            }
        //}
        setAutoReply('offText',msg,msgSet.offline.isOn,msgSet.auto.isOn,function(json){
            tips.show(json.msg);
            if(json.status){
                //设置返回成功
                msgSet.offline.content=msg;
                //msgSet.offline.isOn=flag;
            }else {
                $("#offlineMsg_text").val(msgSet.offline.content);
                $("#offlineMsg").prop('checked',false);
            }
            //$("#msgSet_offline").hide();
        });
    });
    //消息设置-修改咨询回复
    $("#msgSet_auto").click(function(){
        //var flag=$("#autoMsg").prop('checked');
        //if(flag){
            var msg=$("#autoMsg_text").val().trim();
            if(msg=='') {
                tips.show('内容不能为空!');
                return;
            }
            if(msg.length>100){
                tips.show('回复内容不能超过100字!');
                return;
            }
            if(msg==msgSet.auto.content && msgSet.auto.isOn==flag) {
                //$("#msgSet_auto").hide();
                return;
            }
        //}
        setAutoReply('adviText',msg,msgSet.offline.isOn,msgSet.auto.isOn,function(json){
            tips.show(json.msg);
            if(json.status){
                //设置返回成功
                msgSet.auto.content=msg;
                //msgSet.auto.isOn=flag;
            }else {
                $("#autoMsg_text").val(msgSet.auto.content);
                $("#autoMsg").prop('checked',false);
            }
            //$("#msgSet_auto").hide();
        });
    });
    ////是否打开自动回复
    $("#msgSet_panel input[type=checkbox]").change(function(){
        var that=$(this);
        var flag=$(this).prop('checked');
        var param=flag ? '1':'0';
        var type=$(this).val();
        msgSet[type].isOn=flag;
        if(msgSet[type].content){
            setAutoReply(type,param,msgSet.offline.isOn,msgSet.auto.isOn,function(json){
                tips.show(json.msg);
                if(json.status){
                    //设置返回成功
                    msgSet[type].isOn=flag;
                }else {
                    msgSet[type].isOn=!flag;
                    that.prop('checked',!flag);
                }
            });
        }else if(param=='1' && (!msgSet[type].content || msgSet[type].content=='')) {
            msgSet[type].isOn=!flag;
            that.prop('checked',!flag);
            tips.show('请先保存回复内容');
        }
        //var type=$(this).val();
        //$("#msgSet_"+type).show();
    });
    //$("#offlineMsg_text").keydown(function(){
    //    $("#msgSet_offline").show();
    //});
    //$("#autoMsg_text").keydown(function(){
    //    $("#msgSet_auto").show();
    //});

    ///黑名单弹窗
    $("#block").click(function(){
        $("#setting").hide();
        var panel= $("#block_panel");
        blockList.render();
        panel.show();
        panel.find('.block').animateCss('fadeInDown');
    });
    $("#close_block").click(function(){
        var panel= $("#block_panel");
        panel.find('.block').animateCss('fadeOutUp',function(){
            panel.hide();
        });
    });
    $("#block_panel .dialog-overlay").click(function(){
        var panel= $("#block_panel");
        panel.find('.block').animateCss('fadeOutUp',function(){
            panel.hide();
        });
    });
    var blockList={
        state:{
            list:false//黑名单
        },
        init:function(){
            var that=this;
            getBlackList(function(json){
                that.state.list=json.data;
            },true)
        },
        render:function(){
            this.init();
            var list=this.state.list;
            var html='';
            for(var i=0;i<list.length;i++){
                html+=this.getItem(list[i]);
            }
            $("#block_list").html(html);
            this.clickBtn();
        },
        getItem:function(info){
            return '<div class="list_item">'+info.name+'<a href="javascript:;" class="btn" data-id="'+info.userid+'">移出黑名单</a></div>';
        },
        clickBtn:function(){
            $('#block_list .btn').click(function(){
                var that=$(this);
                var id=$(this).attr('data-id');
                delBlackList(id,function(json){
                    tips.show(json.msg);
                    if(json.status){
                        for(var i=0;i<blockList.state.list.length;i++){
                            if(blockList.state.list[i].userid==id){
                                blockList.state.list.splice(i,1);
                            }
                        }
                        that.closest('.list_item').animateCss('fadeOutRight','remove');
                        getContactList();
                    }
                })
            })
        }
    };
    //开关声音
    $("#ring").click(function(){
        var ring=render.state.ring;
        render.state.ring=!ring;
        if(render.state.ring){
            $(this).html('关闭声音');
        }else {
            $(this).html('打开声音');
        }
    });
    //退出系统
    $("#logout").click(function(){
        var msg={
            "senderid":user.userid,
            "operation":"offline",
            "content":"下线"
        };
        tips.loading();
        sendSocket(JSON.stringify(msg));
    });

    ///发起聊天
    $("#launch").click(function(e){
        renderLaunch.show();
    });
    $("#launch_panel .launch_tab a").click(function(){
        $(this).addClass('active').siblings().removeClass('active');
        $("#launch_panel .launch_tabPanel").hide();
        $($(this).attr('data-href')).show();
    });
    /////隐藏发起聊天面板
    $("#close_launch").click(function(e){
        renderLaunch.hide();
    });
    $("#launch_panel .dialog-overlay").click(function(){
        renderLaunch.hide();
    });
    var renderLaunch={
        state:{
            list:false,///好友排好序的列表
            select:[],//选中的人
            launch:'launch',////是否发起聊天页面 luanch/发起群聊 trans/转发 addMember/添加群成员 card/发送名片
            msg:false////转发的消息
        },
        init:function(){
            var contact=render.state.contactList.friend;
            if(!contact){
                getContactList(renderLaunch.init());
            }
            var cer=[];
            for(var i=0;i<contact.length;i++){
                for(var k in contact[i].friends){
                    var info=contact[i].friends[k];
                    if(info['userid'] != user.userid || renderLaunch.state.launch=='trans' || renderLaunch.state.launch=='card'){
                        var name=getName(info,Pname);
                        //name=name.substring(0,1);
                        var obj={
                            name:name,
                            info:info
                        };
                        cer.push(obj);
                    }
                }
            }
            //var sorted=pySegSort(cer);
            var sorted=orderPY(cer);
            renderLaunch.state.list=sorted;
        },
        getItem:function(json){
            var checked='';
            if(renderLaunch.state.select.indexOf(json.userid.toString())>-1){
                checked='checked="checked"';
            }
            var item='<label class="contact_item"><div class="avatar">'+
                '<img src="'+getUserPhoto(json)+'" class="img" alt="" onerror="this.src=indexImg;">'+
                '</div><div class="info">'+
                '<h4 class="nickname">'+getName(json,Pname)+'</h4></div>'+
                '<div class="check_box">'+
                '<input type="checkbox" value="'+json.userid+'" '+checked+'>'+
                '<i class="checkbox_icon"></i></div></label>';
            return item;
        },
        getItemGroup:function(json){
            var group='<div class="title">'+json.letter.toUpperCase()+'</div>';
            for(var i=0;i<json.data.length;i++){
                group+=renderLaunch.getItem(json.data[i]);
            }
            return group;
        },
        renderList:function(){
            renderLaunch.init();
            var listArr=renderLaunch.state.list;
            var list='';
            for(var i=0;i<listArr.length;i++){
                list+=renderLaunch.getItemGroup(listArr[i]);
            }
            $("#launch_list").html(list);
            if(this.state.launch=='launch' || this.state.launch=='addMember'){
                clickLaunchContact();
            }
        },
        renderResult:function(json){
            var listArr=json;
            var list='';
            for(var i=0;i<listArr.length;i++){
                list+=renderLaunch.getItemGroup(listArr[i],true);
            }
            $("#launch_list").html(list);
            if(this.state.launch=='launch' || this.state.launch=='addMember'){
                clickLaunchResult();
            }else if(this.state.launch=='trans'){
                clickTrans();
            }else if(this.state.launch=='card'){
                clickCard();
            }
        },
        getSelect:function(id){
            var list=renderLaunch.state.list;
            var u;
            for(var i=0;i<list.length;i++){
                for(var k=0;k<list[i]['data'].length;k++){
                    if(list[i]['data'][k]['userid'] == id ){
                        u=list[i]['data'][k];
                        break;
                    }
                }
            }
            var select='<div class="contactor" title="'+getName(u,Pname)+'" data-id="'+ u.userid+'"><div class="avatar">'+
                '<img class="img" src="'+getUserPhoto(u)+'" alt="" onerror="this.src=indexImg;"></div>'+
                '<div class="opt"><i class="chat_delete" data-id="'+ u.userid+'"></i></div></div>';
            return select;
        },
        renderGroups:function(){
            var group=render.state.contactList.group;
            var re='';
            for (var i=0;i<group.length;i++){
                re+=renderLaunch.getGroup(group[i]);
            }
            $("#group-list").html(re);
            if(this.state.launch=='launch'){
                clickLaunchGroup();
            }

        },
        getGroup:function(json){
            var group='<label class="contact_item" data-id="'+json.gchatid+'"><div class="avatar">'+
                '<img src="'+getUserPhoto(json)+'" class="img" alt="" onerror="this.src=indexImg;"></div><div class="info">'+
                '<h4 class="nickname">'+getName(json,Pname)+'</h4></div></label>';
            return group;
        }
/////搜索发起聊天
        ,
        search:function (text){
            var result=[];
            var select=renderLaunch.state.select;
            var list=renderLaunch.state.list;
            for (var i=0;i<list.length;i++){
                var temp={
                    letter:list[i].letter,
                    data:[]
                };
                for(var k=0;k<list[i].data.length;k++){
                    var name=getName(list[i].data[k],Pname);
                    var Sdata=list[i].data[k];
                    if(select.indexOf(Sdata.userid.toString()) == -1){
                        var Unpush=true;
                        for(var p=0;p<Sdata.py.length;p++){
                            if(Sdata.py[p].indexOf(text.toUpperCase()) > -1){
                                temp.data.push(Sdata);
                                Unpush=false;
                                break;
                            }
                        }
                        if(name.indexOf(text) > -1 && Unpush){
                            temp.data.push(Sdata);
                        }
                    }
                }
                if(temp.data.length>0){
                    result.push(temp);
                }
            }
            renderLaunch.renderResult(result);
        },
        show:function(title){
            if(title){
                $("#launch_panel").find('.launch_hd span').html(title);
            }
            $("#setting").hide();
            var panel= $("#launch_panel");
            panel.show();
            panel.find('.launch').animateCss('fadeInRightBig');
            renderLaunch.renderList();
            if(this.state.launch == 'addMember'){
                $("#launch_panel .launch_tab a").eq(1).hide();
            }else {
                renderLaunch.renderGroups();
            }
        },
        //隐藏发起聊天
        hide:function (call){
            renderLaunch.state.launch='launch';
            renderLaunch.state.msg=false;
            var panel= $("#launch_panel");
            $("#launch_panel .launch_tab a").eq(1).show();
            panel.find('.launch').animateCss('fadeOutLeftBig',function(){
                panel.hide().find('.launch_hd span').html('发起聊天');
                if(call && typeof call==='function'){
                    call();
                }
            });
            $("#launch_selected").html('');
            $("#launch_list").html('');
            $("#contact-list").show();
            $("#group-list").html('').hide();
            $("#launch_panel .launch_tab a").removeClass('active').eq(0).addClass('active');
            renderLaunch.state.list=false;
            renderLaunch.state.select=[];
            changeLaunchlist();
        }
    };

    $("#launch_text").keyup(function(event){
        var val=$(this).val().trim();
        var temp=$(this).attr('data-temp');
        if(val == ''&& val!=temp){
            renderLaunch.renderList();
        }else if(val!=temp){
            renderLaunch.search(val);
        }
        $(this).prop('data-temp',val);
    });
    ///点击发起聊天搜索结果
    function clickLaunchResult(){
        $("#launch_list input[type=checkbox]").change(function(event){
            var me=$(this);
            var id=me.val();
            if(me.prop('checked')){
                renderLaunch.state.select.push(id);
                var selected=renderLaunch.getSelect(id);
                $('#launch_selected').append(selected);
                clickLaunchDel();
            }
            renderLaunch.renderList();
            changeLaunchlist();
            $("#launch_text").val('');
        })
    }

    ///点击发起聊天联系人
    function clickLaunchContact(){
        $("#launch_list input[type=checkbox]").change(function(event){
            var me=$(this);
            var select=renderLaunch.state.select;
            var id=me.val();
            if(me.prop('checked')){
                renderLaunch.state.select.push(id);
                var selected=renderLaunch.getSelect(id);
                $('#launch_selected').append(selected);
                clickLaunchDel();
            }else {
                var index=select.indexOf(id);
                if(index>-1){
                    renderLaunch.state.select.splice(index,1);
                    $("#launch_selected .contactor[data-id="+id+"]").remove();
                }
            }
            changeLaunchlist();
        })
    }

    ///点击发起聊天群组
    function clickLaunchGroup(){
        $("#group-list .contact_item").unbind('click').click(function(event){
            var id=$(this).attr('data-id');
            var groups=render.state.contactList.group;
            for(var i=0;i<groups.length;i++){
                if(groups[i].gchatid==id){
                    toChat(groups[i]);
                    renderLaunch.hide();
                }
            }
        });
    }
    //转发信息
    function clickTrans(){
        function handle(id,type){
            var msg={},tId;
            $.extend(true,msg,renderLaunch.state.msg);
            var info=false;
            if(!msg) {
                renderLaunch.hide();
                return;
            }
            delete msg['msgSeq'];
            delete msg['sendtime'];
            delete msg['at'];
            delete msg['send'];
            delete msg['tId'];
            delete msg['msg'];
            delete msg['elem'];
            delete msg['timer'];
            delete msg['isH'];
            msg['msgId']=getMsgId(id);
            msg['senderid']=user.userid;
            if(type=='P'){
                var list=render.state.contactList.friend;
                for(var i=0;i<list.length;i++){
                    if(info)
                        break ;
                    for(var k=0;k<list[i].friends.length;k++){
                        if(list[i].friends[k].userid==id){
                            info=list[i].friends[k];
                            break;
                        }
                    }
                }
                delete msg['groupid'];
                msg['recevierid']=id;
                msg['operation']="sendmsg";
                tId="P-"+id;
            }else{
                var list=render.state.contactList.group;
                for(var i=0;i<list.length;i++){
                    if(list[i].gchatid==id){
                        info=list[i];
                        break;
                    }
                }
                delete msg['recevierid'];
                msg['groupid']=id;
                msg['operation']="sendgroup";
                tId="G-"+id;
            }
            info['type']=type;
            sendMsg(msg,tId);
            renderLaunch.hide();
            tips.show('转发成功');
        }

        $("#group-list .contact_item").unbind('click').click(function(event){
            handle($(this).attr('data-id'),'G');
        });
        $("#launch_list input[type=checkbox]").change(function(event){
            handle($(this).val(),'P');
        });
    }

    //发送名片
    function clickCard(){
        function handleCard(id,type){
            var msg=null;
            var callBack=null;
            if(type=='P'){
                var list=renderLaunch.state.list;
                var info=null;
                for(var i=0;i<list.length;i++){
                    for(var k=0;k<list[i]['data'].length;k++){
                        if(list[i]['data'][k]['userid']==id){
                            info=list[i]['data'][k];
                            break;
                        }
                    }
                }
                if(info){
                    var sex=info.hasOwnProperty('sex') && info['sex']==1?'女':'男';
                    msg={
                        filepath:getUserPhoto(info),
                        title:getName(info,Pext),
                        msgtype:"url",
                        url:"http://uatapi.wolianw.com/wolian.html?t=user&uid="+id,
                        content:"性别:"+sex
                    };
                    msg['senderid']=user.userid;
                    msg['msgId']=getMsgId(id);
                    if(render.state.chatType=='P'){
                        msg['recevierid']=render.state.chatId.split('-')[1];
                        msg['operation']="sendmsg";
                    }else {
                        msg['operation']="sendgroup";
                        msg['groupid']=render.state.chatId.split('-')[1];
                    }
                    sendMsg(msg,render.state.chatId);
                }
            }else {
                var url='/QrCode/addgroupInterface.do?gchatid='+id;
                var canvas = $("<div></div>").qrcode({text:url,quiet:2,background:'#ffffff',size:500}).find('canvas')[0];
                var dataurl = canvas.toDataURL('image/png');
                var blob = dataURLtoBlob(dataurl);
                callBack=function(){
                    sendConfirm.show(blob,uploadCallBack);
                };
            }
            renderLaunch.hide(callBack);
        }

        $("#group-list .contact_item").unbind('click').click(function(event){
            handleCard($(this).attr('data-id'),'G');
        });
        $("#launch_list input[type=checkbox]").change(function(event){
            handleCard($(this).val(),'P');
        });
    }

    ///点击图标删除选中
    function clickLaunchDel(){
        $("#launch_selected .chat_delete").unbind("click").click(function(){
            var id=$(this).attr('data-id');
            $("#launch_list input[value="+id+"]").prop('checked',false);
            $("#launch_selected .contactor[data-id="+id+"]").remove();
            var index=renderLaunch.state.select.indexOf(id);
            if(index>-1) {
                renderLaunch.state.select.splice(index, 1);
            }
            changeLaunchlist();
        })
    }
    ///样式交互
    function changeLaunchlist(){
        var len=renderLaunch.state.select.length;
        var list=$("#launch_list");
        var dis=false;
        if(len==0){
            list.removeClass('chose1').removeClass('chose2');
            dis=true;
        }else if(len>0 && len<=4){
            list.addClass('chose1').removeClass('chose2');
        }else if(len>4){
            list.addClass('chose2');
        }
        var num=len==0?'确定':'确定('+len+")";
        $("#send_launch").prop('disabled',dis).html(num);
    }
    ///点击发起聊天确定
    $("#send_launch").click(function(){
        if($(this).attr('disabled')){
            return ;
        }
        var friend=render.state.contactList.friend;
        var select=renderLaunch.state.select;
        if(renderLaunch.state.launch=='launch'){
            if(select.length == 1){
                var id=select[0];
                for(var i=0;i<friend.length;i++){
                    for(var k=0;k<friend[i].friends.length;k++){
                        if(friend[i].friends[k].userid==id){
                            toChat(friend[i].friends[k]);
                            renderLaunch.hide();
                        }
                    }
                }
            }else {
                var myPhoto=user.photo=='/img/icon.jpg'?'img/icon.jpg':user.photo;
                var name=[user.name],photo=[myPhoto];
                for(var t=0;t<select.length;t++){
                    for(var i=0;i<friend.length;i++){
                        for(var k=0;k<friend[i].friends.length;k++){
                            if(friend[i].friends[k].userid== select[t]){
                                name.push(getName(friend[i].friends[k],Pext));
                                var p=getUserPhoto(friend[i].friends[k]);
                                if(p=='/img/icon.jpg'){
                                    p='img/icon.jpg';
                                }
                                photo.push(p);
                            }
                        }
                    }
                }
                tips.show('<img src="/img/loadingFile.gif" /><p>Loading</p>',{auto:false,click:false});
                launch(select,name,photo,function(json){
                    if(json.status){
                        var group=json.data;
                        group['type']='G';
                        toChat(group);
                        renderLaunch.hide();
                        tips.hide();
                    }else {
                        tips.show(json.msg);
                    }
                })
            }
        }else if(renderLaunch.state.launch=='addMember'){
            var gid=render.state.chatId.split('-')[1];
            inviteGroupChat(select.join(','),gid,function(res){
                tips.show(res.msg);
                if(res.status){
                    updateMember(render.state.chatId)
                }
                renderLaunch.hide();
            })
        }

    });
    //汉字拼音排序-----弃用
    /**
     *
     * @param arr [{name:xxx,info:xxx}]
     * @param empty
     * @returns {*}
     */
    function pySegSort(arr,empty) {
        if(!String.prototype.localeCompare)
            return null;

        var letters = "*abcdefghijklmnopqrstwxyz".split('');
        //var zh = "阿八嚓哒妸发旮哈讥咔垃痳拏噢妑七呥扨它穵夕丫帀".split('');
        var zh = "啊把嚓大额发噶哈级卡啦吗那哦爬器然啥他哇西呀咋".split('');
        var segs = [];
        var curr;
        $.each(letters, function(i){
            var lett=this;
            curr = {letter: this, data:[]};
            $.each(arr, function() {
                var name= $.trim(this.name);
                var first=name.split('')[0];
                if(first.toLowerCase() == lett){
                    curr.data.push(this.info);
                }else if((!zh[i-1] || zh[i-1].localeCompare(name) <= 0) && name.localeCompare(zh[i]) == -1  ) {
                    if( !(/^[a-zA-Z]*$/.test(first))){
                        curr.data.push(this.info);
                    }
                }
            });
            if(empty || curr.data.length) {
                segs.push(curr);
                curr.data.sort(function(a,b){
                    var aNmae=getName(a,Pname);
                    var bNmae=getName(b,Pname);
                    return aNmae.localeCompare(bNmae);
                });
            }
        });
        return segs;
    }






    //汉字拼音排序
    /**
     *
     * @param arr [{name:xxx,info:xxx}]
     * @returns [{letter:'a',data:[{info}]}]
     */
    function orderPY(arr){
        var letters = "*abcdefghijklmnopqrstwxyz".split('');
        var segs=[];
        for(var k=0;k<letters.length;k++){
            var curr={
                letter:letters[k],
                data:[]
            };
            for(var i=0; i<arr.length;i++){
                var name=arr[i].name;
                var py=makePy(name);
                arr[i].info['py']=py;
                var first=py[0]==''?'':py[0].split('')[0].toLowerCase();
                if( !(/^[a-zA-Z]*$/.test(first)) && letters[k]=='*'){
                    curr.data.push(arr[i].info);
                }else if(/^[a-zA-Z]*$/.test(first) && first==letters[k]){
                    curr.data.push(arr[i].info);
                }
            }
            if(curr.data.length) {
                segs.push(curr);
                curr.data.sort(function(a,b){
                    var aNmae=a['py'][0];
                    var bNmae=b['py'][0];
                    return aNmae.localeCompare(bNmae);
                });
            }
        }
        return segs;
    }

    //参数,中文字符串
    //返回值:拼音首字母串数组
    function makePy(str){
        if(typeof(str) != "string")
            throw new Error(-1,"函数makePy需要字符串类型参数!");
        var arrResult = []; //保存中间结果的数组
        for(var i=0,len=str.length;i<len;i++){
            //获得unicode码
            var ch = str.charAt(i);
            //检查该unicode码是否在处理范围之内,在则返回该码对映汉字的拼音首字母,不在则调用其它函数处理
            arrResult.push(checkCh(ch));
        }
        //处理arrResult,返回所有可能的拼音首字母串数组
        return mkRslt(arrResult);
    }
    function checkCh(ch){
        var uni = ch.charCodeAt(0);
        //如果不在汉字处理范围之内,返回原字符,也可以调用自己的处理函数
        if(uni > 40869 || uni < 19968)
            return ch; //dealWithOthers(ch);
        //检查是否是多音字,是按多音字处理,不是就直接在strChineseFirstPY字符串中找对应的首字母
        return (oMultiDiff[uni]?oMultiDiff[uni]:(strChineseFirstPY.charAt(uni-19968)));
    }
    function mkRslt(arr){
        var arrRslt = [""];
        for(var i=0,len=arr.length;i<len;i++){
            var str = arr[i];
            var strlen = str.length;
            if(strlen == 1){
                for(var k=0;k<arrRslt.length;k++){
                    arrRslt[k] += str;
                }
            }else{
                var tmpArr = arrRslt.slice(0);
                arrRslt = [];
                for(k=0;k<strlen;k++){
                    //复制一个相同的arrRslt
                    var tmp = tmpArr.slice(0);
                    //把当前字符str[k]添加到每个元素末尾
                    for(var j=0;j<tmp.length;j++){
                        tmp[j] += str.charAt(k);
                    }
                    //把复制并修改后的数组连接到arrRslt上
                    arrRslt = arrRslt.concat(tmp);
                }
            }
        }
        return arrRslt;
    }



    function getMT(msg){
        var MT='';
        if('msgtype' in msg){
            switch (msg['msgtype']){
                case 'text':
                    MT= 'MT-text';
                    break;
                case 'loadingimg':
                case 'image':
                    MT='MT-img';
                    break;
                case 'file':
                case 'loadingfile':
                    MT='MT-file';
                    break;
                default :
                    MT='MT-other';
                    break;
            }
        }
        return MT;
    }








//发送上传图片文件========================begin
    function uploadCallBack(req,padding,msgId){
        var _req=JSON.parse(req);
        if(_req.status){
            var temp=checkFile(_req.url).isImg;
            sendFile(_req.url,temp,padding,msgId);
        }else {
            $("#chatBox .bubble_cont[data-padding='load"+padding+"']").closest('.message').remove();
            render.systemTips('上传失败！');
        }
    }
    //上传文件
    $("#chatFile").click(function(){
        myUpload({
            maxSize:100,
            uploadUrl: "/chat/upload",
            callback:uploadCallBack,
        })
    });
    // 检查浏览器是否支持拖放上传。
    if('draggable' in document.createElement('span')){
        var holder = document.getElementById('Msg');
        holder.ondragover = function () { $("#chatBox .box_ft").addClass('onDrop'); return false; };
        holder.ondragend = function () { $("#chatBox .box_ft").removeClass('onDrop'); return false; };
        holder.ondragleave = function () { $("#chatBox .box_ft").removeClass('onDrop'); return false; };
        holder.ondrop = function (event) {
            event.preventDefault();
            event.stopPropagation();
            $("#chatBox .box_ft").removeClass('onDrop');
            var files = event.dataTransfer.files;
            if(files.length>0){
                sendConfirm.show(files[0],uploadCallBack);
            }

        };
    }
    //粘贴文件或图片
    document.addEventListener("paste", function (e) {
        var cbd = e.clipboardData;
        var ua = window.navigator.userAgent;

        // 如果是 Safari 直接 return
        if ( !(e.clipboardData && e.clipboardData.items) ) {
            return ;
        }
        // Mac平台下Chrome49版本以下 复制Finder中的文件的Bug Hack掉
        if(cbd.items && cbd.items.length === 2 && cbd.items[0].kind === "string" && cbd.items[1].kind === "file" && cbd.types && cbd.types.length === 2 && cbd.types[0] === "text/plain" && cbd.types[1] === "Files" &&  ua.match(/Macintosh/i) && Number(ua.match(/Chrome\/(\d{2})/i)[1]) < 49){
            return;
        }
        for(var i = 0; i < cbd.items.length; i++) {
            var item = cbd.items[i];
            if(item.kind == "file"){
                var blob = item.getAsFile();
                if (blob.size === 0) {
                    return;
                }
                // blob 就是从剪切板获得的文件 可以进行上传或其他操作
                sendConfirm.show(blob,uploadCallBack);

            }
        }
    }, false);
    function checkFile(files){
        var fileSuffix=[
            'jpg','png','gif','bmp','pic','tif','tiff','ico','psd','pcx','tga','exif','fpx','svg','cdr','ai','pcd','dxf','ufo','eps','hdri','raw',
            'txt','doc','docx','xls','xlsx','ppt','pptx','pdf','pub','vsd','wps',
            'rar','zip','arj','gz','z','7-zip','tar','cab','uue','jar','ace','lzh','ios','gzip','bz2','7z',
            'rmvb','rm','avi','mpg','mov','wmv','dat','mpg','mpeg',
            'wav','au','mp3','ram','wma','mmf','amr','aac','flac',
            'htm','html','xml','shtml','stm','shtm'
        ];
        var img=['jpg','png','gif','jpeg'];
        if(files.indexOf('/')>-1 || files.indexOf('\\')>-1){
            var name=getFileName(files);
        }else {
            var name=files;
        }
        var fileName=name.split('.');
        var suffix=fileName[fileName.length-1].toLocaleLowerCase();
        var res={
            isFile:true,
            isImg:true,
            name:name
        };
        if(fileSuffix.indexOf(suffix) == -1){
            res.isFile = false;
        }
        if(img.indexOf(suffix) == -1){
            res.isImg = false;
        }
        res.type=suffix;

        return res;
    }

    function sendFile(filePath,img,padding,msgId){
        //var d = new Date();
        //var msgId= getMsgId(user.userid);
        var msg={
            'senderid'  : user.userid,
            'msgId'     : msgId,
            'filepath'  : filePath,
            'msgtype'   : img ? 'image' : 'file'
        };
        if(!img){
            msg['content']=padding;
        }
        if(render.state.chatType=='G'){
            msg['groupid']=render.state.chatId.split('-')[1];
            msg['operation']='sendgroup';
        }else {
            msg['recevierid']=render.state.chatId.split('-')[1];
            msg['operation']='sendmsg';
        }
        if(msgId in upfile){
            delete upfile[msgId];
        }
        upfile[msgId]=padding;
        sendMsg(msg,render.state.chatId);
        $("#chatBox .bubble_cont[data-padding='load"+padding+"']").parent('.bubble').attr('data-id',msgId)
    }
    var myUpload = function(option) {
        var file,
            fd = new FormData(),
            callback, tot, per, uploadUrl, input;

        if(document.getElementById('myUploadInput')){
            input = document.getElementById('myUploadInput');
        }else{
            input = document.createElement('input');
            input.setAttribute('id', 'myUploadInput');
            input.setAttribute('type', 'file');
            input.setAttribute('name', 'file');
            document.body.appendChild(input);
            input.style.display = 'none';
        }
        input.click();
        input.onchange = function() {
            file = input.files[0];
            new uploadFile(file,option);
        }
    };
//开启xhr上传文件
    function uploadFile(file,option,ignore){
        var fileType="img";
        if(!ignore){
            if (!file) {
                return false;
            }
            if(file.name){
                var flag=checkFile(file.name);
                fileType=flag.isImg?"img":"file";
                if(!flag.isFile){
                    render.systemTips('不支持该类型文件的上传');
                    if(document.getElementById('myUploadInput')){
                        document.getElementById('myUploadInput').value='';
                    }
                    return false;
                }
            }

        }
        if (file.size > _uploadMaxSize * 1024 * 1024) {
            render.systemTips('文件大小超过系统限制（'+_uploadMaxSize+'M）');
            if(document.getElementById('myUploadInput')){
                document.getElementById('myUploadInput').value='';
            }
            return false;
        }
        var fd=new FormData();
        var timeId=new Date().getTime()  * Math.floor(Math.random()*100000);
        if(file['name']){
            var padding=flag.name;
            fd.append("files", file);
        }else {
            var padding=timeId;
            fd.append("files", file, padding+'.png');
        }
        //发送前
        var msg={
            'senderid'  : user.userid,
            'recevierid': render.state.chatId.split('-')[1],
            'sendtime'  : getNow(),
            'msgtype'   : 'loading'+fileType,
            'padding'   : padding,
            'msgId'     : getMsgId(user.userid)
        };
        render.appendChat(msg);
        var uploadUrl = option.uploadUrl;
        var callback =option.callback;
        var uploading=option['uploading']?option['uploading']:false;
        var  xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4 && xhr.status == 200) {
                if (callback instanceof Function) {
                    callback(xhr.responseText,padding,msg['msgId']);
                    var input=document.getElementById('myUploadInput');
                    if(input){
                        input.value='';
                    }
                }
            }
        };
        //侦查当前附件上传情况
        xhr.upload.onprogress = function(evt) {
            var loaded = evt.loaded;
            var tot = evt.total;
            var pre = Math.floor(100 * loaded / tot); //已经上传的百分比
            var cont=$("#chatBox .bubble_cont[data-padding='load"+padding+"']");
            if (uploading  instanceof Function) {
                uploading (pre,padding);
            }
        };
        xhr.open("post", uploadUrl);
        xhr.send(fd);
    }
//发送上传图片文件========================end


    function goToChat(){
        $('#menu_chat').addClass('active').siblings().removeClass('active');
        $('#panel_list>div').hide();
        $('#chatList').show();
        $("#chat .chat").hide();
        $("#panel_list .nabHeader").show();
        $("#chatBox").show().children('div').show();
        $("#loading").hide();
        $("#search_bar").show();
        $("#chatBox .poi").show();
        $("#Msg").attr('disabled',false).focus();
    }
    function goToContact(){
        if($('#menu_contact').hasClass('active')) return;
        $('#menu_contact').addClass('active').siblings().removeClass('active');
        $('#panel_list>div').hide();
        $('#panel_list .nabHeader').show();
        $('#contactList').show();
        $("#search_bar").show();
        $("#chat .chat").hide();
        $("#contactBox").show().children('div').show();
    }
    function showContactDetail(tId,info){
        $("#detail_panel").show().siblings().hide();
        $("#contactBox .title_name").html('详细信息');
        var loading='<div class="avatar" style="padding-top: 70px;"><img src="/img/loadingFile.gif"></div>';
        $("#detail_panel").empty().append(loading).show();
        var userid=tId;
        var type=tId.split('-')[0];
        render.state.detailBox=userid;
        if(info){
            render.state.contact=info;
            var detail=render.contactDetail(info,type);
            $("#detail_panel").empty().append(detail).show();
            clickSendMsgTo();
        }else if(type=='P'){
            getUserInfo(userid.split('-')[1],'',function(json){
                json.data['type']=type;
                render.state.contact=json.data;
                var _usrData=json.data;
                var detail=render.contactDetail(_usrData,type);
                $("#detail_panel").empty().append(detail).show();
                clickSendMsgTo();
            });
        }else if(type=='G'){
            getGroupDetail(userid.split('-')[1],function(json){
                json.data['type']=type;
                render.state.contact=json.data;
                var _usrData=json.data;
                var detail=render.contactDetail(_usrData,type);
                $("#detail_panel").empty().append(detail).show();
                clickSendMsgTo();
            });
        }
    }
    context.init({preventDoubleContext: false});//初始化右键功能
    function contMenu(){///右键菜单功能绑定事件
        var top={text:'置顶会话', href: 'javascript:;',action:function(e){
            var tId=$(this).attr('data-target');
            if(pinned.indexOf(tId)<0){
                pinnedTop(tId,function(json){
                    if(json.status=='success'){
                        pinned.unshift(tId);
                        var list=$("#chatList .chat_item[data-id="+tId+"]");
                        list.remove();
                        $("#pinned").prepend(list);
                        clickSession();
                    }else {
                        tips.show(json.message);
                    }
                });
            }
        }};
        var off={text:'取消置顶', href: 'javascript:;',action:function(e){
            var tId=$(this).attr('data-target');
            if(pinned.indexOf(tId)>-1){
                pinnedOff(tId,function(json){
                    if(json.status=='success'){
                        pinned.splice(pinned.indexOf(tId),1);
                        var list=$("#chatList .chat_item[data-id="+tId+"]");
                        list.remove();
                        $("#pinned").after(list);
                        clickSession();
                    }else {
                        tips.show(json.message);
                    }
                });
            }
        }};
        var detail={text:'查看详细信息', href: 'javascript:;',action:function(e){
            var tId=$(this).attr('data-target');
            showDetail(tId);
        }};
        var delSession={text:'删除会话', href: 'javascript:;',action:function(e){
            var tId=$(this).attr('data-target');
            var list=$("#chatList .chat_item[data-id="+tId+"]");
            //清空历史，当前，聊天记录
            var current=currentMSg[tId];
            var history=localMsg[tId];
            if(current){
                if(!history){
                    localMsg[tId]=[];
                }
                ///当前记录保存进历史记录，然后清空当前记录
                for(var i=0;i<current.length;i++){
                    localMsg[tId].unshift(current[i]);
                }
            }
            currentMSg[tId]=[];
            ///从会话列表删除
            delete render.state.chatList[tId];
            var index=pinned.indexOf(tId);
            if(index>-1) {
                pinnedOff(tId,function(json){
                    if(json.status=='success'){
                        pinned.splice(index,1);
                    }else {
                        tips.show(json.message);
                    }
                });
            }
            if(render.state.chatId==tId){
                render.state.chatId=null;
                render.state.chatImg=null;
                render.state.chatName=null;
            }
            list.animateCss('bounceOutLeft','remove');
            emptyChat();
        }};
        var clearSession={text: '清空聊天记录', href: 'javascript:;',action:function(e){
            var tId=$(this).attr('data-target');
            var current=currentMSg[tId];
            var history=localMsg[tId];
            if(!current){
                return;
            }
            if(!history){
                localMsg[tId]=[];
            }
            ///当前记录保存进历史记录，然后清空当前记录
            for(var i=0;i<current.length;i++){
                localMsg[tId].unshift(current[i]);
            }
            currentMSg[tId]=[];
            render.chatBox(tId);
            $("#chatList .chat_item[data-id="+tId+"]").find('.msg span').html('');
        }};
        var addBlock={text:'加入黑名单', href: 'javascript:;',action:function(e){
            var tId=$(this).attr('data-target');
            var id=tId.split('-')[1];
            addBlackList(id,function(json){
                tips.show(json.msg);
                if(json.status){
                    $("#chatList .chat_item[data-id="+tId+"]").animateCss('fadeOutLeft','remove');
                    var conte=$("#contactList .contact_item[data-id="+tId+"]").animateCss('fadeOutLeft','remove');
                    if(conte.closest('.contact_list').hasClass('on')){
                        conte.closest('.item_box').height('auto');
                    }
                    var num=conte.closest(".contact_list").find(".num_members");
                    num.html(parseInt(num.html(),10)-1);
                }
            })
        }};
        var delSys={text:'删除会话', href: 'javascript:;',action:function(e){
            var tId=$(this).attr('data-target');
            var list=$("#systemList .chat_item[data-id="+tId+"]");
            delete renderNotice.state.List[tId];
            renderNotice.state.msg[tId]=[];
            renderNotice.state.newNotice[tId]=[];
            list.remove();
            updateSysNum();
            if(list.hasClass('active')){
                $("#systemBox div.box_bd").html('');
            }
        }};
        var clearSys={text: '清空消息记录', href: 'javascript:;',action:function(e){
            var tId=$(this).attr('data-target');
            if(!renderNotice.state.msg[tId]){
                return;
            }
            renderNotice.state.msg[tId]=[];
            renderNotice.state.newNotice[tId]=[];
            renderNotice.appendMsg(renderNotice.state.msg[tId]);
            updateSysNum();
            var list=$("#systemList .chat_item[data-id="+tId+"]");
            list.find('.msg span').html('');
            list.find('.woxin_reddot').remove();
        }};
        var delOrder={text:'删除会话', href: 'javascript:;',action:function(e){
            var tId=$(this).attr('data-target');
            var list=$("#orderList .chat_item[data-id="+tId+"]");
            delete renderOrder.state.List[tId];
            renderOrder.state.msg[tId]=[];
            renderOrder.state.newOrder[tId]=[];
            updateOrdNum();
            list.remove();
            if(list.hasClass('active')){
                $("#orderBox div.box_bd").html('');
            }
        }};
        var clearOrder={text: '清空消息记录', href: 'javascript:;',action:function(e){
            var tId=$(this).attr('data-target');
            if(!renderOrder.state.msg[tId]){
                return;
            }
            renderOrder.state.msg[tId]=[];
            renderOrder.state.newOrder[tId]=[];
            updateOrdNum();
            renderOrder.appendMsg(renderOrder.state.msg[tId]);
            var list=$("#orderList .chat_item[data-id="+tId+"]");
            list.find('.msg span').html('');
            list.find('.woxin_reddot').remove();
        }};
        //信息右键
        var msgDel={text: '删除', href: 'javascript:;',action:function(e){
            var msgId=$(this).attr('data-target');
            var tId=render.state.chatId;
            if(msgId == 'undefined' || msgId=='null'){
                var msgSeq=$(this).attr('data-msgSeq');
                msgId={msgSeq:msgSeq};
            }
            var flag=reMsg(tId,msgId,'del');
            if(flag){
                removeMsg(msgId);
            }
        }};
        var msgCopy={text: '复制', href: 'javascript:;',action:function(e){
            var msgId=$(this).attr('data-target');
            var tId=render.state.chatId;
            if(!document.querySelector('#copyNode')){
                var mynode=document.createElement('span');
                mynode.id='copyNode';
                document.querySelector('body').appendChild(mynode);
            }
            var mynode=document.querySelector('#copyNode');
            mynode.innerHTML=reMsg(tId,msgId,'copy');
            var msg=$("#chatBox .bubble[data-id="+msgId+"]").find('.bubble_cont')[0];
            var range = document.createRange();
            range.selectNode(mynode);
            var selection = window.getSelection();
            if(selection.rangeCount > 0) selection.removeAllRanges();
            selection.addRange(range);
            document.execCommand('copy');
            tips.show('已复制到粘贴板！');
            $("#Msg").focus();
        }};
        var msgTrans={text: '转发', href: 'javascript:;',action:function(e){
            var msgId=$(this).attr('data-target');
            var tId=render.state.chatId;
            var msg=reMsg(tId,msgId,'trans');
            if(msg){
                $("#setting").hide();
                renderLaunch.state.msg=msg;
                renderLaunch.state.launch='trans';
                renderLaunch.show('选择转发对象');
                clickTrans();
            }
        }};
        var msgDownLoad={text: '下载', href: 'javascript:;',action:function(e){
            var msgId=$(this).attr('data-target');
            var tId=render.state.chatId;
            var file=reMsg(tId,msgId,'download');
            if(file){
                var aLink = document.createElement('a');
                var evt = document.createEvent("MouseEvents");
                evt.initEvent("click", false, false);//initEvent 不加后两个参数在FF下会报错
                aLink.download = file.name;
                aLink.href = file.patch;
                aLink.dispatchEvent(evt);
            }
        }};
        var msgRecall={text: '撤回', href: 'javascript:;',action:function(e){
            var msgId=$(this).attr('data-target');
            var msg={
                "recevierid":render.state.chatId.split('-')[1],
                "senderid":user.userid,
                "msgId":msgId,
                "operation":"withdraw",
                "msgtype":render.state.chatType=='P'?"user":"group"
            };
            sendMsg(msg,render.state.chatId,true);
        }};
        var qrcode={text: '识别二维码', href: 'javascript:;',action:function(e){
            var msgId=$(this).attr('data-target');
            var tId=render.state.chatId;
            var file=reMsg(tId,msgId,'qrcode');
            if(file){
                tips.loading();
                parseQrcode(file,function(res){
                    if(res.status){
                        tips.hide();
                        if(res.path.indexOf('/QrCode/addgroupInterface.do?')>-1){
                            var id=getParam(res.path,'gchatid');
                            var tId='G-'+id;
                            var info=null;
                            groupQrCode(id,function(json){
                                if(json['status']){
                                    if(json['data']['isJoin']==0){
                                        info= json['data'];
                                        info['type']='G';
                                    }
                                }else {
                                    tips.show(json.msg);
                                }
                            },true);
                            if(info){
                                return showDetail(tId,info);
                            }else if(render.state.chatList.hasOwnProperty(tId)){
                                info=render.state.chatList[tId];
                            }else {
                                getGroupDetail(id, function (group){
                                    if(group['status']){
                                        info=group['data'];
                                        info['type']='G';
                                    }
                                },true)
                            }
                            info?toChat(info):null;
                        }else {
                            var content='<span>二维码内容</span><span class="small">'+res.path+'</span>';
                            confirmModel.show({
                                content:content,
                                cancel:false,
                                confirm:true
                            })
                        }
                    }else {
                        tips.show('无法识别！');
                    }
                });
            }
        }};
        //会话列表右键菜单
        context.attach('#chatList .chat_list>.chat_item[data-type=G]',render.state.hasContact ? [top,detail,delSession,clearSession]:[top,delSession,clearSession]);
        context.attach('#chatList .chat_list>.chat_item[data-type=P]',render.state.hasContact ? [top,detail,delSession,clearSession,addBlock]:[top,delSession,clearSession,addBlock]);

        //置顶会话列表右键菜单
        context.attach('#pinned .chat_item[data-type=G]',render.state.hasContact ? [off,detail,delSession,clearSession]:[off,delSession,clearSession]);
        context.attach('#pinned .chat_item[data-type=P]',render.state.hasContact ? [off,detail,delSession,clearSession,addBlock]:[off,delSession,clearSession,addBlock]);

        //系统通知列表右键菜单
        context.attach('#systemList .chat_item',[delSys,clearSys]);

        //订单通知列表右键菜单
        context.attach('#orderList .chat_item',[delOrder,clearOrder]);

        ///通信录右键菜单
        render.state.hasContact ? context.attach('#contactList .contact_item[data-type=P]',[addBlock]):false;


        ///聊天信息右键
        ////信息类型text、file、other
        ///文字类型
        context.attach('#chatBox .me .MT-text',[msgCopy,msgDel,msgTrans,msgRecall]);
        context.attach('#chatBox .you .MT-text',[msgCopy,msgDel,msgTrans]);
        //文件
        context.attach('#chatBox .me .MT-file',[msgDownLoad,msgDel,msgTrans,msgRecall]);
        context.attach('#chatBox .you .MT-file',[msgDownLoad,msgDel,msgTrans]);
        ///图片
        context.attach('#chatBox .me .MT-img',[msgDownLoad,msgDel,msgTrans,msgRecall,qrcode]);
        context.attach('#chatBox .you .MT-img',[msgDownLoad,msgDel,msgTrans,qrcode]);
        ///其他
        context.attach('#chatBox .me .MT-other',[msgDel,msgRecall]);
        context.attach('#chatBox .you .MT-other',[msgDel]);
    }
    function showDetail(tId,info){
        goToContact();
        var list=$("#contactList .contact_item[data-id="+tId+"]");
        if(!list.hasClass('active')){
            $("#contactList .contact_list").removeClass('on').find('.item_box').height(0);
            $("#contactList .contact_item").removeClass('active');
            if(list.length != 0){
                list.addClass('active').closest('.contact_list').addClass('on');
                list.addClass('active').closest('.item_box').height('auto');
            }
        }
        $("#Fpanle").addClass('on').find('.item_box').height('auto');
        showContactDetail(tId,info);
    }

    ///信息右键处理
    function reMsg(tId,msgId,type){
        var unDel=true;
        var msg=false;
        var re=false;
        var key='msgId';
        var value=msgId;
        if(typeof msgId === "object"){
            for(var k in msgId){
                key=k;
            }
            value=msgId[key];
        }
        if(currentMSg[tId]){
            for(var i=0;i<currentMSg[tId].length;i++){
                if('msgId' in currentMSg[tId][i] && currentMSg[tId][i][key] == value){
                    if(type=='del'){
                        if(i==currentMSg[tId].length-1){
                            $("#chatList .chat_item[data-id="+tId+"]").find('.msg span').html('');
                        }
                        currentMSg[tId].splice(i,1);
                        unDel=false;
                    }else {
                        msg=currentMSg[tId][i];
                    }
                }
            }
        }
        if(localMsg[tId] && unDel){
            for(var k=0;k<localMsg[tId].length;k++){
                if(key in localMsg[tId][k] && localMsg[tId][k][key] == value){
                    if(type=='del'){
                        localMsg[tId].splice(k,1);
                        unDel=false;
                    }else {
                        msg=localMsg[tId][k];
                    }
                }
            }
        }
        if(type=='del' && unreadMsg[tId]){
            for(var k=0;k<unreadMsg[tId].length;k++){
                if(key in unreadMsg[tId][k] && unreadMsg[tId][k][key] == value){
                    unreadMsg[tId].splice(k,1);
                    updataMsgNum(tId,true);
                }
            }
        }
        if(msg){
            switch (type){
                case 'download':
                    if(msg['filepath']){
                        re={
                            name:msg['msgtype']=='file' ? msg['content'] : getFileName(msg.filepath) ,
                            patch:msg.filepath
                        }
                    }
                    return re;
                case 'qrcode':
                    if(msg['filepath']){
                        re=msg.filepath;
                    }
                    return re;
                case 'trans':
                    return msg;
                case 'copy':
                    return msg.content;
            }
        }
        return !unDel;
    }
    //删除当前聊天窗口的信息
    function removeMsg(msgId){
        var msg=$("#chatBox .bubble[data-id="+msgId+"]").closest('.message');
        msg.hasClass('me') ? msg.animateCss('zoomOutRight','remove') : msg.animateCss('zoomOutLeft','remove');
    }
    function emptyChat(){
        var chat=$("#chatBox");
        chat.find('div.poi').hide();
        chat.find('div.box_bd').html('<div class="message_empty"><i class="web_wechat_nomes_icon"></i> <p>未选择聊天</p></div>');
        chat.find('div.box_ft').hide();
        $("#chat_members").hide();
        $("#loading").hide();
    }



    var sendConfirm={
        isShown:false,
        file:false,
        getHtml:function(file){
            var name=file['name'] ? file.name:'图片.png';
            var content='';
            if(file.type.indexOf('image')>-1){
                var src= window.URL.createObjectURL(file);
                content='<img class="sendFile" src="'+src+'" alt="">';
            }else {
                var suffix=name.split('.');
                suffix= suffix[suffix.length-1];
                var logo=suffix.toLowerCase();
                var className='woxin_file_'+getLogo(logo);
                content='<div class="sendFile"><i class="'+className+'"></i></div>';
            }
            var html='<div id="sendConfirm" class="pop_confirm"><div class="pop_content">'+
                '<a class="btn_close"><i id="close_sendConfirm" class="close-window"></i></a>'+
                '<div class="pop_img_box">'+
                '<div class="box_content">'+
                content+
                '</div></div><p>发送 '+name+' ？</p>'+
                '<a href="javascript:;" id="Confirm" class="btn">确定</a></div></div>';
            return html;
        },
        show:function(file,uploadCallBack){
            var that=this;
            var html=this.getHtml(file);
            $("#chatBox").append(html);
            this.isShown=true;
            $(document).click(function(){
                $('#sendConfirm').remove();
            });
            $('#sendConfirm .pop_content').click(function(e){
                e.stopPropagation();
            });
            $("#close_sendConfirm").click(function(e){
                that.hide();
            });
            $("#Msg").blur();
            $("#Confirm").click(function(){
                that.hide();
                var up = new uploadFile(file,{
                    maxSize:100,
                    uploadUrl: "/chat/upload",
                    callback:uploadCallBack
                });
            });
        },
        hide:function(){
            if(this.isShown){
                $("#sendConfirm").remove();
                this.isShown=false;
            }
            $("#Msg").focus();
        }
    };
    //$(window).bind('beforeunload',function(){return '您输入的内容尚未保存，确定离开此页面吗？';});
    init();
});


