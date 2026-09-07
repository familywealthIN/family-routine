// Builds a store-screenshot HTML page at exact pixel size, for any of the four
// device frames the listings need. Palette sampled from the live App Store
// listing: sky #bdddf2 - cloud #d6ecf9 - band #97daea - caption #20404f.
//
//   node store-assets/build/compose.js <shot> <caption> <w> <h> <out> [device]
const fs = require('fs');

// Read the capture's real pixel size out of the file header rather than assuming
// the viewport size. Chrome's fullPage capture widens to the content box when
// anything overflows horizontally, and guessing here silently stretches the
// screenshot inside the frame.
function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

// Raw captures are taken as JPEG: Chrome's PNG encode of a retina frame
// regularly blows past the CDP screenshot timeout, while JPEG returns
// immediately. Walk the segment markers to the first start-of-frame for size.
function jpegSize(file) {
  const b = fs.readFileSync(file);
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xFF) { i += 1; continue; }
    const marker = b[i + 1];
    // SOF0..SOF15, minus the four markers in that range that are not frames.
    if (marker >= 0xC0 && marker <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(marker)) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error(`no SOF marker in ${file}`);
}

function imageInfo(file) {
  const jpeg = /[.]jpe?g$/i.test(file);
  return {
    ...(jpeg ? jpegSize(file) : pngSize(file)),
    mime: jpeg ? 'image/jpeg' : 'image/png',
  };
}

const px = (n) => `${Math.round(n)}px`;

// Metallic sheen: alternating light/dark stops read as brushed metal once the
// gradient runs diagonally across the rail.
const DEEP_BLUE = 'linear-gradient(155deg,#3a6cbb 0%,#11367a 16%,#5b8ad0 30%,#0d2a60 46%,'
  + '#2f60ac 62%,#0f2f6c 78%,#4477c4 90%,#11367a 100%)';
const TITANIUM = 'linear-gradient(155deg,#c9cfd6 0%,#8e959e 16%,#e6eaef 30%,#79808a 46%,'
  + '#b9c0c8 62%,#7d848e 78%,#dfe4e9 90%,#959ca5 100%)';
// Pixel 10 Pro in Obsidian: polished aluminium, so the highlight stops are
// brighter and tighter than the Nexus 5's matte soft-touch plastic.
const OBSIDIAN = 'linear-gradient(155deg,#585c66 0%,#1b1d22 15%,#7d828d 28%,#131418 44%,'
  + '#464a53 60%,#16171b 76%,#6b7079 89%,#1e2025 100%)';
// The Nexus 5 was soft-touch matte plastic: near-black, almost no specular pop.
const SOFT_BLACK = 'linear-gradient(160deg,#2b2d31 0%,#17181b 22%,#212328 50%,#141517 78%,#26282c 100%)';

/** iOS status bar: time left, signal + battery right. */
function iosStatus(statusH, time) {
  const bar = (h) => `<span class="bar" style="height:${px(h)}"></span>`;
  return `<span>${time}</span>
        <span class="icons">
          ${bar(statusH * 0.104)}${bar(statusH * 0.157)}${bar(statusH * 0.209)}${bar(statusH * 0.261)}
          <span class="bat"></span>
        </span>`;
}

/** Android status bar: same order, lighter clock weight, one fewer signal bar. */
function androidStatus(statusH, time) {
  const bar = (h) => `<span class="bar" style="height:${px(h)}"></span>`;
  return `<span class="and-clock">${time}</span>
        <span class="icons">
          ${bar(statusH * 0.120)}${bar(statusH * 0.180)}${bar(statusH * 0.240)}
          <span class="bat"></span>
        </span>`;
}

