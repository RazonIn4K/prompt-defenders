import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "next-env.d.ts",
      "examples/integration_demo/node_modules/**",
    ],
  },
  ...nextCoreWebVitals,
];

export default eslintConfig;
