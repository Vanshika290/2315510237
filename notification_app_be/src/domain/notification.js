// Domain model for Notification
class Notification {
  constructor(id, studentId, type, title, message, isRead = false, createdAt = new Date()) {
    this.notificationId = id;
    this.studentId = studentId;
    this.type = type; // Result, Event, Placement, Alert
    this.title = title;
    this.message = message;
    this.isRead = isRead;
    this.createdAt = createdAt;
  }

  markAsRead() {
    this.isRead = true;
  }

  toJSON() {
    return {
      notificationId: this.notificationId,
      studentId: this.studentId,
      type: this.type,
      title: this.title,
      message: this.message,
      isRead: this.isRead,
      createdAt: this.createdAt
    };
  }

  isValid() {
    if (!this.studentId || !this.type || !this.title || !this.message) {
      return false;
    }
    const validTypes = ['Result', 'Event', 'Placement', 'Alert'];
    return validTypes.includes(this.type);
  }
}

module.exports = Notification;
