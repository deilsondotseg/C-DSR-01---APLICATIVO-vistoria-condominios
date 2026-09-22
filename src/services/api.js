const BASE_API = import.meta.env.VITE_API_BASE || "/api";
const STORAGE_KEY = "vistoria_seguranca_eletronica_store";

function createId() {
  return window.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadStore() {
  // O store local tem o mesmo formato dos recursos expostos pela API.
  const raw = localStorage.getItem(STORAGE_KEY);
  const fallback = { clients: [], equipments: [], laborRates: [], inspections: [], appointments: [] };
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

async function request(path, options = {}) {
  const url = `${BASE_API}${path}`;
  const config = {
    headers: { "Content-Type": "application/json" },
    ...options,
  };

  try {
    const session = JSON.parse(localStorage.getItem("vistoria_auth_session") || "null");
    if (session?.token) {
      config.headers = { ...config.headers, Authorization: `Bearer ${session.token}` };
    }
  } catch {
    localStorage.removeItem("vistoria_auth_session");
  }

  const rawBody = config.body;
  if (rawBody && typeof rawBody !== "string") {
    config.body = JSON.stringify(rawBody);
  }

  try {
    // O caminho principal e o backend Express/SQLite.
    const response = await fetch(url, config);
    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(responseBody.error || `API error ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return responseBody;
  } catch (error) {
    if (error.status === 401 || error.status === 403) throw error;
    // Se a API estiver indisponivel, repete o CRUD localmente para permitir trabalho offline.
    const method = (config.method || "GET").toUpperCase();
    const [resource, id] = path.split("?")[0].split("/").filter(Boolean);
    const store = loadStore();

    if (!store[resource]) {
      throw error;
    }

    const requestBody = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;

    if (method === "GET") {
      if (id) {
        return store[resource].find((item) => item.id === id) || null;
      }
      return store[resource];
    }

    if (method === "POST") {
      const item = { ...requestBody, id: createId(), createdAt: new Date().toISOString() };
      store[resource] = [item, ...store[resource]];
      saveStore(store);
      return item;
    }

    if (method === "PUT" && id) {
      const exists = store[resource].some((item) => item.id === id);
      store[resource] = exists
        ? store[resource].map((item) => (item.id === id ? { ...item, ...requestBody } : item))
        : [{ ...requestBody, id, createdAt: requestBody.createdAt || new Date().toISOString() }, ...store[resource]];
      saveStore(store);
      return store[resource].find((item) => item.id === id);
    }

    if (method === "DELETE" && id) {
      store[resource] = store[resource].filter((item) => item.id !== id);
      saveStore(store);
      return { success: true };
    }

    throw error;
  }
}

export async function registerUser(user) {
  return request("/auth/register", { method: "POST", body: user });
}

export async function loginUser(credentials) {
  try {
    return await request("/auth/login", { method: "POST", body: credentials });
  } catch (error) {
    if (error.status === 401 || error.status === 403) throw error;
    if (credentials.username === "admin" && credentials.password === "admin123") {
      return {
        user: {
          id: "local-admin",
          fullName: "Administrador",
          username: "admin",
          email: "admin@local.com",
          role: "admin",
          permissions: {
            dashboard: "edit", clients: "edit", equipments: "edit", labor: "edit",
            inspections: "edit", appointments: "edit", reports: "edit", settings: "edit",
          },
          active: true,
          createdAt: new Date().toISOString(),
        },
        token: "local-session",
        expiresAt: null,
      };
    }
    throw new Error("Usuário ou senha inválidos.");
  }
}

export async function getUsers() {
  try {
    return await request("/users");
  } catch (error) {
    if (error.status === 401 || error.status === 403) throw error;
    return [];
  }
}

export async function saveUser(user) {
  if (user.id) return request(`/users/${user.id}`, { method: "PUT", body: user });
  return request("/users", { method: "POST", body: user });
}

export async function deleteUser(userId) {
  return request(`/users/${userId}`, { method: "DELETE" });
}

export async function getClients() {
  return request("/clients");
}

export async function saveClient(client) {
  if (client.id) {
    return request(`/clients/${client.id}`, { method: "PUT", body: client });
  }
  return request("/clients", { method: "POST", body: client });
}

export async function deleteClient(clientId) {
  return request(`/clients/${clientId}`, { method: "DELETE" });
}

export async function getEquipments() {
  return request("/equipments");
}

export async function saveEquipment(equipment) {
  if (equipment.id) {
    return request(`/equipments/${equipment.id}`, { method: "PUT", body: equipment });
  }
  return request("/equipments", { method: "POST", body: equipment });
}

export async function deleteEquipment(equipmentId) {
  return request(`/equipments/${equipmentId}`, { method: "DELETE" });
}

export async function getLaborRates() {
  return request("/laborRates");
}

export async function saveLaborRate(rate) {
  if (rate.id) {
    return request(`/laborRates/${rate.id}`, { method: "PUT", body: rate });
  }
  return request("/laborRates", { method: "POST", body: rate });
}

export async function deleteLaborRate(rateId) {
  return request(`/laborRates/${rateId}`, { method: "DELETE" });
}

export async function getInspections() {
  return request("/inspections");
}

export async function saveInspection(inspection) {
  if (inspection.id) {
    return request(`/inspections/${inspection.id}`, { method: "PUT", body: inspection });
  }
  return request("/inspections", { method: "POST", body: inspection });
}

export async function deleteInspection(inspectionId) {
  return request(`/inspections/${inspectionId}`, { method: "DELETE" });
}

export async function getAppointments() {
  return request("/appointments");
}

export async function saveAppointment(appointment) {
  if (appointment.id) {
    return request(`/appointments/${appointment.id}`, { method: "PUT", body: appointment });
  }
  return request("/appointments", { method: "POST", body: appointment });
}

export async function deleteAppointment(appointmentId) {
  return request(`/appointments/${appointmentId}`, { method: "DELETE" });
}

export async function getReports({ clientId, from, to } = {}) {
  const inspections = await getInspections();
  let filtered = inspections;
  if (clientId) filtered = filtered.filter((item) => item.clientId === clientId);
  if (from) filtered = filtered.filter((item) => item.date >= from);
  if (to) filtered = filtered.filter((item) => item.date <= to);
  return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("photo", file);
  const result = await fetch(`${BASE_API}/upload`, { method: "POST", body: formData });
  if (!result.ok) throw new Error("Upload falhou");
  return result.json();
}
