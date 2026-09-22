import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

if (import.meta.env.DEV && "serviceWorker" in navigator) {
  const cleanupKey = "vistoria-dev-service-worker-cleaned";
  if (!sessionStorage.getItem(cleanupKey)) {
    sessionStorage.setItem(cleanupKey, "true");
    navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      await Promise.all(registrations.map((registration) => registration.unregister()));
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }
      window.location.reload();
    });
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  // StrictMode ajuda a encontrar efeitos colaterais durante o desenvolvimento.
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (!import.meta.env.DEV && "serviceWorker" in navigator) {
  // O Service Worker cacheia a interface e oferece uma rota de navegacao offline.
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js?v=20260904-2")
      .then((registration) => {
        console.log("Service Worker registrado com sucesso:", registration.scope);
      })
      .catch((error) => {
        console.warn("Falha ao registrar Service Worker:", error);
      });
  });
}
