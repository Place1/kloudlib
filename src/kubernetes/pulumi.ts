export function makename(name: string) {
  if (name.charAt(0).toUpperCase() != name.charAt(0)) {
    // enforce a very basic naming convention
    throw new Error('makename assertion error - first letter must be a capital');
  }
  return `cloud::kubernetes::${name}`;
}
