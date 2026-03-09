const STORAGE_KEY = 'crmContacts';
const form = document.getElementById('contactForm');
const contactsContainer = document.getElementById('contactsContainer');
const searchInput = document.getElementById('search');
const clearStorage = document.getElementById('clear-storage');
const formTitle = document.getElementById('formTitle');
const submitButton = document.getElementById('submitButton');
const cancelButton = document.getElementById('cancelEdit');

let editingId = null;

// Keep contacts in localStorage so Chrome remembers them between visits.
function getContacts() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to parse contacts', error);
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function persistContacts(contacts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

function updateFormState() {
  if (editingId) {
    formTitle.textContent = 'Edit contact';
    submitButton.textContent = 'Save changes';
    cancelButton.hidden = false;
  } else {
    formTitle.textContent = 'Add contact';
    submitButton.textContent = 'Save contact';
    cancelButton.hidden = true;
  }
}

function resetForm() {
  editingId = null;
  form.reset();
  updateFormState();
}

function startEdit(id) {
  const contact = getContacts().find((entry) => entry.id === id);
  if (!contact) {
    return;
  }
  editingId = id;
  form.elements.name.value = contact.name;
  form.elements.email.value = contact.email;
  form.elements.phone.value = contact.phone;
  form.elements.company.value = contact.company;
  form.elements.logEntry.value = '';
  updateFormState();
  form.elements.name.focus();
}

function addEngagementLog(id, text) {
  const contacts = getContacts();
  const updated = contacts.map((entry) => {
    if (entry.id === id) {
      const logs = entry.logs || [];
      return { ...entry, logs: [...logs, { date: new Date().toISOString(), text }] };
    }
    return entry;
  });
  persistContacts(updated);
  renderContacts(searchInput.value);
}

function removeContact(id) {
  const contacts = getContacts();
  const filtered = contacts.filter((entry) => entry.id !== id);
  persistContacts(filtered);
  if (editingId === id) {
    resetForm();
  }
  renderContacts(searchInput.value);
}

function createContactCard(contact) {
  const card = document.createElement('article');
  card.className = 'contact-card';

  const meta = document.createElement('div');
  meta.className = 'contact-meta';

  const name = document.createElement('h3');
  name.textContent = contact.name || 'Unnamed';
  meta.appendChild(name);

  const company = document.createElement('small');
  company.textContent = contact.company || 'No company';
  meta.appendChild(company);

  const email = document.createElement('small');
  email.textContent = contact.email;
  meta.appendChild(email);

  const phone = document.createElement('small');
  phone.textContent = contact.phone || 'No phone';
  meta.appendChild(phone);

  const logsContainer = document.createElement('div');
  logsContainer.style.marginTop = '10px';
  logsContainer.style.borderTop = '1px solid rgba(0,0,0,0.1)';
  logsContainer.style.paddingTop = '5px';

  const logsHeader = document.createElement('h4');
  logsHeader.textContent = 'Engagement Logs';
  logsHeader.style.margin = '0.5rem 0';
  logsHeader.style.fontSize = '0.9rem';
  logsContainer.appendChild(logsHeader);

  if (contact.logs && contact.logs.length) {
    contact.logs.forEach((log) => {
      const p = document.createElement('p');
      p.style.fontSize = '0.85rem';
      p.style.margin = '0.25rem 0';
      const date = document.createElement('strong');
      date.textContent = new Date(log.date).toLocaleDateString();
      p.appendChild(date);
      p.appendChild(document.createTextNode(': ' + log.text));
      logsContainer.appendChild(p);
    });
  }

  const logInput = document.createElement('input');
  logInput.placeholder = 'Add log (press Enter)...';
  logInput.style.width = '100%';
  logInput.style.marginTop = '0.5rem';
  logInput.style.padding = '5px';
  logInput.style.border = '1px solid #ccc';
  logInput.style.borderRadius = '4px';
  logInput.style.boxSizing = 'border-box';
  logInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const text = e.target.value.trim();
      if (text) addEngagementLog(contact.id, text);
    }
  });
  logsContainer.appendChild(logInput);

  const actions = document.createElement('div');
  actions.className = 'actions';

  const edit = document.createElement('button');
  edit.textContent = 'Edit';
  edit.addEventListener('click', () => startEdit(contact.id));
  actions.appendChild(edit);

  const del = document.createElement('button');
  del.textContent = 'Delete';
  del.className = 'delete';
  del.addEventListener('click', () => {
    if (window.confirm('Delete this contact?')) {
      removeContact(contact.id);
    }
  });
  actions.appendChild(del);

  card.appendChild(meta);
  card.appendChild(logsContainer);
  card.appendChild(actions);
  return card;
}

function renderContacts(filter = '') {
  const contacts = getContacts();
  clearStorage.disabled = !contacts.length;
  const normalized = filter.trim().toLowerCase();
  const visible = normalized
    ? contacts.filter((entry) => {
        const name = (entry.name || '').toLowerCase();
        const company = (entry.company || '').toLowerCase();
        return name.includes(normalized) || company.includes(normalized);
      })
    : contacts;

  // Clean the container before displaying the new items.
  contactsContainer.innerHTML = '';

  if (!visible.length) {
    const message = document.createElement('p');
    message.className = 'empty-state';
    message.textContent = normalized
      ? 'No contacts match that search.'
      : 'No contacts yet. Add someone to get started.';
    contactsContainer.appendChild(message);
    return;
  }

  visible.forEach((contact) => {
    contactsContainer.appendChild(createContactCard(contact));
  });
}

function handleFormSubmit(event) {
  event.preventDefault();
  const name = form.elements.name.value.trim();
  const email = form.elements.email.value.trim();
  const phone = form.elements.phone.value.trim();
  const company = form.elements.company.value.trim();
  const logEntry = form.elements.logEntry.value.trim();
  if (!name || !email) {
    return;
  }

  const contacts = getContacts();

  let logs = [];
  if (editingId) {
    const existing = contacts.find((entry) => entry.id === editingId);
    if (existing && existing.logs) {
      logs = existing.logs;
    }
  }

  if (logEntry) {
    logs = [...logs, { date: new Date().toISOString(), text: logEntry }];
  }

  const payload = {
    id: editingId || Date.now().toString(),
    name,
    email,
    phone,
    company,
    logs,
  };

  const next = editingId
    ? contacts.map((entry) => (entry.id === editingId ? payload : entry))
    : [...contacts, payload];

  persistContacts(next);
  resetForm();
  renderContacts(searchInput.value);
}

// Quick guard before destroying stored data.
function clearAllContacts() {
  if (!window.confirm('Reset all contacts in this browser?')) {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
  resetForm();
  renderContacts(searchInput.value);
}

form.addEventListener('submit', handleFormSubmit);
searchInput.addEventListener('input', () => renderContacts(searchInput.value));
clearStorage.addEventListener('click', clearAllContacts);
cancelButton.addEventListener('click', resetForm);

resetForm();
renderContacts(searchInput.value);
