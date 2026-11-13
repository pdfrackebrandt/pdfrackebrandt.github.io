/* Runs in the head before the page paints, so a reader's chosen theme shows from the first frame. site.js holds the switch. */
(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();
