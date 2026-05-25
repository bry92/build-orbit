/**
 * Express global error handler — last middleware in the chain.
 */

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: 'Not found',
    requestId: req.id,
  });
}

function errorHandler(err, req, res, _next) {
  if (res.headersSent) {
    return;
  }

  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  console.error('[Error]', {
    requestId: req.id,
    status,
    message: err.message,
    stack: isProduction ? undefined : err.stack,
  });

  res.status(status).json({
    success: false,
    message: status >= 500 && isProduction
      ? 'Internal server error'
      : (err.message || 'Request failed'),
    requestId: req.id,
  });
}

module.exports = { notFoundHandler, errorHandler };
