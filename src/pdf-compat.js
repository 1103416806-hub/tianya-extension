// PDF.js's legacy bundle supplies typed-array codecs, but still expects this
// Promise API. Define it only when missing, in both the panel and PDF worker.
if (typeof Promise.withResolvers !== 'function') {
 Object.defineProperty(Promise, 'withResolvers', {
  configurable: true,
  writable: true,
  value: { withResolvers() {
   let resolve, reject;
   const promise = new this((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
   return { promise, resolve, reject };
  }}.withResolvers
 });
}
