export enum UserEventType {
  USER_REGISTERED = 'user.registered',
  USER_VERIFIED = 'user.verified',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  PASSWORD_CHANGED = 'user.password_changed',
  PASSWORD_RESET_REQUESTED = 'user.password_reset_requested',
}

export interface UserEvent {
  type: UserEventType;
  timestamp: Date;
  userId: string;
  data: Record<string, string | number | boolean | Date>;
}

export interface UserRegisteredEvent extends UserEvent {
  type: UserEventType.USER_REGISTERED;
  data: {
    email: string;
    firstName: string;
    lastName: string;
    registrationMethod: 'email' | 'phone';
  };
}

export interface UserVerifiedEvent extends UserEvent {
  type: UserEventType.USER_VERIFIED;
  data: {
    email: string;
    verificationType: 'email' | 'phone';
  };
}

export interface UserUpdatedEvent extends UserEvent {
  type: UserEventType.USER_UPDATED;
  data: {
    email: string;
    changes: string;
  };
}

export interface PasswordChangedEvent extends UserEvent {
  type: UserEventType.PASSWORD_CHANGED;
  data: {
    email: string;
    changedAt: Date;
  };
}

export function createUserRegisteredEvent(
  userId: string,
  email: string,
  firstName: string,
  lastName: string,
  registrationMethod: 'email' | 'phone'
): UserRegisteredEvent {
  return {
    type: UserEventType.USER_REGISTERED,
    timestamp: new Date(),
    userId,
    data: {
      email,
      firstName,
      lastName,
      registrationMethod,
    },
  };
}

export function createUserVerifiedEvent(
  userId: string,
  email: string,
  verificationType: 'email' | 'phone'
): UserVerifiedEvent {
  return {
    type: UserEventType.USER_VERIFIED,
    timestamp: new Date(),
    userId,
    data: {
      email,
      verificationType,
    },
  };
}
