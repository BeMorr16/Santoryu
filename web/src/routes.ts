import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("lab", "routes/lab.tsx"),
  route("lab/tokens", "routes/lab-tokens.tsx"),
  route("lab/components", "routes/lab-components.tsx"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
