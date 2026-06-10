class ValidationUtil {
  validateStudentId(studentId) {
    if (!studentId || typeof studentId !== 'string' || studentId.trim() === '') {
      return { valid: false, error: 'Student ID must be a non-empty string' };
    }
    return { valid: true };
  }

  validateNotificationType(type) {
    const validTypes = ['Result', 'Event', 'Placement', 'Alert'];
    if (!validTypes.includes(type)) {
      return { valid: false, error: `Type must be one of: ${validTypes.join(', ')}` };
    }
    return { valid: true };
  }

  validateTitle(title) {
    if (!title || title.trim().length < 3 || title.length > 200) {
      return { valid: false, error: 'Title must be between 3 and 200 characters' };
    }
    return { valid: true };
  }

  validateMessage(message) {
    if (!message || message.trim().length < 5 || message.length > 1000) {
      return { valid: false, error: 'Message must be between 5 and 1000 characters' };
    }
    return { valid: true };
  }

  validateNotification(data) {
    const errors = [];

    const studentIdValidation = this.validateStudentId(data.studentId);
    if (!studentIdValidation.valid) errors.push(studentIdValidation.error);

    const typeValidation = this.validateNotificationType(data.type);
    if (!typeValidation.valid) errors.push(typeValidation.error);

    const titleValidation = this.validateTitle(data.title);
    if (!titleValidation.valid) errors.push(titleValidation.error);

    const messageValidation = this.validateMessage(data.message);
    if (!messageValidation.valid) errors.push(messageValidation.error);

    return {
      valid: errors.length === 0,
      errors
    };
  }

  validatePagination(limit, offset) {
    const errors = [];

    if (limit && (isNaN(limit) || limit < 1 || limit > 100)) {
      errors.push('Limit must be a number between 1 and 100');
    }

    if (offset && (isNaN(offset) || offset < 0)) {
      errors.push('Offset must be a non-negative number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new ValidationUtil();
