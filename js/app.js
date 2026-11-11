// Atualiza os atalhos dos projetos na navegação lateral.
(() => {
  const STORAGE_KEY = "paratrello_projetos";
  const projectList = document.querySelector(".sidebar-project-list");
  const currentProjectId = new URLSearchParams(window.location.search).get("id");

  window.renderProjectSidebar = function renderProjectSidebar() {
    if (!projectList) return;

    try {
      const storedProjects = window.localStorage.getItem(STORAGE_KEY);
      const projects = storedProjects ? JSON.parse(storedProjects) : [];
      if (!Array.isArray(projects)) {
        throw new Error("Os dados salvos de projetos não têm o formato esperado.");
      }

      projectList.replaceChildren();
      projects
        .filter((project) => project && typeof project.id === "string" && typeof project.nome === "string")
        .forEach((project) => {
          const item = document.createElement("li");
          const link = document.createElement("a");
          const boardUrl = new URL("board.html", window.location.href);
          boardUrl.searchParams.set("id", project.id);
          link.href = boardUrl.toString();
          link.className = "sidebar-link sidebar-project-link";
          link.textContent = project.nome;
          link.title = project.nome;

          if (project.id === currentProjectId) {
            link.classList.add("is-active");
            link.setAttribute("aria-current", "page");
          }

          item.append(link);
          projectList.append(item);
        });
    } catch (error) {
      console.error("ParaTrello: não foi possível renderizar a navegação de projetos.", error);
    }
  };

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) window.renderProjectSidebar();
  });

  window.renderProjectSidebar();
})();
