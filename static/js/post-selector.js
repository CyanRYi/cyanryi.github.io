function togglePosts(id, checked) {

    var posts = document.getElementsByClassName(id);

    for(var j = 0; j < posts.length; j++) {
        if (checked) {
            posts[j].classList.remove('is-hidden');
        } else {
            posts[j].classList.add('is-hidden');
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