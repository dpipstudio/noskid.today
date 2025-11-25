//Whatisaskid.js | Helper popup

const whatIsASkid = document.getElementById("whatIsASkid");

const popup = document.createElement("div");
popup.className = "whatIsASkid";
popup.innerHTML = `
<strong>A "script kiddie" is someone who:</strong>
<ul>
<li>Does stuff and runs tools they don't understand</li>
<li>Codes fully with ChatGPT and calls themselves "Full Stack Devs"</li>
<li>Copies GitHub commands like they're magic spells to erase the internet</li>
<li>Brags about "hacking" after pressing a single button</li>
<li>Thinks installing Arch Linux or using Mullvad makes them untraceable</li>
<li>Repeats words (Palantir, Intel ME, OSINT, zero-days…) without knowing the meaning</li>
<li>Treats cybersecurity like a personality trait</li>
<li>Believes a VPN = OPSEC</li>
<li>Acts like a threat actor with zero threat modeling</li>
<li>Confuses anonymity with invisibility</li>
</ul>

<p>List taken from <a href="https://blog.awdevsoftware.org/to-the-script-kiddies-behind-their-vpn-youre-not-invisible/">awdevsoftware.org</a></p>`;
document.body.appendChild(popup);

let isShowing = false;
let hideTimeout;

function showPopup() {
    clearTimeout(hideTimeout);
    if (!isShowing) {
        isShowing = true;
        popup.classList.remove("hide");
        void popup.offsetWidth;
        popup.classList.add("show");
    }
}

function hidePopup() {
    hideTimeout = setTimeout(() => {
        isShowing = false;
        popup.classList.remove("show");
        popup.classList.add("hide");

        setTimeout(() => {
            popup.classList.remove("hide");
        }, 300);
    }, 100);
}

whatIsASkid.addEventListener("mouseenter", showPopup);
whatIsASkid.addEventListener("mouseleave", hidePopup);

popup.addEventListener("mouseenter", showPopup);
popup.addEventListener("mouseleave", hidePopup);

whatIsASkid.addEventListener("mousemove", (e) => {
    const padding = 10;
    let x = e.clientX + 15;
    let y = e.clientY + 15;

    if (x + popup.offsetWidth + padding > window.innerWidth) {
        x = e.clientX - popup.offsetWidth - 15;
    }

    if (y + popup.offsetHeight + padding > window.innerHeight) {
        y = e.clientY - popup.offsetHeight - 15;
    }

    popup.style.left = x + "px";
    popup.style.top = y + "px";
});