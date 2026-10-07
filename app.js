firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();

const elements = {
  collections: document.getElementById("collections"),
  form: document.getElementById("search-form"),
  input: document.getElementById("search-input"),
  message: document.getElementById("search-message"),
  lightbox: document.getElementById("lightbox"),
  flipCard: document.getElementById("flip-card"),
  lightboxFront: document.getElementById("lightbox-front"),
  lightboxBack: document.getElementById("lightbox-back"),
};

init();

async function init() {
  const [collections, cards, rarities] = await Promise.all([
    fetchDocuments(db.collection("collections")),
    fetchDocuments(db.collection("cards")),
    fetchDocuments(db.collection("rarities")),
  ]);
  renderCollections(collections, cards, rarities);
  elements.form.addEventListener("submit", handleSearch);
  setupLightbox();
}

async function fetchDocuments(query) {
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

function renderCollections(collections, cards, rarities) {
  elements.collections.replaceChildren(
    ...collections.map((collection) =>
      createCollectionSection(collection, cards.filter((card) => card.collectionId === collection.id), rarities)
    )
  );
}

function createCollectionSection(collection, cards, rarities) {
  const section = document.createElement("section");
  section.className = "collection";

  const title = document.createElement("h2");
  title.textContent = collection.name;

  const grid = document.createElement("div");
  grid.className = "cards";
  grid.append(...cards.map((card) => createCardElement(card, rarities)));

  section.append(title, grid);
  return section;
}

function createCardElement(card, rarities) {
  const element = document.createElement("div");
  element.className = "card";
  element.dataset.cardId = card.id;

  const rarity = rarities.find((rarity) => rarity.id === card.rarityId);
  if (rarity) {
    element.style.setProperty("--rarity-color", rarity.color);
  }

  const image = document.createElement("img");
  image.src = `cards/${card.id}.png`;
  image.alt = card.name;
  image.loading = "lazy";

  element.addEventListener("click", () => openLightbox(card));
  element.append(image);
  return element;
}

async function handleSearch(event) {
  event.preventDefault();
  const username = elements.input.value.trim().toLowerCase();
  if (!username) {
    elements.message.textContent = "";
    clearOwnership();
    return;
  }

  const doc = await db.collection("viewers").doc(username).get();
  if (!doc.exists) {
    elements.message.textContent = "Viewer non trouvé";
    clearOwnership();
    return;
  }

  elements.message.textContent = "";
  showOwnership(doc.data().cards);
}

function showOwnership(ownedCards) {
  const amounts = new Map(ownedCards.map((entry) => [entry.cardId, entry.amount]));
  for (const element of getCardElements()) {
    const amount = amounts.get(element.dataset.cardId) ?? 0;
    element.classList.toggle("not-owned", amount === 0);
    updateBadge(element, amount);
  }
}

function clearOwnership() {
  for (const element of getCardElements()) {
    element.classList.remove("not-owned");
    updateBadge(element, 0);
  }
}

function updateBadge(cardElement, amount) {
  cardElement.querySelector(".badge")?.remove();
  if (amount > 1) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = `x${amount}`;
    cardElement.append(badge);
  }
}

function getCardElements() {
  return elements.collections.querySelectorAll(".card");
}

function setupLightbox() {
  elements.lightbox.addEventListener("click", (event) => {
    if (event.target.closest("#flip-card")) {
      elements.flipCard.classList.toggle("flipped");
    } else {
      closeLightbox();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLightbox();
    }
  });
}

function openLightbox(card) {
  elements.lightboxFront.src = `cards/${card.collectionId}_${card.id}.png`;
  elements.lightboxFront.alt = card.name;
  elements.lightboxBack.src = `backs/${card.collectionId}.png`;
  elements.flipCard.classList.remove("flipped");
  elements.lightbox.classList.add("open");
}

function closeLightbox() {
  elements.lightbox.classList.remove("open");
}
