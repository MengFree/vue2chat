/**
 * Created by Administrator on 2016/9/27.
 */
$(function(){
    //菜单切换
    $('#menu .menu_list').click(function(e){

        if($(this).hasClass('active')){
            return ;
        }
        var _target=$(this).attr('data-href');
        if(!_target){
            return ;
        }
        if(_target == 'setting'){
            e.stopPropagation();
            $("#setting").show().animateCss('lightSpeedIn','show');
            return ;
        }
        $(this).addClass('active').siblings().removeClass('active');
        $('.panel_list').children('div').hide();
        $('.box').hide();
        if(_target=='#contact' || _target=='#chat'){
            $("#search_bar").show();
        }
        $(_target+'List').show();
        $(_target+'Box').show();
        //if(_target=='#chat'||_target=='#contact'){
        //    $('#search_bar').show();
        //}
    });
    //发起聊天tab切换
    $('#launch .launch_tab a').click(function(){
        if($(this).hasClass('active')){
            return;
        }
        $(this).addClass('active').siblings().removeClass('active');
        var _target=$(this).attr('data-href');
        $('#launch .contact_box').hide();
        $(_target).show();
    });
});