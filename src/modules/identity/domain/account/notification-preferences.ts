export interface NotificationPreferencesState {
  product: boolean;
  security: boolean;
  reminders: boolean;
}

export type NotificationPreferencesPatch =
  Partial<NotificationPreferencesState>;

export class NotificationPreferences {
  private constructor(private readonly state: NotificationPreferencesState) {}

  static restore(state: NotificationPreferencesState): NotificationPreferences {
    return new NotificationPreferences({ ...state, security: true });
  }

  get product(): boolean {
    return this.state.product;
  }

  get security(): boolean {
    return this.state.security;
  }

  get reminders(): boolean {
    return this.state.reminders;
  }

  merge(patch: NotificationPreferencesPatch): NotificationPreferences {
    return NotificationPreferences.restore({
      product: patch.product ?? this.state.product,
      security: true,
      reminders: patch.reminders ?? this.state.reminders,
    });
  }

  equals(other: NotificationPreferences): boolean {
    return this.product === other.product && this.reminders === other.reminders;
  }
}
