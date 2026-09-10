export function dispatchNotice(delivery: Promise<void>): void {
  void delivery.catch(() => undefined);
}
