export default function redirectOnError(router, statusCode) {
  if (window && window.dispatchEvent && !window.appSignedOut && Number(statusCode) === 401) {
    window.appSignedOut = true;
    router.push('/').catch(() => {});
    setTimeout(() => {
      window.dispatchEvent(new Event('sign-out'));
    }, 3000);
  }
}
