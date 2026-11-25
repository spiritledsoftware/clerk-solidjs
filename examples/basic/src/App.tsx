import { ClerkProvider } from "clerk-solidjs/start";
import { Loading } from "solid-js";

import { Router } from "./router";

import "./app.css";

export default function App() {
  return (
    <Router>
      {(props) => (
        <ClerkProvider>
          <Loading>{props.children}</Loading>
        </ClerkProvider>
      )}
    </Router>
  );
}
