var miniSidebar = true;
var modalOpen = false;

function ToggleSidebar() {
    var navbarElement = document.getElementById('navBar');
    if(miniSidebar) {
        navbarElement.style.width="250px";
        this.miniSidebar = false;
    } else {
        navbarElement.style.width="80px";
        this.miniSidebar = true;
    }
}

function ToggleModal() {
    //modal info
    var modalElement = document.getElementById('fp');
    var modalDomRect = modalElement.getBoundingClientRect(); 
    var currWidth = modalDomRect.width;
    var currMargin = parseFloat(window.getComputedStyle(modalElement).marginTop) || parseFloat(modalElement.CurrentStyle.marginTop);
    if(modalOpen) {
        modalElement.style.position = '';
        modalElement.style.maxWidth = '';
        modalElement.style.height = '';
        modalElement.style.top = '';
        modalElement.style.transform = '';
        modalElement.style.backgroundColor = '';
        modalElement.scrollTo(0, 0);
        modalElement.style.overflowY = '';
        enableScroll();
        this.modalOpen = false;
    } else {
        var offsetY = (modalDomRect.y-currMargin);
        modalElement.style.position = 'fixed';
        modalElement.style.maxWidth = currWidth+'px';
        modalElement.style.height = '97vh';
        modalElement.style.top = offsetY+'px';
        modalElement.style.transform = 'translateY('+ (-offsetY) +'px)';
        modalElement.style.backgroundColor = 'rgb(0 0 0 / 40%)';
        modalElement.style.overflowY = 'scroll';
        disableScroll();
        this.modalOpen = true;
    }
}

function disableScroll() {
    // Get the current page scroll position
    scrollTop = window.pageYOffset || document.body.scrollTop;
    scrollLeft = window.pageXOffset || document.body.scrollLeft,
  
        // if any scroll is attempted, set this to the previous value
        window.onscroll = function() {
            window.scrollTo(scrollLeft, scrollTop);
        };
}
  
function enableScroll() {
    window.onscroll = function() {};
}