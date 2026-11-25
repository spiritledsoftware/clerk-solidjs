import { createRouter } from "@solidjs/router";

import Home from "./routes/home";
import Protected from "./routes/protected";
import Waitlist from "./routes/waitlist";

export const Router = createRouter({
  routes: [
    { path: "/", component: Home },
    { path: "/waitlist", component: Waitlist },
    { path: "/protected", component: Protected },
  ],
});
