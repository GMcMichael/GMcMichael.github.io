let currentTab = 0;
let numTabs = 3;

let defaultScrollPos = 100;
let scrollingDir = 0;
let scrolling = false;
let scrollingTime = 500;
let scrollTarget = null;

let postContainer;
let postNum;

function changeTabs(dir) {
    document.getElementById('rect' + currentTab).classList.remove('activeRect');

    currentTab += dir;
    currentTab = Math.min(numTabs - 1, Math.max(0, currentTab));

    document.documentElement.style.setProperty('--tabOffset', -currentTab);
    document.getElementById('rect' + currentTab).classList.add('activeRect');

    if (currentTab == 0) document.getElementById('scrollText').style.opacity = 1;
    else document.getElementById('scrollText').style.opacity = 0;
}

function scrollTop() {
    changeTabs(-currentTab);
}

setInterval(() => {
    if (scrolling || scrollingDir == 0) return;

    scrolling = true;
    //try to finish scrolling every 500 miliseconds until done
    var stopFunc = setInterval(() => {
        if (scrollingDir != 0) return;
        scrolling = false;

        //reset scrolling dir
        scrollingDir = 0;
        clearInterval(stopFunc);
    }, scrollingTime);

    //scroll
    changeTabs(scrollingDir);
}, 100);

function handleScrolling(e) {
    var diff = defaultScrollPos - scrollTarget.scrollTop;
    //reset scroll
    scrollTarget.scrollTop = defaultScrollPos;
    if (Math.abs(diff) < 10) {
        scrollingDir = 0;
        return;
    }
    scrollingDir = -Math.sign(diff);

    return false;
}

function handleWheel(e) {
    if (!scrolling) return false;
    e.preventDefault();
    e.stopPropagation();
    return false;
}

function loadJson() {
    let numOfPosts = 0;
    let numText = "";
    jsonData.forEach((data) => {
        //construct html and add post
        var post = document.createElement('div');
        post.classList.add('post');

        var imgCtr = document.createElement('div');
        imgCtr.classList.add('postImgContainer');
        imgCtr.style.setProperty('--backImg', "url('" + data.picAddr + "')");

        var img = document.createElement('img');
        img.src = data.picAddr;
        imgCtr.appendChild(img);

        var cntCtr = document.createElement('div');
        cntCtr.classList.add('postContentContainer');

        var title = document.createElement('h2');
        title.innerText = data.title;
        cntCtr.appendChild(title);

        var desc = document.createElement('p');
        desc.innerText = data.desc;
        cntCtr.appendChild(desc);

        var moreBtn = document.createElement('button');
        moreBtn.innerText = "Read More";
        cntCtr.appendChild(moreBtn);

        post.append(imgCtr);
        post.appendChild(cntCtr);

        postContainer.appendChild(post);

        numOfPosts++;
        var postNumDiv = document.createElement('div');
        postNumDiv.classList.add('postNumItem');
        postNumDiv.innerText = numOfPosts.toString();
        postNum.appendChild(postNumDiv);
    });
    document.documentElement.style.setProperty('--postNums', numOfPosts);
}

function init() {
    scrollTarget = document.getElementById('tabContainer');
    scrollTarget.scrollTop = defaultScrollPos;
    scrollTarget.addEventListener('scroll', handleScrolling, false);
    scrollTarget.addEventListener('wheel', handleWheel, { passive: false });
    scrollTarget.addEventListener('mousewheel', handleWheel, { passive: false });

    document.getElementById('logo').addEventListener('click', scrollTop, false);

    postContainer = document.getElementById('postContainer');
    postNum = document.getElementById('postNums');
    loadJson();
}

window.onload = init;