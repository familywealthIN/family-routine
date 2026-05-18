class ApiError extends Error {
  constructor(networkStatus = 401, ...params) {
    super(...params);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }

    this.name = 'ApiError';
    this.networkStatus = networkStatus;
  }

  statusCode() {
    console.log('this.networkStatus', this.networkStatus);
    return this.networkStatus;
  }
}

module.exports = ApiError;
