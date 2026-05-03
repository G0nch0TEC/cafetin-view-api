console.log("init.js cargado");
const components = [
    { id: "sidebar-container", path: "/public/components/sidebar.html"},
]

components.forEach(async ({ id, path }) => {
  const el = document.getElementById(id);
  if (!el) return;
  const res = await fetch(path);
  el.innerHTML = await res.text();
  
  // Activar iconos Lucide después de inyectar el HTML
  lucide.createIcons();

  // Marcar el link activo después de cargar el sidebar
  if (id === "sidebar-container") {
    const currentPath = window.location.pathname;
    const links = el.querySelectorAll("a");
    links.forEach(link => {
      link.classList.remove("active");
      if (link.getAttribute("href") === currentPath) {
        link.classList.add("active");
      }
    });
  }
});