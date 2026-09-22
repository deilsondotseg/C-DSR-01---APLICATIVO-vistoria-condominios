import express from "express";
import cors from "cors";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, "database.sqlite");

function createId() {
  return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) return false;
  const derivedHash = scryptSync(password, salt, 64);
  const expectedHash = Buffer.from(hash, "hex");
  return derivedHash.length === expectedHash.length && timingSafeEqual(derivedHash, expectedHash);
}

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    username: user.username,
    role: user.role,
    permissions: normalizePermissions(user.role, JSON.parse(user.permissions || "{}")),
    active: Boolean(user.active),
    createdAt: user.createdAt,
  };
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  await db.run(
    "INSERT INTO sessions (id, userId, tokenHash, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)",
    createId(),
    userId,
    hashToken(token),
    expiresAt,
    new Date().toISOString(),
  );
  return { token, expiresAt };
}

// Garante que os arquivos enviados tenham um diretorio persistente.
const uploadsDir = path.resolve(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
const port = Number(process.env.PORT || 4000);
const userRoles = ["admin", "consultor", "tecnico"];
const permissionValues = ["none", "view", "edit"];
const permissionModules = ["dashboard", "clients", "equipments", "labor", "inspections", "appointments", "reports", "settings"];

function defaultPermissions(role) {
  if (role === "admin") return Object.fromEntries(permissionModules.map((module) => [module, "edit"]));
  if (role === "tecnico") return { dashboard: "view", clients: "view", equipments: "view", inspections: "edit", appointments: "view", reports: "view", labor: "none", settings: "none" };
  return { dashboard: "view", clients: "edit", equipments: "view", inspections: "edit", appointments: "edit", reports: "view", labor: "view", settings: "none" };
}

function normalizePermissions(role, permissions) {
  const normalized = defaultPermissions(role);
  for (const module of permissionModules) {
    if (permissionValues.includes(permissions?.[module])) normalized[module] = permissions[module];
  }
  return normalized;
}

app.use(cors());

// Registra o tamanho das requisicoes para diagnosticar payloads grandes.
app.use((req, _res, next) => {
  console.log('INCOMING', req.method, req.url, 'content-length=', req.headers['content-length']);
  next();
});

// Permite payloads maiores quando uma foto precisa usar o fallback em base64.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// multer for multipart uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, file.mimetype.startsWith("image/")),
});

app.post('/api/upload', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file uploaded' });
  const info = { id: req.file.filename, url: `/uploads/${req.file.filename}`, name: req.file.originalname, size: req.file.size };
  res.json(info);
});

let db;

