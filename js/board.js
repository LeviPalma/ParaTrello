// Mantém o quadro do projeto sincronizado com os dados salvos no navegador.
(() => {
  const STORAGE_KEY = "paratrello_projetos";
  const projectId = new URLSearchParams(window.location.search).get("id");
  const columnsContainer = document.querySelector(".board-columns");
  const boardTitle = document.querySelector(".board-title");
  const addColumnButton = document.querySelector(".add-column-button");
  const allowedIndicators = new Set([
    "indicator-blue",
    "indicator-amber",
    "indicator-violet",
    "indicator-green",
  ]);
  const defaultColumnColors = ["#6682f1", "#eab354", "#a279dd", "#55b991"];
  const defaultTagColors = {
    "label-red": "#b94c55",
    "label-blue": "#4965ca",
    "label-amber": "#a87620",
    "label-violet": "#8056b9",
    "label-teal": "#258781",
    "label-green": "#27865f",
  };
  let projects;
  let project;
  let draggedCard = null;

  if (!projectId) {
    window.location.replace("index.html");
    return;
  }

  if (!columnsContainer || !boardTitle || !addColumnButton) {
    console.error("ParaTrello: elementos do quadro não foram encontrados.");
    return;
  }

  function redirectToDashboard(message) {
    window.alert(message);
    window.location.replace("index.html");
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function normalizeHexColor(color, fallback) {
    return typeof color === "string" && /^#[\da-f]{6}$/i.test(color) ? color : fallback;
  }

  function getTagTextColor(hexColor) {
    const red = parseInt(hexColor.slice(1, 3), 16);
    const green = parseInt(hexColor.slice(3, 5), 16);
    const blue = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
    return luminance > 155 ? "#202638" : "#ffffff";
  }

  function getCardTags(card) {
    if (Array.isArray(card.tags)) return card.tags;
    if (!card.label) return [];

    return [{
      texto: card.label,
      cor: defaultTagColors[card.labelClass] || "#4965ca",
    }];
  }

  function renderTag(tag) {
    const defaultColor = normalizeHexColor(tag.cor, "#4965ca");
    const tagElement = createElement("span", "task-tag", tag.texto || "Nova tag");
    tagElement.contentEditable = "true";
    tagElement.setAttribute("role", "textbox");
    tagElement.setAttribute("aria-label", "Texto da tag");
    tagElement.dataset.placeholder = "Nova tag";
    tagElement.style.backgroundColor = defaultColor;
    tagElement.style.color = getTagTextColor(defaultColor);

    const colorPicker = createElement("label", "tag-color-picker");
    colorPicker.title = "Alterar cor da tag";
    colorPicker.setAttribute("aria-label", "Alterar cor da tag");
    const colorInput = createElement("input", "tag-color-input");
    colorInput.type = "color";
    colorInput.value = defaultColor;
    colorInput.setAttribute("aria-label", "Cor da tag");
    colorPicker.append(colorInput);

    const item = createElement("span", "task-tag-item");
    item.append(tagElement, colorPicker);
    return item;
  }

  function readProjects() {
    const storedProjects = window.localStorage.getItem(STORAGE_KEY);
    if (storedProjects === null) return [];

    const stored = JSON.parse(storedProjects);
    if (!Array.isArray(stored)) {
      throw new Error("Os dados salvos de projetos não têm o formato esperado.");
    }
    return stored;
  }

  function writeProjects() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }

  function renderCard(card) {
    const article = createElement("article", "task-card");
    article.dataset.cardId = card.id || createId();
    article.draggable = true;

    const deleteButton = createElement("button", "icon-button delete-card-button", "×");
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", "Excluir cartão");
    deleteButton.title = "Excluir cartão";
    article.append(deleteButton);

    const tagsContainer = createElement("div", "task-tags");
    getCardTags(card).forEach((tag) => tagsContainer.append(renderTag(tag)));
    const addTagButton = createElement("button", "add-tag-button", "+");
    addTagButton.type = "button";
    addTagButton.setAttribute("aria-label", "Adicionar tag");
    addTagButton.title = "Adicionar tag";
    tagsContainer.append(addTagButton);
    article.append(tagsContainer);

    const title = createElement("h3", "task-title", card.title || "");
    title.contentEditable = "true";
    title.setAttribute("role", "textbox");
    title.setAttribute("aria-label", "Título do cartão");
    title.dataset.placeholder = "Título do cartão";
    article.append(title);

    const description = createElement("p", "task-description", card.description || "");
    description.contentEditable = "true";
    description.setAttribute("role", "textbox");
    description.setAttribute("aria-label", "Descrição do cartão");
    description.dataset.placeholder = "Descrição do cartão";
    article.append(description);

    const footer = createElement("footer", "task-meta");
    const avatar = createElement("span", "task-avatar", card.assignee || "AL");
    footer.append(avatar);
    footer.append(createElement("span", "", card.meta || "Novo cartão"));
    article.append(footer);

    return article;
  }

  function renderColumn(list, index) {
    const column = createElement("section", "board-column");
    column.dataset.listId = list.id || createId();

    const titleId = `list-title-${column.dataset.listId}`;
    column.setAttribute("aria-labelledby", titleId);

    const header = createElement("header", "column-header");
    const heading = createElement("div", "column-heading");
    const indicatorClass = allowedIndicators.has(list.indicatorClass)
      ? list.indicatorClass
      : ["indicator-blue", "indicator-amber", "indicator-violet", "indicator-green"][index % 4];
    const columnColor = normalizeHexColor(list.color, defaultColumnColors[index % defaultColumnColors.length]);
    const colorPicker = createElement("label", "column-color-picker");
    colorPicker.title = "Alterar cor da lista";
    colorPicker.setAttribute("aria-label", "Alterar cor da lista");
    const colorInput = createElement("input", "list-color-input");
    colorInput.type = "color";
    colorInput.value = columnColor;
    colorInput.setAttribute("aria-label", "Cor da lista");
    colorPicker.append(colorInput);
    const indicator = createElement("span", `column-indicator ${indicatorClass}`);
    indicator.style.backgroundColor = columnColor;
    colorPicker.append(indicator);
    heading.append(colorPicker);

    const title = createElement("h2", "column-title", list.name || "Nova lista");
    title.id = titleId;
    title.contentEditable = "true";
    title.setAttribute("role", "textbox");
    title.setAttribute("aria-label", "Título da lista");
    heading.append(title);

    const cards = Array.isArray(list.cards) ? list.cards : [];
    heading.append(createElement("span", "task-count", String(cards.length)));
    header.append(heading);

    const deleteButton = createElement("button", "icon-button delete-list-button", "×");
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", "Excluir lista");
    deleteButton.title = "Excluir lista";
    header.append(deleteButton);
    column.append(header);

    const cardStack = createElement("div", "card-stack");
    cards.forEach((card) => cardStack.append(renderCard(card)));
    column.append(cardStack);

    const addCardButton = createElement("button", "add-card-button", "+ Adicionar um cartão");
    addCardButton.type = "button";
    column.append(addCardButton);
    return column;
  }

  function renderBoard() {
    columnsContainer.querySelectorAll(".board-column").forEach((column) => column.remove());
    const lists = Array.isArray(project.listas) ? project.listas : [];
    lists.forEach((list, index) => {
      columnsContainer.insertBefore(renderColumn(list, index), addColumnButton);
    });

    boardTitle.textContent = `ParaTrello | ${project.nome}`;
    document.title = `ParaTrello | ${project.nome}`;
    document.querySelector(".board-canvas")?.setAttribute(
      "aria-label",
      `Quadro do projeto: ${project.nome}`
    );
  }

  function readBoardFromDOM() {
    project.listas = Array.from(columnsContainer.querySelectorAll(".board-column")).map((column) => {
      const label = column.querySelector(".column-indicator");
      const title = column.querySelector(".column-title");

      return {
        id: column.dataset.listId || createId(),
        name: title?.innerText.trim() || "",
        color: normalizeHexColor(
          column.querySelector(".list-color-input")?.value,
          defaultColumnColors[Array.from(columnsContainer.querySelectorAll(".board-column")).indexOf(column) % defaultColumnColors.length]
        ),
        indicatorClass:
          Array.from(label?.classList || []).find((className) => allowedIndicators.has(className)) ||
          "indicator-blue",
        cards: Array.from(column.querySelectorAll(".task-card")).map((cardElement) => {
          const avatar = cardElement.querySelector(".task-avatar");
          const meta = cardElement.querySelector(".task-meta span:last-child");
          const taskTitle = cardElement.querySelector(".task-title");
          const description = cardElement.querySelector(".task-description");

          return {
            id: cardElement.dataset.cardId || createId(),
            title: taskTitle?.innerText.trim() || "",
            description: description?.innerText.trim() || "",
            tags: Array.from(cardElement.querySelectorAll(".task-tag-item")).map((tagItem) => ({
              texto: tagItem.querySelector(".task-tag")?.innerText.trim() || "",
              cor: normalizeHexColor(tagItem.querySelector(".tag-color-input")?.value, "#4965ca"),
            })),
            assignee: avatar?.innerText.trim() || "AL",
            meta: meta?.innerText.trim() || "Novo cartão",
          };
        }),
      };
    });
  }

  function saveBoardFromDOM() {
    readBoardFromDOM();
    try {
      writeProjects();
      window.renderProjectSidebar?.();
    } catch (error) {
      console.error("ParaTrello: não foi possível salvar as alterações do quadro.", error);
      window.alert("Não foi possível salvar as alterações neste navegador.");
    }
  }

  function updateCardCount(column) {
    const count = column.querySelector(".task-count");
    const stack = column.querySelector(".card-stack");
    if (count && stack) {
      count.textContent = String(stack.querySelectorAll(".task-card").length);
    }
  }

  function clearDropHighlights() {
    columnsContainer
      .querySelectorAll(".board-column.drag-over")
      .forEach((column) => column.classList.remove("drag-over"));
  }

  function handleDragStart(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const card = target.closest(".task-card");
    if (!card) return;

    draggedCard = card;
    card.classList.add("dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", card.dataset.cardId || "");
    }
  }

  function handleDragEnd(event) {
    const target = event.target;
    if (target instanceof Element) {
      target.closest(".task-card")?.classList.remove("dragging");
    }

    draggedCard?.classList.remove("dragging");
    draggedCard = null;
    clearDropHighlights();
  }

  function handleDragEnter(event) {
    if (!draggedCard) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    target.closest(".board-column")?.classList.add("drag-over");
  }

  function handleDragLeave(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const column = target.closest(".board-column");
    if (!column) return;

    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && column.contains(nextTarget)) return;
    column.classList.remove("drag-over");
  }

  function handleDragOver(event) {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(".board-column")) return;

    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  }

  function handleDrop(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const destination = target.closest(".board-column");
    const destinationStack = destination?.querySelector(".card-stack");
    if (!draggedCard || !destinationStack) return;

    event.preventDefault();
    const source = draggedCard.closest(".board-column");
    destinationStack.appendChild(draggedCard);
    draggedCard.classList.remove("dragging");
    clearDropHighlights();

    if (source) updateCardCount(source);
    if (destination) updateCardCount(destination);

    // Rebuild and persist the project data immediately after moving the card.
    saveBoardFromDOM();
  }

  function addColumn() {
    const list = {
      id: createId(),
      name: "Nova lista",
      indicatorClass: "indicator-blue",
      color: defaultColumnColors[project.listas.length % defaultColumnColors.length],
      cards: [],
    };
    const column = renderColumn(list, project.listas.length);
    columnsContainer.insertBefore(column, addColumnButton);
    column.querySelector(".column-title")?.focus();
    saveBoardFromDOM();
  }

  function addCard(column) {
    const stack = column.querySelector(".card-stack");
    if (!stack) return;

    const card = renderCard({
      id: createId(),
      title: "",
      description: "",
      tags: [],
      assignee: "AL",
      meta: "Novo cartão",
    });
    stack.append(card);
    updateCardCount(column);
    card.querySelector(".task-title")?.focus();
    saveBoardFromDOM();
  }

  function finishEditing(field) {
    field.innerText = field.innerText.replace(/\r?\n/g, " ").trim();
    saveBoardFromDOM();
  }

  function handleClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest(".add-column-button")) {
      addColumn();
      return;
    }

    const addCardButton = target.closest(".add-card-button");
    if (addCardButton) {
      const column = addCardButton.closest(".board-column");
      if (column) addCard(column);
      return;
    }

    const addTagButton = target.closest(".add-tag-button");
    if (addTagButton) {
      const card = addTagButton.closest(".task-card");
      const tagsContainer = addTagButton.closest(".task-tags");
      if (!card || !tagsContainer) return;

      const tagItem = renderTag({ texto: "Nova tag", cor: "#4965ca" });
      tagsContainer.insertBefore(tagItem, addTagButton);
      tagItem.querySelector(".task-tag")?.focus();
      saveBoardFromDOM();
      return;
    }

    const deleteCardButton = target.closest(".delete-card-button");
    if (deleteCardButton) {
      const card = deleteCardButton.closest(".task-card");
      const column = deleteCardButton.closest(".board-column");
      const title = card?.querySelector(".task-title")?.innerText.trim();
      const confirmation = title
        ? `Excluir o cartão "${title}"?`
        : "Excluir este cartão?";

      if (card && column && window.confirm(confirmation)) {
        card.remove();
        updateCardCount(column);
        saveBoardFromDOM();
      }
      return;
    }

    const deleteListButton = target.closest(".delete-list-button");
    if (deleteListButton) {
      const column = deleteListButton.closest(".board-column");
      const title = column?.querySelector(".column-title")?.innerText.trim();
      const confirmation = title
        ? `Excluir a lista "${title}" e todos os seus cartões?`
        : "Excluir esta lista e todos os seus cartões?";

      if (column && window.confirm(confirmation)) {
        column.remove();
        saveBoardFromDOM();
      }
    }
  }

  try {
    projects = readProjects();
  } catch (error) {
    console.error("ParaTrello: os dados dos projetos não puderam ser lidos.", error);
    redirectToDashboard("Não foi possível carregar os projetos salvos.");
    return;
  }

  project = projects.find((item) => item && item.id === projectId);
  if (!project) {
    redirectToDashboard("Esse projeto não foi encontrado. Você voltou para seus projetos.");
    return;
  }

  if (!Array.isArray(project.listas)) project.listas = [];
  project.listas.forEach((list) => {
    if (!Array.isArray(list.cards)) list.cards = [];
  });

  renderBoard();
  columnsContainer.addEventListener("click", handleClick);
  columnsContainer.addEventListener("dragstart", handleDragStart);
  columnsContainer.addEventListener("dragend", handleDragEnd);
  columnsContainer.addEventListener("dragenter", handleDragEnter);
  columnsContainer.addEventListener("dragleave", handleDragLeave);
  columnsContainer.addEventListener("dragover", handleDragOver);
  columnsContainer.addEventListener("drop", handleDrop);
  columnsContainer.addEventListener("focusout", (event) => {
    const field = event.target;
    if (field instanceof HTMLElement && field.isContentEditable) {
      finishEditing(field);
    }
  });
  columnsContainer.addEventListener("keydown", (event) => {
    const field = event.target;
    if (
      event.key === "Enter" &&
      field instanceof HTMLElement &&
      field.isContentEditable &&
      !(event.shiftKey && field.matches(".task-description"))
    ) {
      event.preventDefault();
      field.blur();
    }
  });
  function handleFieldChange(event) {
    const field = event.target;
    if (field instanceof HTMLElement && field.isContentEditable) {
      saveBoardFromDOM();
      return;
    }

    if (field instanceof HTMLInputElement && field.matches(".list-color-input, .tag-color-input")) {
      const colorSwatch = field.matches(".list-color-input")
        ? field.closest(".column-color-picker")?.querySelector(".column-indicator")
        : field.closest(".task-tag-item")?.querySelector(".task-tag");

      if (colorSwatch) {
        colorSwatch.style.backgroundColor = field.value;
        if (colorSwatch.matches(".task-tag")) {
          colorSwatch.style.color = getTagTextColor(field.value);
        }
      }
      saveBoardFromDOM();
    }
  }

  columnsContainer.addEventListener("input", handleFieldChange);
  columnsContainer.addEventListener("change", handleFieldChange);
})();
