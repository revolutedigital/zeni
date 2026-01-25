/**
 * API Error - Zeni
 *
 * Classe centralizada para erros da API.
 * Permite tratamento consistente de erros em toda a aplicação.
 */

export class ApiError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Erro de requisição inválida (400)
   */
  static badRequest(message, details = null) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  /**
   * Erro de validação (400)
   */
  static validation(message, errors = null) {
    return new ApiError(400, 'VALIDATION_ERROR', message, errors);
  }

  /**
   * Erro de autenticação (401)
   */
  static unauthorized(message = 'Não autorizado') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  /**
   * Token inválido ou expirado (401)
   */
  static invalidToken(message = 'Token inválido ou expirado') {
    return new ApiError(401, 'INVALID_TOKEN', message);
  }

  /**
   * Erro de permissão (403)
   */
  static forbidden(message = 'Acesso negado') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  /**
   * Recurso não encontrado (404)
   */
  static notFound(resource = 'Recurso') {
    return new ApiError(404, 'NOT_FOUND', `${resource} não encontrado`);
  }

  /**
   * Conflito (409) - Ex: email já cadastrado
   */
  static conflict(message, details = null) {
    return new ApiError(409, 'CONFLICT', message, details);
  }

  /**
   * Rate limit excedido (429)
   */
  static tooManyRequests(message = 'Limite de requisições atingido. Aguarde um momento.') {
    return new ApiError(429, 'TOO_MANY_REQUESTS', message);
  }

  /**
   * Erro interno do servidor (500)
   */
  static internal(message = 'Erro interno do servidor') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }

  /**
   * Serviço indisponível (503)
   */
  static serviceUnavailable(message = 'Serviço temporariamente indisponível') {
    return new ApiError(503, 'SERVICE_UNAVAILABLE', message);
  }

  /**
   * Erro de integração externa (502)
   */
  static externalService(service, message = null) {
    return new ApiError(502, 'EXTERNAL_SERVICE_ERROR', message || `Erro ao comunicar com ${service}`);
  }

  /**
   * Converte para objeto JSON
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

/**
 * Middleware de tratamento de erros
 */
export function errorHandler(err, req, res, _next) {
  // Import dinâmico para evitar dependência circular
  import('../services/logger.js').then(({ logger }) => {
    // Se é um ApiError operacional
    if (err instanceof ApiError && err.isOperational) {
      logger.warn(
        {
          code: err.code,
          statusCode: err.statusCode,
          message: err.message,
          path: req.path,
          method: req.method,
        },
        'API Error'
      );

      return res.status(err.statusCode).json(err.toJSON());
    }

    // Erros de validação do Zod
    if (err.name === 'ZodError') {
      const validationError = ApiError.validation('Dados inválidos', err.errors);
      return res.status(400).json(validationError.toJSON());
    }

    // Erros do PostgreSQL
    if (err.code && err.code.startsWith('23')) {
      // 23505 = unique violation
      if (err.code === '23505') {
        const conflictError = ApiError.conflict('Registro já existe');
        return res.status(409).json(conflictError.toJSON());
      }
      // 23503 = foreign key violation
      if (err.code === '23503') {
        const badRequestError = ApiError.badRequest('Referência inválida');
        return res.status(400).json(badRequestError.toJSON());
      }
    }

    // Erro desconhecido - log completo
    logger.error(
      {
        err,
        path: req.path,
        method: req.method,
        body: req.body,
        userId: req.userId,
      },
      'Unhandled Error'
    );

    const internalError = ApiError.internal();
    return res.status(500).json(internalError.toJSON());
  });
}

/**
 * Wrapper para async handlers
 * Captura erros automaticamente e passa para o error handler
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Valida se um ID é UUID válido
 */
export function validateUUID(id, resourceName = 'ID') {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!id || !uuidRegex.test(id)) {
    throw ApiError.badRequest(`${resourceName} inválido`);
  }
  return id;
}

export default ApiError;
