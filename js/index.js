// Tela inicial e gerenciamento dos projetos salvos no ParaTrello.
(() => {
  const STORAGE_KEY = "paratrello_projetos";
  const createButton = document.querySelector("#create-project-button");
  const projectGrid = document.querySelector(".project-grid");
  const projectCount = document.querySelector(".project-count");
  const iconClasses = ["project-icon-blue", "project-icon-violet", "project-icon-teal"];
  let projects = [];

  if (!createButton || !projectGrid || !projectCount) {
    console.error("ParaTrello: elementos do dashboard não foram encontrados.");
    return;
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function createSampleProjects() {
    return [{
      id: createId(),
      nome: "Bem-vindo ao ParaTrello!",
      descricao: "Este é o seu espaço para criar listas, cuidar das tarefas e organizar as ideias.",
      dataCriacao: Date.now(),
      listas: [],
    }];
  }

  function readProjects() {
    const storedProjects = window.localStorage.getItem(STORAGE_KEY);
    if (storedProjects === null) {
      const sampleProjects = createSampleProjects();
      writeProjects(sampleProjects);
      window.renderProjectSidebar?.();
      return sampleProjects;
    }

    const projects = JSON.parse(storedProjects);
    if (!Array.isArray(projects)) {
      throw new Error("Os dados salvos de projetos não têm o formato esperado.");
    }

    if (projects.length === 0) {
      const sampleProjects = createSampleProjects();
      writeProjects(sampleProjects);
      window.renderProjectSidebar?.();
      return sampleProjects;
    }

    return projects.filter(
      (project) =>
        project &&
        typeof project.id === "string" &&
        typeof project.nome === "string" &&
        typeof project.descricao === "string" &&
        Array.isArray(project.listas)
    );
  }

  function writeProjects(projects) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }

  function addText(parent, tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    parent.append(element);
    return element;
  }

  function getInitials(name) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  }

  function formatCreationDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Projeto criado";

    return `Criado em ${date.toLocaleDateString("pt-BR")}`;
  }

  function renderProjects(projects) {
    projectGrid.replaceChildren();
    projectCount.textContent = `${projects.length} ${projects.length === 1 ? "projeto" : "projetos"}`;

    if (projects.length === 0) {
      addText(projectGrid, "p", "empty-projects", "Nenhum projeto por aqui. Crie seu primeiro projeto no ParaTrello.");
      return;
    }

    projects.forEach((project, index) => {
      const card = document.createElement("article");
      card.className = "project-card";
      card.dataset.projectId = project.id;

      const link = document.createElement("a");
      const boardUrl = new URL("board.html", window.location.href);
      boardUrl.searchParams.set("id", project.id);
      link.className = "project-card-link";
      link.href = boardUrl.toString();

      const cardTop = document.createElement("div");
      cardTop.className = "project-card-top";
      const icon = addText(cardTop, "span", `project-icon ${iconClasses[index % iconClasses.length]}`, getInitials(project.nome));
      icon.setAttribute("aria-hidden", "true");
      const arrow = addText(cardTop, "span", "project-arrow", "↗");
      arrow.setAttribute("aria-hidden", "true");
      link.append(cardTop);

      addText(link, "h3", "", project.nome);
      addText(link, "p", "", project.descricao);

      const footer = document.createElement("div");
      footer.className = "project-card-footer";
      const dot = document.createElement("span");
      dot.className = "status-dot";
      dot.setAttribute("aria-hidden", "true");
      footer.append(dot);
      addText(footer, "span", "", formatCreationDate(project.dataCriacao));
      link.append(footer);

      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-project-button";
      deleteButton.type = "button";
      deleteButton.setAttribute("aria-label", `Excluir projeto ${project.nome}`);
      deleteButton.title = "Excluir projeto";

      const trashIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      trashIcon.setAttribute("viewBox", "0 0 24 24");
      trashIcon.setAttribute("aria-hidden", "true");
      trashIcon.setAttribute("focusable", "false");
      const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      iconPath.setAttribute("d", "M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3m-9 0h12");
      iconPath.setAttribute("fill", "none");
      iconPath.setAttribute("stroke", "currentColor");
      iconPath.setAttribute("stroke-width", "1.8");
      iconPath.setAttribute("stroke-linecap", "round");
      iconPath.setAttribute("stroke-linejoin", "round");
      trashIcon.append(iconPath);
      deleteButton.append(trashIcon);

      card.append(link, deleteButton);
      projectGrid.append(card);
    });
  }

  function deleteProject(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const deleteButton = target.closest(".delete-project-button");
    if (!deleteButton || !projectGrid.contains(deleteButton)) return;

    event.preventDefault();
    event.stopPropagation();

    const card = deleteButton.closest(".project-card");
    const projectId = card?.dataset.projectId;
    const project = projects.find((item) => item.id === projectId);
    if (!projectId || !project) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o projeto '${project.nome}'? Esta ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    try {
      projects = readProjects().filter((item) => item.id !== projectId);
      writeProjects(projects);
      renderProjects(projects);
      window.renderProjectSidebar?.();
    } catch (error) {
      console.error("ParaTrello: não foi possível excluir o projeto.", error);
      window.alert("Não foi possível excluir o projeto neste navegador.");
    }
  }

  function createProject() {
    const nome = window.prompt("Qual é o nome do projeto?");
    if (nome === null) return;

    const trimmedName = nome.trim();
    if (!trimmedName) {
      window.alert("Informe um nome para o projeto.");
      return;
    }

    const descricao = window.prompt("Descreva brevemente o projeto:") ?? "";
    try {
      projects = readProjects();
      const project = {
        id: createId(),
        nome: trimmedName,
        descricao: descricao.trim(),
        dataCriacao: Date.now(),
        listas: [],
      };

      projects.unshift(project);
      writeProjects(projects);
      renderProjects(projects);
      window.renderProjectSidebar?.();
    } catch (error) {
      console.error("ParaTrello: não foi possível criar o projeto.", error);
      window.alert("Não foi possível salvar o projeto neste navegador.");
    }
  }

  createButton.addEventListener("click", createProject);
  projectGrid.addEventListener("click", deleteProject);
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;

    try {
      projects = event.newValue ? JSON.parse(event.newValue) : [];
      if (!Array.isArray(projects)) {
        throw new Error("Os dados sincronizados de projetos não têm o formato esperado.");
      }
      renderProjects(projects);
    } catch (error) {
      console.error("ParaTrello: os projetos sincronizados não puderam ser exibidos.", error);
    }
  });

  try {
    projects = readProjects();
    renderProjects(projects);
  } catch (error) {
    console.error("ParaTrello: não foi possível carregar os projetos.", error);
    window.alert("Não foi possível carregar os projetos salvos.");
  }
})();
