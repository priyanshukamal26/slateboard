export default [{
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    globals: {
      window: "readonly",
      document: "readonly",
      console: "readonly",
      process: "readonly",
      require: "readonly",
      module: "readonly",
      __dirname: "readonly",
      fetch: "readonly",
      navigator: "readonly",
      setTimeout: "readonly",
      clearTimeout: "readonly"
    }
  },
  rules: {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-console":     ["warn", { "allow": ["error", "warn", "log"] }],
    "eqeqeq":         ["error", "always"],
    "no-var":          "off",
    "prefer-const":    "off",
    "semi":           ["error", "always"],
    "quotes":         ["error", "double", { "avoidEscape": true }]
  }
}];
