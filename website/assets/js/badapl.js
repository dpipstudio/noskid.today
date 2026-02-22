//Badapl.js | Logs bad apple in the dev console when devtools opens

function toggleGoodApple() {
  const currentSetting = localStorage.getItem('goodApple') === 'true';
  const newSetting = !currentSetting;

  if (newSetting) addAchievement('Good Apple Mode');

  localStorage.setItem('goodApple', newSetting.toString());

  log(`Good Apple mode ${newSetting ? 'enabled' : 'disabled'}. Bad Apple will ${newSetting ? 'NOT' : ''} play when devtools open.`, 'success');
  return newSetting;
}

function isGoodAppleEnabled() {
  return localStorage.getItem('goodApple') === 'true';
}

async function playBadApl() {
  if (isGoodAppleEnabled()) {
    log('Bad Apple playback skipped - Good Apple mode is enabled', 'warning');
    log('write \'i hate badapple\' to enable bad apple.', 'warning');
    return null;
  }

  try {

    startAchievement('Bad Apple Fan');

    const response = await fetch('assets/vids/ba.tmov');
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const content = await response.text();
    const jsonEndIndex = content.indexOf('\n#=');
    const jsonString = content.substring(0, jsonEndIndex);
    const metadata = JSON.parse(jsonString);
    const framesContent = content.substring(jsonEndIndex + 1);

    const frames = framesContent.split(metadata.ascii.frameDelimiter || '!$$!');
    const validFrames = frames
      .filter(frame => frame.length > 0)
      .map(frame => frame.replace(/^\n+|\n+$/g, ''));

    log(`Loaded BadAPL ascii: ${validFrames.length} frames`, 'success');
    log(`Duration: ${metadata.playback.totalDurationMs / 1000}s`, 'success');
    log(`FPS: ${metadata.ascii.fps}`, 'success');

    console.clear();
    console.log('%c⚠️ EPILEPSY WARNING ⚠️', 'color: red; font-size: 24px; font-weight: bold;');
    console.log('%cThis animation contains rapidly flashing images', 'color: orange; font-size: 16px;');
    console.log('%cIf you have epilepsy or are sensitive to flashing lights,', 'color: orange; font-size: 16px;');
    console.log('%cplease close this console now.', 'color: orange; font-size: 16px;');
    console.log('%cAnimation will start in 5 seconds...', 'color: yellow; font-size: 14px;');

    await new Promise(resolve => setTimeout(resolve, 5000));

    addAchievement('Bad Apple Fan');

    const frameDuration = metadata.playback.frameDuration || (1000 / metadata.ascii.fps);
    const audio = new Audio('assets/audio/ba.mp3');

    await new Promise((resolve, reject) => {
      audio.addEventListener('canplaythrough', resolve, { once: true });
      audio.addEventListener('error', () => reject('Audio failed to load'), { once: true });
    });

    let currentFrame = 0;
    let startTime = null;
    let playbackInterval = null;

    function displayFrame() {
      if (isGoodAppleEnabled()) {
        log('Good Apple mode enabled mid-playback', 'warning');
        if (playbackInterval) clearInterval(playbackInterval);
        audio.pause();
        audio.currentTime = 0;
        return;
      }

      if (currentFrame >= validFrames.length) {
        log('BadApl console playback finished', 'success');
        if (playbackInterval) clearInterval(playbackInterval);
        return;
      }

      console.clear();
      console.log(`Frame ${currentFrame + 1}/${validFrames.length}`);
      console.log(`Time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
      console.log('Github -> github.com/dpipstudio/noskid.today');
      console.log('Contact -> douxx@is.notaskid.ong');
      console.log('');
      console.log(validFrames[currentFrame]);
      currentFrame++;
    }

    await new Promise((resolve, reject) => {
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setTimeout(resolve, 100);
          })
          .catch(err => {
            log('Audio playback failed: ' + err, 'error');
            resolve();
          });
      } else {
        setTimeout(resolve, 200);
      }
    });

    startTime = Date.now();
    displayFrame();

    playbackInterval = setInterval(() => {
      displayFrame();
    }, frameDuration);

    return {
      stop: () => {
        if (playbackInterval) clearInterval(playbackInterval);
        audio.pause();
        audio.currentTime = 0;
        log('Console BadApl Stopped', 'success');
      },
      metadata: metadata,
      totalFrames: validFrames.length
    };

  } catch (error) {
    log('Error playing badapl ascii: ' + error, 'error');
    return null;
  }
}

function isMobileDevice() { //thanks to claude ngl
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
  const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 1024;

  const hasMobileFeatures = typeof window.orientation !== 'undefined' ||
    /Mobi|Android/i.test(navigator.userAgent);

  return isMobileUA || (isTouchDevice && isSmallScreen) || hasMobileFeatures;
}

if (!isMobileDevice()) {
  let initialOuterHeight = window.outerHeight;
  let initialInnerHeight = window.innerHeight;
  let lastTriggered = 0;

  function detectDevtools() {
    const currentOuterHeight = window.outerHeight;
    const currentInnerHeight = window.innerHeight;

    const outerDiff = Math.abs(currentOuterHeight - initialOuterHeight);
    const innerDiff = Math.abs(currentInnerHeight - initialInnerHeight);

    const significantChange = innerDiff > 100 || (outerDiff > 50 && innerDiff > outerDiff);

    const now = Date.now();
    const timeSinceLastTrigger = now - lastTriggered;

    if (significantChange && timeSinceLastTrigger > 2000) {
      log('Devtools opening detected!', 'success');
      lastTriggered = now;

      playBadApl();
    }
  }

  function devtoolsDetectionLoop() {
    let devtools = {
      open: false,
      orientation: null
    };

    setInterval(() => {
      const heightThreshold = window.outerHeight - window.innerHeight > 200;
      const widthThreshold = window.outerWidth - window.innerWidth > 200;

      if (!(heightThreshold && widthThreshold) &&
        ((window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) || heightThreshold || widthThreshold)) {

        if (!devtools.open) {
          devtools.open = true;
          log('Devtools opened detected via polling!', 'success');
          playBadApl();
        }
      } else {
        devtools.open = false;
      }
    }, 500);
  }

  window.addEventListener('resize', () => {
    setTimeout(detectDevtools, 100);
  });


  devtoolsDetectionLoop();

  log('BadApple devtools detection enabled (Desktop detected)', 'success'); //were always detecting it, even if good apple is enabled, so we dont have to reload on toggle

  if (!isGoodAppleEnabled()) log('write \'i hate badapple\' to disable bad apple.', 'warning');
}