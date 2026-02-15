let _stripeAvailable = false;

export function isStripeAvailable(): boolean {
  return _stripeAvailable;
}

export function setStripeAvailable(value: boolean): void {
  _stripeAvailable = value;
}
