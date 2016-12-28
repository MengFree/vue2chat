/**
 * Created by MengFree on 2016/9/26.
 */
$(function(){
    //菜单切换
    $('#panel_list .mainList').click(function(){
        if($(this).hasClass('active')){
            return ;
        }
        var _target=$(this).attr('data-href');
        if(!_target){
            return ;
        }
        $(this).addClass('active').siblings().removeClass('active');
        $('#panel_list .List').hide();
        $('.box').hide();
        if(_target=='#contact'){
            $("#search_bar").show();
            //if($("#contactList .contact_list").length<=1){
            //    getContactList();
            //}

        }
        $(_target+'List').show();
        $(_target+'Box').show();
    });

    //二维码显示
    $('#qrcode').hover(function(){
        $('#APP_qrcode').show();
    },function(){
        $('#APP_qrcode').hide();
    });
});