module.exports = function sortTimes(array) {
  return array.sort((a, b) => {
    const [aHours, aMinutes] = a.time.split(':');
    const [bHours, bMinutes] = b.time.split(':');

    if (parseInt(aHours, 10) - parseInt(bHours, 10) === 0) {
      return parseInt(aMinutes, 10) - parseInt(bMinutes, 10);
    }
    return parseInt(aHours, 10) - parseInt(bHours, 10);
  });
};
