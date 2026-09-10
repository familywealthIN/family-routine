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
  ipad: {
    device: 'ipad13',
    capture: '1024x1366x2,touch',
    canvas: [2048, 2732],
    label: 'App Store - iPad 13"',
  },
  mac: {
    device: 'mac',
    capture: '1280x800x2',
    canvas: [2880, 1800],
    // A landscape canvas has room for one line, so captions are flattened.
    singleLineCaption: true,
    label: 'Mac App Store - 2880x1800',
  },
};
