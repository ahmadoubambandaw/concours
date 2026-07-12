export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = 'Authentification requise') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'Accès refusé') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Ressource introuvable') {
    return new ApiError(404, message);
  }
  static conflict(message: string) {
    return new ApiError(409, message);
  }
}
