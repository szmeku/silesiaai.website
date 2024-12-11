export default {
  port: 8081,
  rootDir: '.',
  appIndex: 'toKindle/index.html',
  nodeResolve: true,
  http2: true,
  https: true,
  preserveSymlinks: true,
  watch: true,
  open: true,
  sslKey: "./certs/key.pem",
  sslCert: "./certs/cert.pem",
};