// One entry per store listing size. `capture` is the Chrome device-emulation
// string used to grab the raw app screens (resize_page cannot go below ~500px
// on Windows, so emulation is the only way to hit a real phone viewport), and
// `canvas` is the finished slide size the store demands.
//
// Android capture height leaves room for the synthetic status and gesture bars
// the compositor draws, so the app image is not squashed: a Pixel 10 Pro is
// 412x916dp, minus a 24dp status bar and a 24dp gesture inset, leaves 868dp of
// app - which is also what gives the frame its 20:9 screen.
module.exports = {
  iphone: {
    device: 'iphone17',
    capture: '430x932x3,mobile,touch',
    canvas: [1290, 2796],
    label: 'App Store - iPhone 6.9"',
  },
  android: {
    device: 'pixel10pro',
    capture: '412x868x3,mobile,touch',
    canvas: [1080, 1920],
    label: 'Play Store - phone',
  },
  // Landscape, not portrait. The slides are now sourced from packages/design
  // (see capture-design.js), and the design's only tablet layout is iPad mini
  // LANDSCAPE - there is no portrait tablet mock to capture. The App Store
  // accepts a 13" set in either orientation (2752x2064 / 2732x2048 landscape,
  // 2064x2752 / 2048x2732 portrait) as long as every slide in the set agrees,
  // which they do.
  ipad: {
    device: 'ipad13',
    capture: '1133x744x2,touch',
    canvas: [2732, 2048],
    // A landscape canvas has room for one line, so captions are flattened.
    singleLineCaption: true,
    label: 'App Store - iPad 13" (landscape)',
  },
  mac: {
    device: 'mac',
    capture: '1280x800x2',
    canvas: [2880, 1800],
    // A landscape canvas has room for one line, so captions are flattened.
    singleLineCaption: true,
    label: 'Mac App Store - 2880x1800',
  },
  // Play's tablet slots. The iPad set used to double as tenInchScreenshots,
  // which put an Apple device on Google Play; this one draws a generic Android
  // tablet (Pixel Tablet proportions: 16:10 panel, uniform dark bezel, camera on
  // the long top edge) around the same landscape tablet layout, re-captured at
  // the Pixel Tablet's 1280x800dp minus the status bar and gesture inset.
  'android-tablet': {
    device: 'androidTablet',
    capture: '1280x752x2,touch',
    canvas: [2560, 1440],
    singleLineCaption: true,
    label: 'Play Store - tablet (7" + 10")',
  },
  // Play Console's Chromebook slot. The Play API has no image type for it, so
  // `supply` cannot upload these; they are added by hand (see README).
  googlebook: {
    device: 'googlebook',
    capture: '1440x820x2',
    canvas: [2560, 1440],
    singleLineCaption: true,
    label: 'Play Store - Chromebook (manual upload)',
  },
};
