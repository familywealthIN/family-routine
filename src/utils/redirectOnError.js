export default function redirectOnError(router, error) {
  if (error.message.indexOf('401') > -1) {
    window.dispatchEvent(new Event('sign-out'));
    router.push('/');
  }
}