async function initDb() {
  // O schema e criado automaticamente para facilitar a execucao local.
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT,
      document TEXT,
      address TEXT,
      manager TEXT,
      phone TEXT,
      email TEXT,
      notes TEXT,
      administrator TEXT,
      gateType TEXT,
      outsourcedGateCompany TEXT,
      condominiumProfile TEXT,
      towerCount INTEGER DEFAULT 0,
      unitCount INTEGER DEFAULT 0,
      gateCount INTEGER DEFAULT 0,
      hasGenerator TEXT,
      hasElevator TEXT,
      elevatorCount INTEGER DEFAULT 0,
      frontageMeters REAL DEFAULT 0,
      lengthMeters REAL DEFAULT 0,
      vehicleEntryCount INTEGER DEFAULT 0,
      hasVehicleEclusa TEXT,
      hasBasement TEXT,
      basementCount INTEGER DEFAULT 0,
      pedestrianEntryFormat TEXT,
      hasPedestrianEclusa TEXT,
      towerWoodDoorAccessCount INTEGER DEFAULT 0,
      towerGlassDoorAccessCount INTEGER DEFAULT 0,
      electricFenceStatus TEXT,
      electricFenceMeters REAL DEFAULT 0,
      ivaSensorStatus TEXT,
      ivaSensorCount INTEGER DEFAULT 0,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS equipments (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT,
      brand TEXT,
      model TEXT,
      technicalDescription TEXT,
      quantity INTEGER,
      location TEXT,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS laborRates (
      id TEXT PRIMARY KEY,
      serviceType TEXT,
      unitPrice REAL,
      estimatedTime TEXT,
      description TEXT,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS inspections (
      id TEXT PRIMARY KEY,
      clientId TEXT,
      clientName TEXT,
      date TEXT,
      type TEXT,
      status TEXT,
      summary TEXT,
      notes TEXT,
      totalCost REAL,
      totalTime TEXT,
      createdAt TEXT,
      items TEXT
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      clientId TEXT,
      clientName TEXT,
      date TEXT,
      time TEXT,
      type TEXT,
      technician TEXT,
      status TEXT,
      notes TEXT,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      fullName TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'consultor',
      permissions TEXT NOT NULL DEFAULT '{}',
      active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      tokenHash TEXT NOT NULL UNIQUE,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);
  const clientColumns = await db.all("PRAGMA table_info(clients)");
  const existingClientColumns = new Set(clientColumns.map((column) => column.name));
  const clientMigrations = [
    ["administrator", "TEXT"], ["gateType", "TEXT"], ["outsourcedGateCompany", "TEXT"], ["condominiumProfile", "TEXT"],
    ["towerCount", "INTEGER DEFAULT 0"], ["unitCount", "INTEGER DEFAULT 0"], ["gateCount", "INTEGER DEFAULT 0"], ["hasGenerator", "TEXT"],
    ["hasElevator", "TEXT"], ["elevatorCount", "INTEGER DEFAULT 0"], ["frontageMeters", "REAL DEFAULT 0"], ["lengthMeters", "REAL DEFAULT 0"],
    ["vehicleEntryCount", "INTEGER DEFAULT 0"], ["hasVehicleEclusa", "TEXT"], ["hasBasement", "TEXT"], ["basementCount", "INTEGER DEFAULT 0"],
    ["pedestrianEntryFormat", "TEXT"], ["hasPedestrianEclusa", "TEXT"], ["towerWoodDoorAccessCount", "INTEGER DEFAULT 0"], ["towerGlassDoorAccessCount", "INTEGER DEFAULT 0"],
    ["electricFenceStatus", "TEXT"], ["electricFenceMeters", "REAL DEFAULT 0"], ["ivaSensorStatus", "TEXT"], ["ivaSensorCount", "INTEGER DEFAULT 0"],
  ];
  for (const [column, definition] of clientMigrations) {
    if (!existingClientColumns.has(column)) await db.exec(`ALTER TABLE clients ADD COLUMN ${column} ${definition}`);
  }
  await migrateInspectionSchema();
}

async function migrateInspectionSchema() {
  const columns = await db.all("PRAGMA table_info(inspections)");
  const names = columns.map((column) => column.name);
  if (!names.includes("signatureTech") && !names.includes("signatureClient")) {
    return;
  }

  await db.exec(`
    ALTER TABLE inspections RENAME TO inspections_old;
  `);

  await db.exec(`
    CREATE TABLE inspections (
      id TEXT PRIMARY KEY,
      clientId TEXT,
      clientName TEXT,
      date TEXT,
      type TEXT,
      status TEXT,
      summary TEXT,
      notes TEXT,
      totalCost REAL,
      totalTime TEXT,
      createdAt TEXT,
      items TEXT
    );
  `);

  await db.exec(`
    INSERT INTO inspections (id, clientId, clientName, date, type, status, summary, notes, totalCost, totalTime, createdAt, items)
    SELECT id, clientId, clientName, date, type, status, summary, notes, totalCost, totalTime, createdAt, items FROM inspections_old;
  `);

  await db.exec("DROP TABLE inspections_old;");
}

function parseJsonField(value) {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || String(body[field]).trim() === "");
  return missing;
}

function invalidNumber(value, minimum = 0) {
  return !Number.isFinite(Number(value)) || Number(value) < minimum;
}

function validationError(res, message) {
  return res.status(400).json({ error: message });
}

async function requireAuth(req, res, next) {
  if (req.path === "/auth/login" || req.path === "/auth/register") return next();
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Autenticação necessária." });

  const session = await db.get(
    `SELECT users.* FROM sessions
     INNER JOIN users ON users.id = sessions.userId
     WHERE sessions.tokenHash = ? AND sessions.expiresAt > ? AND users.active = 1`,
    hashToken(token),
    new Date().toISOString(),
  );
  if (!session) return res.status(401).json({ error: "Sessão inválida ou expirada." });
  req.user = session;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acesso permitido somente para administradores." });
  next();
}

app.use("/api", requireAuth);

app.post("/api/auth/register", async (req, res) => {
  return res.status(403).json({ error: "O cadastro de usuários é realizado pelo administrador." });

  const missing = requireFields(req.body, ["fullName", "email", "username", "password"]);
  if (missing.length) return validationError(res, `Campos obrigatórios ausentes: ${missing.join(", ")}`);
  if (String(req.body.password).length < 8) return validationError(res, "A senha deve ter pelo menos 8 caracteres.");

  const email = String(req.body.email).trim().toLowerCase();
  const username = String(req.body.username).trim();
  const existing = await db.get("SELECT id FROM users WHERE email = ? OR username = ?", email, username);
  if (existing) return res.status(409).json({ error: "E-mail ou usuário já cadastrado." });

  const user = {
    id: createId(),
    fullName: String(req.body.fullName).trim(),
    email,
    username,
    passwordHash: hashPassword(String(req.body.password)),
    role: "consultor",
    permissions: JSON.stringify({}),
    active: 1,
    createdAt: new Date().toISOString(),
  };

  await db.run(
    `INSERT INTO users (id, fullName, email, username, passwordHash, role, permissions, active, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    user.id,
    user.fullName,
    user.email,
    user.username,
    user.passwordHash,
    user.role,
    user.permissions,
    user.active,
    user.createdAt,
  );

  const session = await createSession(user.id);
  res.status(201).json({ user: publicUser(user), token: session.token, expiresAt: session.expiresAt });
});

app.post("/api/auth/login", async (req, res) => {
  const missing = requireFields(req.body, ["username", "password"]);
  if (missing.length) return validationError(res, `Campos obrigatórios ausentes: ${missing.join(", ")}`);

  const login = String(req.body.username).trim();
  const user = await db.get("SELECT * FROM users WHERE username = ? OR email = ?", login, login.toLowerCase());
  if (!user || !user.active || !verifyPassword(String(req.body.password), user.passwordHash)) {
    return res.status(401).json({ error: "Usuário ou senha inválidos." });
  }

  const session = await createSession(user.id);
  res.json({ user: publicUser(user), token: session.token, expiresAt: session.expiresAt });
});

app.get("/api/users", requireAdmin, async (_req, res) => {
  const users = await db.all("SELECT * FROM users ORDER BY createdAt DESC");
  res.json(users.map(publicUser));
});

app.post("/api/users", requireAdmin, async (req, res) => {
  const missing = requireFields(req.body, ["fullName", "email", "username", "password", "role"]);
  if (missing.length) return validationError(res, `Campos obrigatórios ausentes: ${missing.join(", ")}`);
  if (!userRoles.includes(req.body.role)) return validationError(res, "Perfil de usuário inválido.");
  if (String(req.body.password).length < 8) return validationError(res, "A senha deve ter pelo menos 8 caracteres.");

  const email = String(req.body.email).trim().toLowerCase();
  const username = String(req.body.username).trim();
  const existing = await db.get("SELECT id FROM users WHERE email = ? OR username = ?", email, username);
  if (existing) return res.status(409).json({ error: "E-mail ou usuário já cadastrado." });

  const user = {
    id: createId(),
    fullName: String(req.body.fullName).trim(),
    email,
    username,
    passwordHash: hashPassword(String(req.body.password)),
    role: req.body.role,
    permissions: JSON.stringify(normalizePermissions(req.body.role, req.body.permissions)),
    active: req.body.active === false ? 0 : 1,
    createdAt: new Date().toISOString(),
  };
  await db.run(
    `INSERT INTO users (id, fullName, email, username, passwordHash, role, permissions, active, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    user.id, user.fullName, user.email, user.username, user.passwordHash, user.role, user.permissions, user.active, user.createdAt,
  );
  res.status(201).json(publicUser(user));
});

app.put("/api/users/:id", requireAdmin, async (req, res) => {
  const existing = await db.get("SELECT * FROM users WHERE id = ?", req.params.id);
  if (!existing) return res.status(404).json({ error: "Usuário não encontrado." });
  if (req.params.id === req.user.id && req.body.active === false) return validationError(res, "O administrador não pode desativar a própria conta.");
  const role = req.body.role || existing.role;
  if (!userRoles.includes(role)) return validationError(res, "Perfil de usuário inválido.");
  const user = {
    ...existing,
    ...req.body,
    id: existing.id,
    email: String(req.body.email || existing.email).trim().toLowerCase(),
    username: String(req.body.username || existing.username).trim(),
    role,
    permissions: JSON.stringify(normalizePermissions(role, req.body.permissions || JSON.parse(existing.permissions || "{}"))),
    active: req.body.active === undefined ? existing.active : (req.body.active ? 1 : 0),
  };
  const passwordHash = req.body.password ? hashPassword(String(req.body.password)) : existing.passwordHash;
  await db.run(
    `UPDATE users SET fullName = ?, email = ?, username = ?, passwordHash = ?, role = ?, permissions = ?, active = ? WHERE id = ?`,
    user.fullName, user.email, user.username, passwordHash, user.role, user.permissions, user.active, user.id,
  );
  res.json(publicUser({ ...user, passwordHash }));
});

app.delete("/api/users/:id", requireAdmin, async (req, res) => {
  if (req.params.id === req.user.id) return validationError(res, "O administrador não pode excluir a própria conta.");
  await db.run("DELETE FROM users WHERE id = ?", req.params.id);
  res.json({ success: true });
});

app.get("/api/clients", async (_req, res) => {
  const clients = await db.all("SELECT * FROM clients ORDER BY createdAt DESC");
  res.json(clients);
});

app.post("/api/clients", async (req, res) => {
  const missing = requireFields(req.body, ["name", "document", "address", "manager", "phone", "email"]);
  if (missing.length) return validationError(res, `Campos obrigatórios ausentes: ${missing.join(", ")}`);
  const client = { ...req.body, id: req.body.id || createId(), createdAt: req.body.createdAt || new Date().toISOString() };
  await db.run(
    `INSERT OR REPLACE INTO clients (id, name, document, address, manager, phone, email, notes, administrator, gateType, outsourcedGateCompany, condominiumProfile, towerCount, unitCount, gateCount, hasGenerator, hasElevator, elevatorCount, frontageMeters, lengthMeters, vehicleEntryCount, hasVehicleEclusa, hasBasement, basementCount, pedestrianEntryFormat, hasPedestrianEclusa, towerWoodDoorAccessCount, towerGlassDoorAccessCount, electricFenceStatus, electricFenceMeters, ivaSensorStatus, ivaSensorCount, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    client.id,
    client.name,
    client.document,
    client.address,
    client.manager,
    client.phone,
    client.email,
    client.notes,
    client.administrator, client.gateType, client.outsourcedGateCompany, client.condominiumProfile,
    client.towerCount, client.unitCount, client.gateCount, client.hasGenerator, client.hasElevator, client.elevatorCount,
    client.frontageMeters, client.lengthMeters, client.vehicleEntryCount, client.hasVehicleEclusa, client.hasBasement, client.basementCount,
    client.pedestrianEntryFormat, client.hasPedestrianEclusa, client.towerWoodDoorAccessCount, client.towerGlassDoorAccessCount,
    client.electricFenceStatus, client.electricFenceMeters, client.ivaSensorStatus, client.ivaSensorCount,
    client.createdAt,
  );
  res.json(client);
});

app.put("/api/clients/:id", async (req, res) => {
  const missing = requireFields(req.body, ["name", "document", "address", "manager", "phone", "email"]);
  if (missing.length) return validationError(res, `Campos obrigatórios ausentes: ${missing.join(", ")}`);
  const id = req.params.id;
  const client = { ...req.body, id, createdAt: req.body.createdAt || new Date().toISOString() };
  await db.run(
    `UPDATE clients SET name = ?, document = ?, address = ?, manager = ?, phone = ?, email = ?, notes = ?, administrator = ?, gateType = ?, outsourcedGateCompany = ?, condominiumProfile = ?, towerCount = ?, unitCount = ?, gateCount = ?, hasGenerator = ?, hasElevator = ?, elevatorCount = ?, frontageMeters = ?, lengthMeters = ?, vehicleEntryCount = ?, hasVehicleEclusa = ?, hasBasement = ?, basementCount = ?, pedestrianEntryFormat = ?, hasPedestrianEclusa = ?, towerWoodDoorAccessCount = ?, towerGlassDoorAccessCount = ?, electricFenceStatus = ?, electricFenceMeters = ?, ivaSensorStatus = ?, ivaSensorCount = ?, createdAt = ? WHERE id = ?`,
    client.name,
    client.document,
    client.address,
    client.manager,
    client.phone,
    client.email,
    client.notes,
    client.administrator, client.gateType, client.outsourcedGateCompany, client.condominiumProfile,
    client.towerCount, client.unitCount, client.gateCount, client.hasGenerator, client.hasElevator, client.elevatorCount,
    client.frontageMeters, client.lengthMeters, client.vehicleEntryCount, client.hasVehicleEclusa, client.hasBasement, client.basementCount,
    client.pedestrianEntryFormat, client.hasPedestrianEclusa, client.towerWoodDoorAccessCount, client.towerGlassDoorAccessCount,
    client.electricFenceStatus, client.electricFenceMeters, client.ivaSensorStatus, client.ivaSensorCount,
    client.createdAt,
    id,
  );
  res.json(client);
});

app.delete("/api/clients/:id", async (req, res) => {
  await db.run("DELETE FROM clients WHERE id = ?", req.params.id);
  res.json({ success: true });
});

app.get("/api/equipments", async (_req, res) => {
  const equipments = await db.all("SELECT * FROM equipments ORDER BY createdAt DESC");
  res.json(equipments);
});

app.post("/api/equipments", async (req, res) => {
  const missing = requireFields(req.body, ["name", "brand", "model", "location"]);
  if (missing.length) return validationError(res, `Campos obrigatórios ausentes: ${missing.join(", ")}`);
  if (invalidNumber(req.body.quantity, 1)) return validationError(res, "A quantidade do equipamento deve ser maior que zero.");
  const equipment = { ...req.body, id: req.body.id || createId(), createdAt: req.body.createdAt || new Date().toISOString() };
  await db.run(
    `INSERT OR REPLACE INTO equipments (id, name, type, brand, model, technicalDescription, quantity, location, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    equipment.id,
    equipment.name,
    equipment.type,
    equipment.brand,
    equipment.model,
    equipment.technicalDescription,
    equipment.quantity,
    equipment.location,
    equipment.createdAt,
  );
  res.json(equipment);
});

app.put("/api/equipments/:id", async (req, res) => {
  const missing = requireFields(req.body, ["name", "brand", "model", "location"]);
  if (missing.length) return validationError(res, `Campos obrigatórios ausentes: ${missing.join(", ")}`);
  if (invalidNumber(req.body.quantity, 1)) return validationError(res, "A quantidade do equipamento deve ser maior que zero.");
  const id = req.params.id;
  const equipment = { ...req.body, id, createdAt: req.body.createdAt || new Date().toISOString() };
  await db.run(
    `UPDATE equipments SET name = ?, type = ?, brand = ?, model = ?, technicalDescription = ?, quantity = ?, location = ?, createdAt = ? WHERE id = ?`,
    equipment.name,
    equipment.type,
    equipment.brand,
    equipment.model,
    equipment.technicalDescription,
    equipment.quantity,
    equipment.location,
    equipment.createdAt,
    id,
  );
  res.json(equipment);
});

app.delete("/api/equipments/:id", async (req, res) => {
  await db.run("DELETE FROM equipments WHERE id = ?", req.params.id);
  res.json({ success: true });
});

app.get("/api/laborRates", async (_req, res) => {
  const laborRates = await db.all("SELECT * FROM laborRates ORDER BY createdAt DESC");
  res.json(laborRates);
});

app.post("/api/laborRates", async (req, res) => {
  const missing = requireFields(req.body, ["serviceType", "estimatedTime"]);
  if (missing.length) return validationError(res, `Campos obrigatórios ausentes: ${missing.join(", ")}`);
  if (invalidNumber(req.body.unitPrice, 0.01)) return validationError(res, "O valor unitário deve ser maior que zero.");
  const rate = { ...req.body, id: req.body.id || createId(), createdAt: req.body.createdAt || new Date().toISOString() };
  await db.run(
    `INSERT OR REPLACE INTO laborRates (id, serviceType, unitPrice, estimatedTime, description, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
    rate.id,
    rate.serviceType,
    rate.unitPrice,
    rate.estimatedTime,
    rate.description,
    rate.createdAt,
  );
  res.json(rate);
});

app.put("/api/laborRates/:id", async (req, res) => {
  const missing = requireFields(req.body, ["serviceType", "estimatedTime"]);
  if (missing.length) return validationError(res, `Campos obrigatórios ausentes: ${missing.join(", ")}`);
  if (invalidNumber(req.body.unitPrice, 0.01)) return validationError(res, "O valor unitário deve ser maior que zero.");
  const id = req.params.id;
  const rate = { ...req.body, id, createdAt: req.body.createdAt || new Date().toISOString() };
  await db.run(
    `UPDATE laborRates SET serviceType = ?, unitPrice = ?, estimatedTime = ?, description = ?, createdAt = ? WHERE id = ?`,
    rate.serviceType,
    rate.unitPrice,
    rate.estimatedTime,
    rate.description,
    rate.createdAt,
    id,
  );
  res.json(rate);
});

app.delete("/api/laborRates/:id", async (req, res) => {
  await db.run("DELETE FROM laborRates WHERE id = ?", req.params.id);
  res.json({ success: true });
});

app.get("/api/inspections", async (_req, res) => {
  const inspections = await db.all("SELECT * FROM inspections ORDER BY createdAt DESC");
  const parsed = inspections.map((item) => ({ ...item, items: parseJsonField(item.items) }));
  res.json(parsed);
});

app.post("/api/inspections", async (req, res) => {
  const missing = requireFields(req.body, ["clientId", "date", "type", "status"]);
  if (missing.length) return validationError(res, `Campos obrigatórios ausentes: ${missing.join(", ")}`);
  if (!Array.isArray(req.body.items) || req.body.items.length === 0) return validationError(res, "A vistoria deve conter pelo menos um item.");
  const inspection = { ...req.body, id: req.body.id || createId(), createdAt: req.body.createdAt || new Date().toISOString(), items: JSON.stringify(req.body.items || []) };
  await db.run(
    `INSERT OR REPLACE INTO inspections (id, clientId, clientName, date, type, status, summary, notes, totalCost, totalTime, createdAt, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    inspection.id,
    inspection.clientId,
    inspection.clientName,
    inspection.date,
    inspection.type,
    inspection.status,
    inspection.summary,
    inspection.notes,
    inspection.totalCost,
    inspection.totalTime,
    inspection.createdAt,
    inspection.items,
  );
  res.json({ ...inspection, items: JSON.parse(inspection.items) });
});

app.put("/api/inspections/:id", async (req, res) => {
  const missing = requireFields(req.body, ["clientId", "date", "type", "status"]);
  if (missing.length) return validationError(res, `Campos obrigatórios ausentes: ${missing.join(", ")}`);
  if (!Array.isArray(req.body.items) || req.body.items.length === 0) return validationError(res, "A vistoria deve conter pelo menos um item.");
  const id = req.params.id;
  const inspection = { ...req.body, id, createdAt: req.body.createdAt || new Date().toISOString(), items: JSON.stringify(req.body.items || []) };
  await db.run(
    `UPDATE inspections SET clientId = ?, clientName = ?, date = ?, type = ?, status = ?, summary = ?, notes = ?, totalCost = ?, totalTime = ?, createdAt = ?, items = ? WHERE id = ?`,
    inspection.clientId,
    inspection.clientName,
    inspection.date,
    inspection.type,
    inspection.status,
    inspection.summary,
    inspection.notes,
    inspection.totalCost,
    inspection.totalTime,
    inspection.createdAt,
    inspection.items,
    id,
  );
  res.json({ ...inspection, items: JSON.parse(inspection.items) });
});

app.delete("/api/inspections/:id", async (req, res) => {
  await db.run("DELETE FROM inspections WHERE id = ?", req.params.id);
  res.json({ success: true });
});

app.get("/api/appointments", async (_req, res) => {
  const appointments = await db.all("SELECT * FROM appointments ORDER BY date ASC, time ASC");
  res.json(appointments);
});

app.post("/api/appointments", async (req, res) => {
  const missing = requireFields(req.body, ["clientId", "date", "time", "type"]);
  if (missing.length) return validationError(res, `Campos obrigatórios ausentes: ${missing.join(", ")}`);
  const appointment = { ...req.body, id: req.body.id || createId(), createdAt: req.body.createdAt || new Date().toISOString() };
  await db.run(
    `INSERT OR REPLACE INTO appointments (id, clientId, clientName, date, time, type, technician, status, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    appointment.id,
    appointment.clientId,
    appointment.clientName,
    appointment.date,
    appointment.time,
    appointment.type,
    appointment.technician,
    appointment.status,
    appointment.notes,
    appointment.createdAt,
  );
  res.json(appointment);
});

app.put("/api/appointments/:id", async (req, res) => {
  const missing = requireFields(req.body, ["clientId", "date", "time", "type"]);
  if (missing.length) return validationError(res, `Campos obrigatórios ausentes: ${missing.join(", ")}`);
  const id = req.params.id;
  const appointment = { ...req.body, id, createdAt: req.body.createdAt || new Date().toISOString() };
  await db.run(
    `UPDATE appointments SET clientId = ?, clientName = ?, date = ?, time = ?, type = ?, technician = ?, status = ?, notes = ?, createdAt = ? WHERE id = ?`,
    appointment.clientId,
    appointment.clientName,
    appointment.date,
    appointment.time,
    appointment.type,
    appointment.technician,
    appointment.status,
    appointment.notes,
    appointment.createdAt,
    id,
  );
  res.json(appointment);
});

app.delete("/api/appointments/:id", async (req, res) => {
  await db.run("DELETE FROM appointments WHERE id = ?", req.params.id);
  res.json({ success: true });
});

app.listen(port, async () => {
  await initDb();
  console.log(`Backend SQLite iniciado em http://localhost:${port}`);
});

// Converte falhas de parsing e outras excecoes em respostas JSON legiveis.
app.use((err, req, res, next) => {
  console.error('EXPRESS ERROR:', err && err.stack ? err.stack : err);
  res.status(err.status || 500).json({ error: err.message || 'server error' });
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT ERROR', err && err.stack ? err.stack : err);
});
