import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

let convexUrl = import.meta.env.VITE_CONVEX_URL || "https://sincere-lynx-459.convex.cloud";

// Ensure the URL is absolute
if (convexUrl && !convexUrl.startsWith('http')) {
  convexUrl = `https://${convexUrl}`;
}

console.log("Using Convex URL:", convexUrl);
console.log("Environment vars:", import.meta.env);

if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL environment variable is not set");
}

const convex = new ConvexReactClient(convexUrl);

export default convex;

// Provider component to wrap your app
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}