const DEVICES = {
  // ---- iPhone 17 Pro, Deep Blue -------------------------------------------
  iphone17: {
    frameWFrac: 0.630,
    topFrac: 0.205,
    railFrac: 0.013,
    bezelFrac: 0.017,
    screenRFrac: 0.125,
    rail: DEEP_BLUE,
    statusHFrac: 0.134,
    status: iosStatus,
    // Dynamic Island, sized off the screen width like the real device.
    overlay: (w) => `<div class="island" style="width:${px(w * 0.30)};height:${px(w * 0.085)};`
      + `top:${px(w * 0.028)};border-radius:${px(w * 0.085)}"></div>`,
    buttons: [
      ['l', 0.150, 0.038], ['l', 0.222, 0.070], ['l', 0.308, 0.070],
      ['r', 0.232, 0.105], ['r', 0.372, 0.058],
    ],
  },

  // ---- Nexus 5 -------------------------------------------------------------
  // Proportions taken from the hardware: a 137.8 x 69.2 mm body around a
  // 62.1 x 110.4 mm screen, so the side bezel is ~5% of body width and the
  // top/bottom ~10% of body height. That tall forehead and chin, the earpiece
  // slit and the notification LED are what make the frame recognisable.
  nexus5: {
    frameWFrac: 0.600,
    topFrac: 0.205,
    railFrac: 0.050,
    bezelFrac: 0.0,
    screenRFrac: 0.010,
    frameRFrac: 0.075,
    rail: SOFT_BLACK,
    browFrac: 0.120,      // body above the screen, as a fraction of frameW
    chinFrac: 0.120,      // and below it
    statusHFrac: 0.067,   // 24dp on a 360dp-wide screen
    statusFontFrac: 0.42,
    status: androidStatus,
    navHFrac: 0.133,      // 48dp on-screen navigation bar
    brow: (w, brow) => `<span class="earpiece" style="width:${px(w * 0.20)};height:${px(w * 0.014)};`
      + `top:${px(brow * 0.46)};border-radius:${px(w * 0.014)}"></span>`
      + `<span class="frontcam" style="width:${px(w * 0.022)};height:${px(w * 0.022)};`
      + `top:${px(brow * 0.40)};left:${px(w * 0.30)}"></span>`,
    chin: (w, chin) => `<span class="led" style="width:${px(w * 0.016)};height:${px(w * 0.016)};`
      + `bottom:${px(chin * 0.38)}"></span>`,
    buttons: [['r', 0.170, 0.052], ['r', 0.250, 0.090]],
  },

  // ---- Pixel 10 Pro, Obsidian ---------------------------------------------
  // A 6.3" 20:9 panel (1280x2856) behind uniform thin bezels, with a centred
  // punch-hole camera rather than a notch and a gesture pill rather than the
  // three-button bar. Power sits ABOVE the volume rocker, both on the right.
  pixel10pro: {
    frameWFrac: 0.580,
    topFrac: 0.205,
    railFrac: 0.014,
    bezelFrac: 0.021,
    screenRFrac: 0.085,
    rail: OBSIDIAN,
    statusHFrac: 0.058,   // 24dp on a 412dp-wide screen
    statusFontFrac: 0.42,
    status: androidStatus,
    navHFrac: 0.058,      // gesture inset
    gestureNav: true,
    overlay: (w) => `<div class="punch" style="width:${px(w * 0.052)};height:${px(w * 0.052)};`
      + `top:${px(w * 0.019)}"></div>`,
    buttons: [['r', 0.180, 0.058], ['r', 0.265, 0.105]],
  },

  // ---- iPad Pro 13" --------------------------------------------------------
  // Uniform hairline bezel all round; on the M4 the camera sits on the long
  // edge, which in portrait puts it centred on the right.
  ipad13: {
    frameWFrac: 0.700,
    topFrac: 0.215,
    railFrac: 0.008,
    bezelFrac: 0.022,
    screenRFrac: 0.030,
    rail: TITANIUM,
    statusHFrac: 0.040,
    statusFontFrac: 0.55,
    status: iosStatus,
    sideCam: true,
    buttons: [['r', 0.055, 0.030]],
  },

  // ---- macOS window --------------------------------------------------------
  // No hardware body: the Mac App Store expects the app window itself, so this
  // draws title-bar chrome with traffic lights instead of a device frame.
  mac: {
    window: true,
    frameWFrac: 0.700,
    topFrac: 0.245,
    railFrac: 0.0,
    bezelFrac: 0.0,
    screenRFrac: 0.016,
    statusHFrac: 0.038,   // title bar, as a fraction of window width
  },
};

