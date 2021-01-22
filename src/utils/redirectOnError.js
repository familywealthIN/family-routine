export default function redirectOnError(router, error) {
  if (!window.appSignedOut && error && error.message.indexOf('401') > -1) {
    window.appSignedOut = true;
    router.push('/');
    setTimeout(() => {
      window.dispatchEvent(new Event('sign-out'));
    }, 3000);
  }
}
