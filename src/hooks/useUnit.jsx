// Unit is locked to CM only across the app to avoid measurement confusion.
export function useUnit() {
  return { unit: "cm", setUnit: () => {}, isCm: true };
}