function build({
  shot, caption, width, height, out, device = 'iphone17', statusTime = '9:41',
}) {
  const d = DEVICES[device];
  if (!d) throw new Error(`unknown device: ${device} (have ${Object.keys(DEVICES).join(', ')})`);

  const b64 = fs.readFileSync(shot).toString('base64');
  const src = imageInfo(shot);
  const landscape = width > height;

  const frameW = Math.round(width * d.frameWFrac);
  const rail = Math.round(frameW * d.railFrac);
  const bezel = Math.round(frameW * d.bezelFrac);
  const screenW = frameW - (rail + bezel) * 2;

  // The status bar sits ABOVE the app image so it never covers the app's own
  // header, and the image keeps its exact capture aspect ratio (no cropping).
  const statusH = Math.round(screenW * d.statusHFrac);
  const navH = d.navHFrac ? Math.round(screenW * d.navHFrac) : 0;
  const imageH = Math.round((screenW / src.w) * src.h);
  const screenH = statusH + imageH + navH;

  const brow = d.browFrac ? Math.round(frameW * d.browFrac) : 0;
  const chin = d.chinFrac ? Math.round(frameW * d.chinFrac) : 0;
  const frameH = screenH + (rail + bezel) * 2 + brow + chin;

  const screenR = Math.round(screenW * d.screenRFrac);
  const bezelR = screenR + bezel;
  const frameR = d.frameRFrac ? Math.round(frameW * d.frameRFrac) : bezelR + rail;

  const frameTop = Math.min(
    Math.round(height * d.topFrac),
    height - frameH - Math.round(height * 0.02),
  );

  const btnW = Math.max(3, Math.round(rail * 1.15));
  const buttons = (d.buttons || []).map(([side, topFrac, hFrac]) => `<span class="btn ${side}" `
    + `style="top:${px(frameH * topFrac)};height:${px(frameH * hFrac)}"></span>`).join('');

  // A landscape canvas gets a smaller caption: the same fraction of width would
  // dwarf the window, and there is far more horizontal room for the line.
  const captionSize = landscape ? width * 0.040 : width * 0.072;
  const captionTop = landscape ? height * 0.062 : height * 0.050;

  let navBar = '';
  if (navH) {
    navBar = d.gestureNav
      ? '<div class="navbar"><span class="nav-pill"></span></div>'
      : '<div class="navbar"><span class="nav-back"></span>'
        + '<span class="nav-home"></span><span class="nav-recent"></span></div>';
  }

  const chrome = d.window
    ? '<div class="titlebar"><span class="light red"></span><span class="light amber"></span>'
      + '<span class="light green"></span></div>'
    : `<div class="statusbar">${d.status(statusH, statusTime)}</div>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${px(width)};height:${px(height)};overflow:hidden}
  body{font-family:"Poppins","Segoe UI",system-ui,-apple-system,sans-serif;background:#bdddf2;position:relative}
  .band{position:absolute;left:0;right:0;bottom:0;height:${px(height * 0.17)};background:#97daea;
        border-radius:${px(width)} ${px(width)} 0 0 / ${px(height * 0.055)} ${px(height * 0.055)} 0 0}
  .cloud{position:absolute;background:#d6ecf9;border-radius:50%;opacity:.85}
  .c1{width:${px(width * 0.62)};height:${px(width * 0.20)};right:${px(-width * 0.14)};top:${px(height * 0.185)}}
  .c2{width:${px(width * 0.48)};height:${px(width * 0.15)};left:${px(-width * 0.16)};top:${px(height * 0.345)}}
  .c3{width:${px(width * 0.40)};height:${px(width * 0.12)};right:${px(width * 0.05)};bottom:${px(height * 0.135)};opacity:.6}
  .caption{position:absolute;top:${px(captionTop)};left:0;right:0;padding:0 ${px(width * 0.05)};
    text-align:center;color:#20404f;font-weight:700;letter-spacing:-0.5px;
    font-size:${px(captionSize)};line-height:1.20}

  .frame{position:absolute;left:50%;transform:translateX(-50%);top:${px(frameTop)};
    width:${px(frameW)};height:${px(frameH)};border-radius:${px(frameR)};
    background:${d.rail || '#ffffff'};
    padding:${px(rail + brow)} ${px(rail)} ${px(rail + chin)};
    box-shadow:0 ${px(width * 0.018)} ${px(width * 0.048)} rgba(11,32,74,.26)}
  .bezel{width:100%;height:100%;background:${d.window ? 'transparent' : '#07080c'};
    border-radius:${px(bezelR)};padding:${px(bezel)}}
  .screen{position:relative;width:${px(screenW)};height:${px(screenH)};background:#fff;
    border-radius:${px(screenR)};overflow:hidden;display:flex;flex-direction:column}
  .screen img{display:block;width:${px(screenW)};height:${px(imageH)}}

  .statusbar{flex:0 0 ${px(statusH)};display:flex;align-items:center;justify-content:space-between;
    padding:0 ${px(screenW * 0.055)};font-size:${px(statusH * (d.statusFontFrac || 0.30))};
    font-weight:600;color:#111;background:#fff;position:relative;z-index:2}
  .and-clock{font-weight:500}
  .icons{display:flex;gap:${px(statusH * 0.09)};align-items:flex-end}
  .bar{width:${px(Math.max(2, statusH * 0.09))};background:#111;border-radius:1px}
  .bat{width:${px(statusH * 0.463)};height:${px(statusH * 0.239)};
       border:${px(Math.max(2, statusH * 0.03))} solid #111;
       border-radius:${px(statusH * 0.082)};margin-left:${px(statusH * 0.164)};position:relative}
  .bat:after{content:"";position:absolute;inset:${px(Math.max(2, statusH * 0.03))};right:32%;
       background:#111;border-radius:1px}

  .island{position:absolute;left:50%;transform:translateX(-50%);background:#07080c;z-index:3}
  .punch{position:absolute;left:50%;transform:translateX(-50%);background:#07080c;
    border-radius:50%;z-index:3}
  .earpiece{position:absolute;left:50%;transform:translateX(-50%);background:#0c0d0f;
    box-shadow:inset 0 1px 2px rgba(0,0,0,.9)}
  .frontcam{position:absolute;background:#0a1a24;border-radius:50%;
    box-shadow:inset 0 0 2px rgba(120,180,220,.55)}
  .led{position:absolute;left:50%;transform:translateX(-50%);background:#0d0e10;border-radius:50%}
  .sidecam{position:absolute;top:50%;transform:translateY(-50%);right:${px(bezel * 0.34)};
    width:${px(bezel * 0.30)};height:${px(bezel * 0.30)};background:#1b2b36;border-radius:50%}

  /* Android on-screen navigation: back, home, recents. */
  .navbar{flex:0 0 ${px(navH)};display:flex;align-items:center;justify-content:center;
    gap:${px(screenW * 0.16)};background:#fff;border-top:1px solid #ececec}
  .nav-back{width:0;height:0;border-top:${px(navH * 0.14)} solid transparent;
    border-bottom:${px(navH * 0.14)} solid transparent;border-right:${px(navH * 0.20)} solid #5f6368}
  .nav-home{width:${px(navH * 0.26)};height:${px(navH * 0.26)};border-radius:50%;
    border:${px(Math.max(2, navH * 0.05))} solid #5f6368}
  .nav-recent{width:${px(navH * 0.24)};height:${px(navH * 0.24)};
    border:${px(Math.max(2, navH * 0.05))} solid #5f6368;border-radius:${px(navH * 0.03)}}
  .nav-pill{width:${px(screenW * 0.30)};height:${px(Math.max(3, navH * 0.13))};
    background:#1f1f1f;border-radius:${px(navH)}}

  /* macOS window chrome. */
  .titlebar{flex:0 0 ${px(statusH)};display:flex;align-items:center;gap:${px(screenW * 0.009)};
    padding-left:${px(screenW * 0.016)};background:#eceef1;border-bottom:1px solid #d8dade}
  .light{width:${px(screenW * 0.011)};height:${px(screenW * 0.011)};border-radius:50%}
  .red{background:#ff5f57}.amber{background:#febc2e}.green{background:#28c840}

  .btn{position:absolute;width:${px(btnW)};border-radius:${px(btnW * 0.45)};
    background:${d.rail || '#999'}}
  .btn.l{left:${px(-btnW * 0.55)}}
  .btn.r{right:${px(-btnW * 0.55)}}
  </style></head><body>
    <div class="band"></div>
    <div class="cloud c1"></div><div class="cloud c2"></div><div class="cloud c3"></div>
    <div class="caption">${caption}</div>
    <div class="frame">
      ${buttons}
      ${d.brow ? d.brow(frameW, brow) : ''}
      ${d.chin ? d.chin(frameW, chin) : ''}
      ${d.sideCam ? '<span class="sidecam"></span>' : ''}
      <div class="bezel"><div class="screen">
        ${chrome}
        ${d.overlay ? d.overlay(screenW) : ''}
        <img src="data:${src.mime};base64,${b64}">
        ${navBar}
      </div></div>
    </div>
  </body></html>`;

  fs.writeFileSync(out, html);
  return {
    out,
    device,
    src,
    frameW,
    frameH,
    screenW,
    screenH,
    statusH,
    navH,
    imageH,
    frameTop,
    fitsCanvas: frameTop + frameH <= height,
  };
}

module.exports = {
  build, pngSize, jpegSize, imageInfo, DEVICES,
};

if (require.main === module) {
  const [, , shot, caption, w, h, out, device] = process.argv;
  console.log(build({
    shot, caption, width: +w, height: +h, out, device,
  }));
}
