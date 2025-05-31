
module.exports = {
  presets: [
    ['@babel/preset-env', {targets: {node: 'current'}}],
    ['@babel/preset-react', {runtime: 'automatic'}],
    '@babel/preset-typescript',
    // It's often recommended to use next/babel preset for Next.js projects
    // as it includes necessary transformations for Next.js features.
    // The transform in jest.config.js already uses ['babel-jest', { presets: ['next/babel'] }]
    // so this file might be redundant if you only use babel-jest like that.
    // However, if you have other Babel needs or want a central config, this is how you'd set it up.
    // For Jest with `next/babel`, the transform in jest.config.js is usually sufficient.
  ],
};
