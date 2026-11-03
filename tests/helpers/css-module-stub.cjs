/* Node SSR unit tests do not have Next's CSS loader. Keep class identities
 * while rendered browser tests verify the actual stylesheet and layout. */
require.extensions['.css'] = (module, filename) => {
  if (!filename.endsWith('.module.css')) throw new Error(`Unexpected global stylesheet in SSR unit test: ${filename}`);
  module.exports = new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) });
};
