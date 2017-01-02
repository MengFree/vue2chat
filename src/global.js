function scrollDown() {
    setTimeout(function() {
        $('#chatBox .box_bd').get(0).scrollTop = $('#chatBox .box_bd').get(0).scrollHeight;
    }, 1);
}