// Changes XML to JSON
// Modified version from here: http://davidwalsh.name/convert-xml-json
function xmlToJson(xml) {

    // Create the return object
    var obj = {};

    if (xml.nodeType == 1) { // element
        // do attributes
        if (xml.attributes.length > 0) {
            obj["@attributes"] = {};
            for (var j = 0; j < xml.attributes.length; j++) {
                var attribute = xml.attributes.item(j);
                obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
            }
        }
    } else if (xml.nodeType == 3) { // text
        obj = xml.nodeValue;
    }

    // do children
    // If all text nodes inside, get concatenated text from them.
    var textNodes = [].slice.call(xml.childNodes).filter(function (node) { return node.nodeType === 3; });
    if (xml.hasChildNodes() && xml.childNodes.length === textNodes.length) {
        obj = [].slice.call(xml.childNodes).reduce(function (text, node) { return text + node.nodeValue; }, '');
    }
    else if (xml.hasChildNodes()) {
        for(var i = 0; i < xml.childNodes.length; i++) {
            var item = xml.childNodes.item(i);
            var nodeName = item.nodeName;
            if (typeof(obj[nodeName]) == "undefined") {
                obj[nodeName] = xmlToJson(item);
            } else {
                if (typeof(obj[nodeName].push) == "undefined") {
                    var old = obj[nodeName];
                    obj[nodeName] = [];
                    obj[nodeName].push(old);
                }
                obj[nodeName].push(xmlToJson(item));
            }
        }
    }
    return obj;
}

var contents = [];

var xmlhttp = new XMLHttpRequest();
xmlhttp.open("GET","/sitemap.xml");
xmlhttp.onreadystatechange = function () {
    if (xmlhttp.readyState != 4) return;
    if (xmlhttp.status != 200 && xmlhttp.status != 304) { return; }
    var node = (new DOMParser).parseFromString(xmlhttp.responseText, 'text/xml');
    node = node.children[0];
    contents = xmlToJson(node).channel.item;

    if (contents.title !== undefined) {
        contents = [contents];
    }
}
xmlhttp.send();

function getMatchedPosts(param) {
    var result = contents.filter(function (post) {
        if (post.title.toLowerCase().indexOf(param) !== -1
            || post.description.toLowerCase().indexOf(param) !== -1) {
            return true;
        }
    });

    if (!result) {
        return;
    } else if (result.title !== undefined) {
        return [result];
    } else {
        return result;
    }
}

var searchInputEl = document.getElementById('search__input'),
    searchResultsOutline = document.getElementById('search__outline');

function resetComponent() {
    searchInputEl.value = '';
    document.getElementById('js-search').classList.remove('is-active')
    closeComponent();
}

function closeComponent() {
    lastSearchResultHash = '';
    searchResultsOutline.classList.add('is-hidden');
}

resetComponent();

(function () {
    document.getElementById('search__clear')
        .addEventListener('click', resetComponent);

    window.addEventListener('keyup', function onKeyPress(e) {
        if (e.which === 27) {
            resetComponent();
        }
    });

    var lastSearchResultHash = '';
    searchInputEl.addEventListener('input', function onInputChange() {
        var currentInputValue = (searchInputEl.value + '').toLowerCase();

        if (currentInputValue.length === 0) {
            resetComponent();
            return;
        }

        if (currentInputValue.length < 3) {
            closeComponent();
            return;
        }

        var matchingPosts = getMatchedPosts(currentInputValue);

        if (matchingPosts.length === 0) {
            closeComponent();
            return;
        }

        var currentResultHash = matchingPosts.reduce(function(hash, post) { return post.title + hash; }, '');
        if (currentResultHash !== lastSearchResultHash) {
            searchResultsOutline.classList.remove('is-hidden');
            document.getElementById('search__results').innerHTML = matchingPosts.map(function (post) {
                return '<li><a href="' + post.link + '">' + post.title + '<span class="search__result-date">' + new Date(post.pubDate).toUTCString().replace(/.*(\d{2})\s+(\w{3})\s+(\d{4}).*/,'$2 $1, $3') + '</span></a></li>';
            }).join('');
        }
        lastSearchResultHash = currentResultHash;
    });
})();
