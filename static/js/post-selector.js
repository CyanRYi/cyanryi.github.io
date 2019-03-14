function togglePosts(id, checked) {

    var posts = document.getElementsByClassName(id);

    for(var j = 0; j < posts.length; j++) {
        if (checked) {
            posts[j].style.display = 'flex';
        } else {
            posts[j].style.display = 'none';
        }
    }
}

document.addEventListener("DOMContentLoaded", function() {

    var checkboxes = document.getElementsByClassName('mdl-switch__input');

    for(var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].addEventListener('change', function() {
            togglePosts(this.id, this.checked);
        })
    }
    var unchecked = document.querySelectorAll('input[type=checkbox]:not(:checked)');

    for(var i = 0; i < unchecked.length; i++) {
        togglePosts(unchecked[i].id, false);
    }

    var checked = document.querySelectorAll('input[type=checkbox]:checked');

    for(var i = 0; i < checked.length; i++) {
        togglePosts(checked[i].id, true);
    }
});