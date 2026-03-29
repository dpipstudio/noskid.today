// Noskid.js | Updates the main header

const { Typed } = window;

const typed2 = new Typed('#strike', {
  strings: [
    '"hacking u rn"',
    '"nice ip lol"',
    '"nmap go brrr"',
    '"ddos ez"',
    '"ratted fr"',
    '"pwned lmao"',
    '"vpn cant save u btw"',
    '"reverse shell sent"',
    '"ur router default pass"',
    '"bruteforce running"',
    '"revese shell\'d u btw"',
    '"botting u rn"',
    '"mitm active lol"',
    '"ur creds leaked"',
    '"ur on doxbin lmao 💀"',
    '"dox incoming"',
    '"found ur full name"',
    '"we know ur awake"',
    '"ip grabber clicked"',
    '"ur metadata leaked xd"',
    '"ur isp knows"',
    '"ur location leaked 😈"',
    '"found ur address"',
    '"ur ports open"',
    '"got ur ip lmao"',
    '"keylogger active"',
    '"ur traffic mine now"',
    '"ur cookies grabbed btw"',
    '"ur ssl stripped"',
    '"ur waf useless"',
    '"os fingerprinted"',
    '"ur gateway"',
    '"defender disabled"',
    '"calling ur isp lol"',
    '"Cloudflare bypass :D"',
  ],

  typeSpeed: 80,
  backSpeed: 60,
  smartBackspace: false,
  loop: true,
  shuffle: false,
  backDelay: 2000,
  startDelay: 3000,
});

log("Typing cursor initiated!", 'success');

if (typed2.cursor != null) {
  typed2.cursor.classList.add('typed-cursor--blink');
}