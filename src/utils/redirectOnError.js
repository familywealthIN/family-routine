export default function redirectOnError(router, error) {
  if (error.message.indexOf('401') > -1) {
    router.push('/');
  }
}
