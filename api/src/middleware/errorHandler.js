export function errorHandler(err, _req, res, _next) {
  res.status(err.status || (err.name === 'ValidationError' ? 400 : 500)).json({ message: err.message });
}
