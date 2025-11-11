import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [
    'dist',
    'README.md',
    'node_modules',
  ],
  formatters: true,
  typescript: true,
  test: true,
})
