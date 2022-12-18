export default function redirectOnError(router, error) {
  if (window && window.dispatchEvent && !window.appSignedOut && error && error.message.indexOf('401') > -1) {
    window.appSignedOut = true;
    router.push('/').catch(() => {});
    setTimeout(() => {
      window.dispatchEvent(new Event('sign-out'));
    }, 3000);
  }
}
