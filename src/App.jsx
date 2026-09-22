import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Camera,
  ClipboardCheck,
  CalendarDays,
  DollarSign,
  FileText,
  FolderDown,
  Home,
  ListChecks,
  LogOut,
  Menu,
  Moon,
  Pencil,
  PlusCircle,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  Users,
  Wifi,
  WifiOff,
  CheckCircle2,
  X,
  Settings,
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Toast } from "@/components/Toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserSettings } from "@/components/UserSettings";
import * as api from "@/services/api";

const statusOptions = [
  { value: "ok", label: "OK" },
  { value: "manutencao", label: "Manutenção" },
  { value: "substituicao", label: "Substituição" },
  { value: "avaliacao", label: "Avaliação" },
];

const equipmentTypes = ["Câmera", "CFTV", "Controle de acesso", "Interfone", "Sensor", "Nobreak", "Roteador", "Cabo", "Outros"];
const inspectionTypes = ["Portaria Remota", "Controle Acesso", "Interfonia", "Proteção Perimetral", "Monitoramento 24 Horas"];
const AUTH_SESSION_KEY = "vistoria_auth_session";

const defaultClient = {
  id: "",
  name: "",
  document: "",
  address: "",
  manager: "",
  phone: "",
  email: "",
  notes: "",
  administrator: "",
  gateType: "",
  outsourcedGateCompany: "",
  condominiumProfile: "",
  towerCount: 0,
  unitCount: 0,
  gateCount: 0,
  hasGenerator: "",
  hasElevator: "",
  elevatorCount: 0,
  frontageMeters: 0,
  lengthMeters: 0,
  vehicleEntryCount: 0,
  hasVehicleEclusa: "",
  hasBasement: "",
  basementCount: 0,
  pedestrianEntryFormat: "",
  hasPedestrianEclusa: "",
  towerWoodDoorAccessCount: 0,
  towerGlassDoorAccessCount: 0,
  electricFenceStatus: "",
  electricFenceMeters: 0,
  ivaSensorStatus: "",
  ivaSensorCount: 0,
};

const defaultEquipment = {
  id: "",
  name: "",
  type: "Câmera",
  brand: "",
  model: "",
  technicalDescription: "",
  quantity: 1,
  location: "",
};

const defaultLaborRate = {
  id: "",
  serviceType: "Instalação de câmera",
  unitPrice: "",
  estimatedTime: "",
  description: "",
};

const defaultInspectionItem = {
  id: "",
  equipmentName: "",
  type: "Câmera",
  status: "ok",
  observations: "",
  serviceType: "Instalação de câmera",
  quantity: 1,
  unitPrice: 0,
  estimatedTime: "0h",
  serviceSuggestion: "",
  photos: [],
};

const defaultInspection = {
  id: "",
  appointmentId: "",
  clientId: "",
  clientName: "",
  date: new Date().toISOString().slice(0, 10),
  type: "",
  status: "Em análise",
  summary: "",
  items: [],
  notes: "",
  createdAt: new Date().toISOString(),
};

const defaultAppointment = {
  id: "",
  clientId: "",
  clientName: "",
  date: new Date().toISOString().slice(0, 10),
  time: "08:00",
  type: "Preventiva",
  technician: "",
  status: "Pendente",
  notes: "",
};

// Formata valores monetarios no padrao usado nos cards, listas e relatorios.
function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function createId() {
  return crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isEmailValid(email) {
  return /\S+@\S+\.\S+/.test(email);
}

function isPhoneValid(phone) {
  return phone.trim().length >= 8;
}

function showToastMessage(setToast, title, message, type = "success") {
  setToast({ id: createId(), title, message, type });
}

function createPhotoFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a foto."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Não foi possível processar a foto."));
      image.onload = () => {
        const maxSize = 1600;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve({ id: createId(), name: file.name, url: canvas.toDataURL("image/jpeg", 0.82), date: new Date().toLocaleDateString("pt-BR") });
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function normalizeInspection(inspection) {
  let items = inspection?.items;
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch {
      items = [];
    }
  }
  if (!Array.isArray(items)) items = [];
  return {
    ...inspection,
    items: items.map((item) => ({ ...item, photos: Array.isArray(item.photos) ? item.photos : [] })),
  };
}

function normalizeAppointment(appointment) {
  if (!appointment) return appointment;
  return {
    ...appointment,
    status: appointment.status === "Agendada" || appointment.status === "Confirmada" ? "Pendente" : (appointment.status || "Pendente"),
  };
}

const clientControlClass = "mt-2 w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100";

function ClientTextField({ label, value, onChange, type = "text", min = undefined, step = undefined, className = "" }) {
  return <label className={`space-y-2 ${className}`}><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span><input type={type} min={min} step={step} value={value ?? ""} onChange={onChange} className={clientControlClass} /></label>;
}

function ClientSelectField({ label, value, onChange, options, className = "" }) {
  return <label className={`space-y-2 ${className}`}><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span><select value={value ?? ""} onChange={onChange} className={clientControlClass}><option value="">Selecione</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function ClientFormFields({ clientForm, setClientForm }) {
  const update = (field) => (event) => setClientForm((previous) => ({ ...previous, [field]: event.target.value }));
  return <div className="grid gap-4 md:grid-cols-2">
    <ClientTextField label="Nome do condomínio" value={clientForm.name} onChange={update("name")} />
    <ClientTextField label="CNPJ / CPF" value={clientForm.document} onChange={update("document")} />
    <ClientTextField label="Endereço completo" value={clientForm.address} onChange={update("address")} className="md:col-span-2" />
    <ClientTextField label="Responsável" value={clientForm.manager} onChange={update("manager")} />
    <ClientTextField label="Telefone" value={clientForm.phone} onChange={update("phone")} />
    <ClientTextField label="E-mail" type="email" value={clientForm.email} onChange={update("email")} />
    <ClientTextField label="Administradora" value={clientForm.administrator} onChange={update("administrator")} />
    <ClientSelectField label="Tipo de portaria" value={clientForm.gateType} onChange={update("gateType")} options={["Portaria Remota", "Portaria Orgânica", "Portaria Terceirizada"]} />
    {clientForm.gateType === "Portaria Terceirizada" && <ClientTextField label="Empresa terceirizada" value={clientForm.outsourcedGateCompany} onChange={update("outsourcedGateCompany")} />}
    <ClientSelectField label="Perfil do condomínio" value={clientForm.condominiumProfile} onChange={update("condominiumProfile")} options={["Residencial", "Comercial", "Residencial e Comercial", "Industrial", "Residência Casas"]} />
    <ClientTextField label="Número de torres" type="number" min="0" value={clientForm.towerCount} onChange={update("towerCount")} />
    <ClientTextField label="Quantidade de apartamentos ou casas" type="number" min="0" value={clientForm.unitCount} onChange={update("unitCount")} />
    <ClientTextField label="Quantidade de portarias" type="number" min="0" value={clientForm.gateCount} onChange={update("gateCount")} />
    <ClientSelectField label="Possui gerador?" value={clientForm.hasGenerator} onChange={update("hasGenerator")} options={["Sim", "Não"]} />
    <ClientSelectField label="Possui elevador?" value={clientForm.hasElevator} onChange={update("hasElevator")} options={["Sim", "Não"]} />
    {clientForm.hasElevator === "Sim" && <ClientTextField label="Quantidade de elevadores" type="number" min="1" value={clientForm.elevatorCount} onChange={update("elevatorCount")} />}
    <ClientTextField label="Metragem da frente (m)" type="number" min="0" step="0.01" value={clientForm.frontageMeters} onChange={update("frontageMeters")} />
    <ClientTextField label="Metragem de comprimento (m)" type="number" min="0" step="0.01" value={clientForm.lengthMeters} onChange={update("lengthMeters")} />
    <ClientTextField label="Quantidade de entradas de veículos" type="number" min="0" value={clientForm.vehicleEntryCount} onChange={update("vehicleEntryCount")} />
    <ClientSelectField label="Possui eclusa de veículos?" value={clientForm.hasVehicleEclusa} onChange={update("hasVehicleEclusa")} options={["Sim", "Não"]} />
    <ClientSelectField label="Possui subsolo?" value={clientForm.hasBasement} onChange={update("hasBasement")} options={["Sim", "Não"]} />
    {clientForm.hasBasement === "Sim" && <ClientTextField label="Quantidade de subsolos" type="number" min="1" value={clientForm.basementCount} onChange={update("basementCount")} />}
    <ClientSelectField label="Formato entrada pedestre" value={clientForm.pedestrianEntryFormat} onChange={update("pedestrianEntryFormat")} options={["Social e Serviço Separadas", "Social e Serviço juntas"]} />
    <ClientSelectField label="Possui eclusa entrada pedestre?" value={clientForm.hasPedestrianEclusa} onChange={update("hasPedestrianEclusa")} options={["Sim", "Não"]} />
    <ClientTextField label="Acessos à torre (porta madeira)" type="number" min="0" value={clientForm.towerWoodDoorAccessCount} onChange={update("towerWoodDoorAccessCount")} />
    <ClientTextField label="Acessos à torre (porta vidro)" type="number" min="0" value={clientForm.towerGlassDoorAccessCount} onChange={update("towerGlassDoorAccessCount")} />
    <ClientSelectField label="Possui cerca elétrica?" value={clientForm.electricFenceStatus} onChange={update("electricFenceStatus")} options={["Não precisa de Cerca", "Sim", "Não"]} />
    {clientForm.electricFenceStatus === "Não" && <ClientTextField label="Metragem da cerca elétrica (m)" type="number" min="0" step="0.01" value={clientForm.electricFenceMeters} onChange={update("electricFenceMeters")} />}
    <ClientSelectField label="Possui sensores IVA?" value={clientForm.ivaSensorStatus} onChange={update("ivaSensorStatus")} options={["Não precisa Sensores", "Sim", "Não"]} />
    {clientForm.ivaSensorStatus === "Não" && <ClientTextField label="Quantidade de sensores IVA" type="number" min="1" value={clientForm.ivaSensorCount} onChange={update("ivaSensorCount")} />}
    <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Observações</span><textarea value={clientForm.notes} onChange={update("notes")} rows={4} className={clientControlClass} /></label>
  </div>;
}

export default function App() {
  // App concentra o estado da SPA: autenticacao, dados carregados, navegacao e modais.
  const [activePage, setActivePage] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [managedUsers, setManagedUsers] = useState([]);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isPwaInstallAvailable, setIsPwaInstallAvailable] = useState(false);
  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [laborRates, setLaborRates] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [clientFilter, setClientFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [laborFilter, setLaborFilter] = useState("");
  const [inspectionFilter, setInspectionFilter] = useState("");
  const [inspectionStatusFilter, setInspectionStatusFilter] = useState("");
  const [reportClientFilter, setReportClientFilter] = useState("");
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [laborModalOpen, setLaborModalOpen] = useState(false);
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);

  const [editingClient, setEditingClient] = useState(null);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [editingLabor, setEditingLabor] = useState(null);
  const [editingInspection, setEditingInspection] = useState(null);
  const [linkedAppointmentId, setLinkedAppointmentId] = useState("");
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [inspectionClientAppointment, setInspectionClientAppointment] = useState(null);

  const [clientForm, setClientForm] = useState(defaultClient);
  const [equipmentForm, setEquipmentForm] = useState(defaultEquipment);
  const [laborForm, setLaborForm] = useState(defaultLaborRate);
  const [inspectionDraft, setInspectionDraft] = useState(defaultInspection);
  const [appointmentDraft, setAppointmentDraft] = useState(defaultAppointment);
  const [itemDraft, setItemDraft] = useState(defaultInspectionItem);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const importInputRef = useRef(null);

  const filteredClients = useMemo(() => {
    return clients.filter((item) => `${item.name} ${item.document} ${item.manager}`.toLowerCase().includes(clientFilter.toLowerCase()));
  }, [clients, clientFilter]);

  const filteredEquipments = useMemo(() => {
    return equipments.filter((item) => `${item.name} ${item.type} ${item.brand} ${item.model}`.toLowerCase().includes(equipmentFilter.toLowerCase()));
  }, [equipments, equipmentFilter]);

  const filteredLabor = useMemo(() => {
    return laborRates.filter((item) => `${item.serviceType} ${item.description}`.toLowerCase().includes(laborFilter.toLowerCase()));
  }, [laborRates, laborFilter]);

  const filteredInspections = useMemo(() => {
    return inspections.filter((item) => {
      const searchText = `${item.clientName} ${item.type} ${item.status}`.toLowerCase();
      const matchesText = searchText.includes(inspectionFilter.toLowerCase());
      const matchesStatus = inspectionStatusFilter ? item.status === inspectionStatusFilter : true;
      return matchesText && matchesStatus;
    });
  }, [inspections, inspectionFilter, inspectionStatusFilter]);

  const reportInspections = useMemo(() => {
    return inspections.filter((item) => {
      const matchClient = reportClientFilter ? item.clientId === reportClientFilter : true;
      const matchFrom = reportDateFrom ? item.date >= reportDateFrom : true;
      const matchTo = reportDateTo ? item.date <= reportDateTo : true;
      return matchClient && matchFrom && matchTo;
    });
  }, [inspections, reportClientFilter, reportDateFrom, reportDateTo]);

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((item) => item.status !== "Cancelada")
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [appointments]);

  const pendingAppointments = useMemo(() => {
    return appointments
      .filter((item) => item.status === "Pendente")
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [appointments]);

  const inspectionTotals = useMemo(() => {
    // Totais derivados evitam duplicar valores calculados no formulario de vistoria.
    const totalCost = inspectionDraft.items.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 1), 0);
    const totalTime = inspectionDraft.items.reduce((sum, item) => {
      const time = Number(String(item.estimatedTime || "0").replace(/[^0-9.]/g, ""));
      return sum + (Number.isFinite(time) ? time : 0);
    }, 0);
    return { totalCost, totalTime };
  }, [inspectionDraft.items]);

  const inspectionStats = useMemo(() => {
    const items = inspections.flatMap((inspection) => inspection.items || []);
    return {
      attentionItems: items.filter((item) => item.status === "manutencao" || item.status === "avaliacao").length,
      replacementItems: items.filter((item) => item.status === "substituicao").length,
      totalPhotos: items.reduce((total, item) => total + (item.photos || []).length, 0),
    };
  }, [inspections]);

  function loadStoredUsers() {
    try {
      const raw = localStorage.getItem("vistoria_users");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function promptPwaInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === "accepted") {
        console.log("Usuário aceitou a instalação do PWA.");
      } else {
        console.log("Usuário recusou a instalação do PWA.");
      }
      setDeferredPrompt(null);
      setIsPwaInstallAvailable(false);
    });
  }

  function saveStoredUsers(data) {
    localStorage.setItem("vistoria_users", JSON.stringify(data));
  }

  useEffect(() => {
    // Restaura preferencias e sessao e captura o evento de instalacao do PWA.
    const storedTheme = localStorage.getItem("vistoria_dark_mode");
    const isDark = storedTheme === "true";
    setDarkMode(isDark);

    const storedUser = localStorage.getItem("vistoria_user");
    const storedSession = localStorage.getItem(AUTH_SESSION_KEY);
    const storedUsers = loadStoredUsers();
    setUsers(storedUsers);
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        setCurrentUser(session.user || null);
        setUserName(session.user?.fullName || session.user?.username || "");
        setIsAuthenticated(Boolean(session.user));
      } catch {
        localStorage.removeItem(AUTH_SESSION_KEY);
      }
    } else if (storedUser) {
      setCurrentUser(null);
      setUserName(storedUser);
      setIsAuthenticated(true);
    }

    const beforeInstallPromptHandler = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setIsPwaInstallAvailable(true);
    };

    window.addEventListener("beforeinstallprompt", beforeInstallPromptHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstallPromptHandler);
    };
  }, []);

  useEffect(() => {
    // Persiste somente a preferencia visual; os registros passam pela camada de API.
    localStorage.setItem("vistoria_dark_mode", darkMode ? "true" : "false");
    document.documentElement.classList.toggle("dark", darkMode);
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  function toggleDarkMode() {
    setDarkMode((current) => !current);
  }

  function logout() {
    localStorage.removeItem("vistoria_user");
    localStorage.removeItem(AUTH_SESSION_KEY);
    setIsAuthenticated(false);
    setUserName("");
    setCurrentUser(null);
    setLoginForm({ username: "", password: "" });
    setLoginError("");
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    if (!loginForm.username.trim() || !loginForm.password.trim()) {
      setLoginError("Informe usuário e senha para continuar.");
      return;
    }
    try {
      const result = await api.loginUser(loginForm);
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(result));
      localStorage.removeItem("vistoria_user");
      setCurrentUser(result.user);
      setUserName(result.user.fullName || result.user.username);
      setIsAuthenticated(true);
      setLoginError("");
    } catch (error) {
      setLoginError(error.message || "Usuário ou senha inválidos.");
      return;
    }
  }

  useEffect(() => {
    // Carrega os recursos principais em paralelo para reduzir o tempo de abertura.
    if (!isAuthenticated) return;

    async function loadData() {
      const [clientsData, equipmentsData, laborData, inspectionsData, appointmentsData] = await Promise.all([
        api.getClients(),
        api.getEquipments(),
        api.getLaborRates(),
        api.getInspections(),
        api.getAppointments(),
      ]);

      setClients(clientsData.length ? clientsData : [
        { id: createId(), name: "Residencial Jardim Paulista", document: "12.345.678/0001-91", address: "Rua das Flores, 123 - São Paulo", manager: "Carlos Almeida", phone: "(11) 98888-0000", email: "sindico@jardimp.com.br", notes: "Monitoramento CFTV e controle de acesso" },
      ]);

      setEquipments(equipmentsData.length ? equipmentsData : [
        { id: createId(), name: "Câmera dome 4K", type: "Câmera", brand: "Hikvision", model: "DH-IPC-HDW2431", technicalDescription: "Visão noturna e WDR", quantity: 12, location: "Entrada social" },
      ]);

      setLaborRates(laborData.length ? laborData : [
        { id: createId(), serviceType: "Instalação de câmera", unitPrice: 320, estimatedTime: "1.5h", description: "Instalação e ajuste de imagem" },
        { id: createId(), serviceType: "Configuração de CFTV", unitPrice: 420, estimatedTime: "2h", description: "Programação de gravação e acesso remoto" },
      ]);

      setInspections(inspectionsData.length ? inspectionsData.map(normalizeInspection) : []);
      setAppointments((appointmentsData || []).map(normalizeAppointment));
    }
    loadData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || currentUser?.role !== "admin") return;
    api.getUsers().then(setManagedUsers).catch((error) => {
      showToastMessage(setToast, "Configurações", error.message || "Não foi possível carregar os usuários.", "error");
    });
  }, [isAuthenticated, currentUser?.role]);

  async function saveManagedUser(user) {
    const saved = await api.saveUser(user);
    setManagedUsers((previous) => {
      const exists = previous.some((item) => item.id === saved.id);
      return exists ? previous.map((item) => item.id === saved.id ? saved : item) : [saved, ...previous];
    });
    showToastMessage(setToast, "Usuário salvo", `${saved.fullName} foi atualizado com sucesso.`);
  }

  async function deleteManagedUser(user) {
    if (!window.confirm(`Excluir o usuário ${user.fullName}?`)) return;
    await api.deleteUser(user.id);
    setManagedUsers((previous) => previous.filter((item) => item.id !== user.id));
    showToastMessage(setToast, "Usuário excluído", `${user.fullName} foi removido.`);
  }

  useEffect(() => {
    if (!toast) return;
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 3200);
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
    };
  }, [toast]);

  async function persistClient(payload) {
    try {
      const saved = await api.saveClient(payload);
      setClients((prev) => {
        const exists = prev.some((item) => item.id === saved.id);
        return exists ? prev.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...prev];
      });
      showToastMessage(setToast, "Cliente salvo", "Os dados do cliente foram atualizados com sucesso.");
      return saved;
    } catch (error) {
      console.error('persistClient error', error);
      showToastMessage(setToast, "Erro", "Não foi possível salvar o cliente.", "error");
      throw error;
    }
  }

  async function persistEquipment(payload) {
    try {
      const saved = await api.saveEquipment(payload);
      setEquipments((prev) => {
        const exists = prev.some((item) => item.id === saved.id);
        return exists ? prev.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...prev];
      });
      showToastMessage(setToast, "Equipamento salvo", "Equipamento registrado com sucesso.");
      return saved;
    } catch (error) {
      console.error('persistEquipment error', error);
      showToastMessage(setToast, "Erro", "Não foi possível salvar o equipamento.", "error");
      throw error;
    }
  }

  async function persistLabor(payload) {
    try {
      const saved = await api.saveLaborRate(payload);
      setLaborRates((prev) => {
        const exists = prev.some((item) => item.id === saved.id);
        return exists ? prev.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...prev];
      });
      showToastMessage(setToast, "Valor salvo", "Tabela de mão de obra atualizada.");
      return saved;
    } catch (error) {
      console.error('persistLabor error', error);
      showToastMessage(setToast, "Erro", "Não foi possível salvar o valor da mão de obra.", "error");
      throw error;
    }
  }

  async function persistInspection(payload) {
    try {
      const saved = await api.saveInspection(payload);
      const normalized = normalizeInspection(saved);
      setInspections((prev) => {
        const exists = prev.some((item) => item.id === normalized.id);
        return exists ? prev.map((item) => (item.id === normalized.id ? normalized : item)) : [normalized, ...prev];
      });
      showToastMessage(setToast, "Vistoria salva", "Vistoria técnica gravada com sucesso.");
      return normalized;
    } catch (error) {
      console.error('persistInspection error', error);
      showToastMessage(setToast, "Erro", "Não foi possível salvar a vistoria.", "error");
      throw error;
    }
  }

  async function persistAppointment(payload) {
    try {
      const saved = await api.saveAppointment(payload);
      setAppointments((prev) => {
        const exists = prev.some((item) => item.id === saved.id);
        return exists ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved];
      });
      showToastMessage(setToast, "Agendamento salvo", "A vistoria foi incluída na agenda.");
      return saved;
    } catch (error) {
      console.error("persistAppointment error", error);
      showToastMessage(setToast, "Erro", "Não foi possível salvar o agendamento.", "error");
      throw error;
    }
  }

  async function removeClient(clientId) {
    if (!window.confirm("Excluir este cliente?")) return;
    await api.deleteClient(clientId);
    setClients((prev) => prev.filter((item) => item.id !== clientId));
    showToastMessage(setToast, "Cliente removido", "O cliente foi excluído da lista.");
  }

  async function removeEquipment(equipmentId) {
    if (!window.confirm("Excluir este equipamento?")) return;
    await api.deleteEquipment(equipmentId);
    setEquipments((prev) => prev.filter((item) => item.id !== equipmentId));
    showToastMessage(setToast, "Equipamento removido", "O equipamento foi excluído da lista.");
  }

  async function removeLabor(laborId) {
    if (!window.confirm("Excluir este valor de mão de obra?")) return;
    await api.deleteLaborRate(laborId);
    setLaborRates((prev) => prev.filter((item) => item.id !== laborId));
    showToastMessage(setToast, "Valor removido", "A tabela de mão de obra foi atualizada.");
  }

  async function removeInspection(inspectionId) {
    if (!window.confirm("Excluir esta vistoria?")) return;
    await api.deleteInspection(inspectionId);
    setInspections((prev) => prev.filter((item) => item.id !== inspectionId));
    showToastMessage(setToast, "Vistoria removida", "O registro de vistoria foi excluído.");
  }

  async function removeAppointment(appointmentId) {
    if (!window.confirm("Excluir este agendamento?")) return;
    await api.deleteAppointment(appointmentId);
    setAppointments((prev) => prev.filter((item) => item.id !== appointmentId));
    showToastMessage(setToast, "Agendamento removido", "O horário foi retirado da agenda.");
  }

  function openClientModal(client = null) {
    setEditingClient(client);
    setClientForm(client ? { ...defaultClient, ...client } : { ...defaultClient });
    setClientModalOpen(true);
  }

  function openEquipmentModal(equipment = null) {
    setEditingEquipment(equipment);
    setEquipmentForm(equipment ? { ...equipment } : defaultEquipment);
    setEquipmentModalOpen(true);
  }

  function openLaborModal(rate = null) {
    setEditingLabor(rate);
    setLaborForm(rate ? { ...rate } : defaultLaborRate);
    setLaborModalOpen(true);
  }

  function openInspectionModal(inspection = null, appointment = null) {
    const normalized = inspection ? normalizeInspection(inspection) : null;
    const draft = normalized
      ? { ...normalized, items: normalized.items.map((item) => ({ ...item })) }
      : { ...defaultInspection, appointmentId: appointment?.id || "", clientId: appointment?.clientId || "", clientName: appointment?.clientName || "", date: appointment?.date || defaultInspection.date, type: appointment?.type || defaultInspection.type };
    setEditingInspection(inspection);
    setLinkedAppointmentId(appointment?.id || normalized?.appointmentId || "");
    setInspectionDraft(draft);
    setItemDraft(defaultInspectionItem);
    setInspectionModalOpen(true);
  }

  function openInspectionClientPage(appointment) {
    const client = clients.find((item) => item.id === appointment.clientId);
    setInspectionClientAppointment(appointment);
    setEditingClient(client || null);
    setClientForm(client ? { ...defaultClient, ...client } : { ...defaultClient, id: appointment.clientId || "", name: appointment.clientName || "" });
    setActivePage("inspection-client");
  }

  function openAppointmentModal(appointment = null) {
    setEditingAppointment(appointment);
    setAppointmentDraft(appointment ? { ...appointment } : { ...defaultAppointment });
    setAppointmentModalOpen(true);
  }

  function closeModal() {
    setClientModalOpen(false);
    setEquipmentModalOpen(false);
    setLaborModalOpen(false);
    setInspectionModalOpen(false);
    setAppointmentModalOpen(false);
    setEditingClient(null);
    setEditingEquipment(null);
    setEditingLabor(null);
    setEditingInspection(null);
    setLinkedAppointmentId("");
    setEditingAppointment(null);
    setInspectionClientAppointment(null);
  }

  async function saveClient({ closeModalAfterSave = true } = {}) {
    if (!clientForm.name.trim()) return showToastMessage(setToast, "Atenção", "Informe o nome do condomínio.", "error");
    if (!clientForm.document.trim()) return showToastMessage(setToast, "Atenção", "Informe CNPJ ou CPF.", "error");
    if (!clientForm.address.trim()) return showToastMessage(setToast, "Atenção", "Informe o endereço completo.", "error");
    if (!clientForm.manager.trim()) return showToastMessage(setToast, "Atenção", "Informe o nome do responsável.", "error");
    if (!isPhoneValid(clientForm.phone)) return showToastMessage(setToast, "Atenção", "Informe um telefone válido.", "error");
    if (!isEmailValid(clientForm.email)) return showToastMessage(setToast, "Atenção", "Informe um e-mail válido.", "error");
    if (clientForm.gateType === "Portaria Terceirizada" && !clientForm.outsourcedGateCompany.trim()) return showToastMessage(setToast, "Atenção", "Informe a empresa de portaria terceirizada.", "error");
    if (clientForm.hasElevator === "Sim" && Number(clientForm.elevatorCount) < 1) return showToastMessage(setToast, "Atenção", "Informe a quantidade de elevadores.", "error");
    if (clientForm.hasBasement === "Sim" && Number(clientForm.basementCount) < 1) return showToastMessage(setToast, "Atenção", "Informe a quantidade de subsolos.", "error");
    if (clientForm.electricFenceStatus === "Não" && Number(clientForm.electricFenceMeters) <= 0) return showToastMessage(setToast, "Atenção", "Informe a metragem da cerca elétrica.", "error");
    if (clientForm.ivaSensorStatus === "Não" && Number(clientForm.ivaSensorCount) < 1) return showToastMessage(setToast, "Atenção", "Informe a quantidade de sensores IVA.", "error");

    const numericFields = ["towerCount", "unitCount", "gateCount", "elevatorCount", "frontageMeters", "lengthMeters", "vehicleEntryCount", "basementCount", "towerWoodDoorAccessCount", "towerGlassDoorAccessCount", "electricFenceMeters", "ivaSensorCount"];
    const payload = { ...clientForm, id: clientForm.id || "" };
    numericFields.forEach((field) => { payload[field] = Number(payload[field] || 0); });
    const saved = await persistClient(payload);
    if (closeModalAfterSave) setClientModalOpen(false);
    return saved;
  }

  async function continueToInspection() {
    const savedClient = await saveClient({ closeModalAfterSave: false });
    if (!savedClient || !inspectionClientAppointment) return;
    const appointment = { ...inspectionClientAppointment, clientId: savedClient.id, clientName: savedClient.name };
    const savedAppointment = await api.saveAppointment(appointment);
    setAppointments((previous) => previous.map((item) => item.id === savedAppointment.id ? savedAppointment : item));
    setInspectionClientAppointment(null);
    setActivePage("inspections");
    openInspectionModal(null, savedAppointment);
  }

  async function saveEquipment() {
    if (!equipmentForm.name.trim()) return showToastMessage(setToast, "Atenção", "Informe o nome do equipamento.", "error");
    if (!equipmentForm.brand.trim()) return showToastMessage(setToast, "Atenção", "Informe a marca.", "error");
    if (!equipmentForm.model.trim()) return showToastMessage(setToast, "Atenção", "Informe o modelo.", "error");
    if (!equipmentForm.location.trim()) return showToastMessage(setToast, "Atenção", "Informe o local de instalação.", "error");

    await persistEquipment({ ...equipmentForm, id: equipmentForm.id || "", quantity: Number(equipmentForm.quantity || 1) });
    setEquipmentModalOpen(false);
  }

  async function saveLabor() {
    if (!laborForm.serviceType.trim()) return showToastMessage(setToast, "Atenção", "Informe o tipo de serviço.", "error");
    if (!laborForm.unitPrice || Number(laborForm.unitPrice) <= 0) return showToastMessage(setToast, "Atenção", "Informe um valor unitário válido.", "error");
    if (!laborForm.estimatedTime.trim()) return showToastMessage(setToast, "Atenção", "Informe o tempo estimado.", "error");

    await persistLabor({
      ...laborForm,
      id: laborForm.id || "",
      unitPrice: Number(laborForm.unitPrice),
    });
    setLaborModalOpen(false);
  }

  async function saveAppointment() {
    if (!appointmentDraft.clientId) return showToastMessage(setToast, "Atenção", "Selecione o cliente.", "error");
    if (!appointmentDraft.date || !appointmentDraft.time) return showToastMessage(setToast, "Atenção", "Informe data e horário.", "error");
    if (!appointmentDraft.type) return showToastMessage(setToast, "Atenção", "Selecione o tipo de vistoria.", "error");
    const client = clients.find((item) => item.id === appointmentDraft.clientId);
    await persistAppointment({
      ...appointmentDraft,
      id: appointmentDraft.id || "",
      clientName: client?.name || appointmentDraft.clientName,
      createdAt: appointmentDraft.createdAt || new Date().toISOString(),
    });
    setAppointmentModalOpen(false);
  }

  async function saveInspection() {
    if (!inspectionDraft.clientId) return showToastMessage(setToast, "Atenção", "Selecione o cliente para a vistoria.", "error");
    if (!inspectionDraft.items.length) return showToastMessage(setToast, "Atenção", "Adicione pelo menos um equipamento vistoriado.", "error");

    const client = clients.find((item) => item.id === inspectionDraft.clientId);
    // Mantem os metadados das fotos e evita duplicar dados grandes no payload da vistoria.
    const sanitizedItems = inspectionDraft.items.map((it) => ({
      ...it,
      photos: (it.photos || []).map((p) => ({ id: p.id, name: p.name, date: p.date, url: p.url }))
    }));

    const payload = {
      ...inspectionDraft,
      id: inspectionDraft.id || "",
      clientName: client?.name || inspectionDraft.clientName,
      totalCost: inspectionTotals.totalCost,
      totalTime: `${inspectionTotals.totalTime.toFixed(1)}h`,
      createdAt: inspectionDraft.createdAt || new Date().toISOString(),
      items: sanitizedItems,
    };

    try {
      await persistInspection(payload);
      if (linkedAppointmentId) {
        const appointment = appointments.find((item) => item.id === linkedAppointmentId);
        if (appointment) {
          const updatedAppointment = await api.saveAppointment({ ...appointment, status: "Realizada" });
          setAppointments((previous) => previous.map((item) => item.id === updatedAppointment.id ? updatedAppointment : item));
          showToastMessage(setToast, "Agendamento atualizado", "A vistoria foi marcada como realizada.");
        }
      }
      setInspectionModalOpen(false);
    } catch (error) {
      console.error('saveInspection error', error);
      showToastMessage(setToast, 'Erro', 'Falha ao salvar vistoria. Verifique o console.', 'error');
    }
  }

  function addInspectionItem() {
    if (!itemDraft.equipmentName.trim()) return showToastMessage(setToast, "Atenção", "Informe o equipamento.", "error");
    const newItem = {
      ...itemDraft,
      id: createId(),
      quantity: Number(itemDraft.quantity || 1),
      unitPrice: Number(itemDraft.unitPrice || 0),
    };
    setInspectionDraft((prev) => ({ ...prev, items: [newItem, ...prev.items] }));
    setItemDraft(defaultInspectionItem);
    showToastMessage(setToast, "Item adicionado", "O equipamento foi incluído na vistoria.");
  }

  function updateInspectionItem(itemId, values) {
    setInspectionDraft((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === itemId ? { ...item, ...values } : item)),
    }));
  }

  function removeInspectionItem(itemId) {
    setInspectionDraft((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== itemId) }));
  }

  async function handleItemPhotos(itemId, files) {
    try {
      // Cada foto tenta usar o endpoint do servidor; Data URL e o fallback offline.
      const uploaded = await Promise.all(
        Array.from(files).map(async (file) => {
          try {
            const res = await api.uploadImage(file);
            return { id: res.id, name: res.name || file.name, url: res.url, date: new Date().toLocaleDateString("pt-BR") };
          } catch (err) {
            // fallback to dataURL if upload fails
            return await createPhotoFromFile(file);
          }
        })
      );

      setInspectionDraft((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === itemId ? { ...item, photos: [...item.photos, ...uploaded] } : item)),
      }));
    } catch (err) {
      console.error('handleItemPhotos error', err);
      showToastMessage(setToast, 'Erro', 'Falha ao enviar fotos. Tentando salvar localmente.', 'error');
    }
  }

  function removeInspectionPhoto(itemId, photoId) {
    setInspectionDraft((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === itemId ? { ...item, photos: item.photos.filter((photo) => photo.id !== photoId) } : item)),
    }));
  }

  function onClientChange(clientId) {
    const client = clients.find((item) => item.id === clientId);
    setInspectionDraft((prev) => ({ ...prev, clientId, clientName: client?.name || "" }));
  }

  function onItemServiceChange(serviceType) {
    const service = laborRates.find((item) => item.serviceType === serviceType);
    setItemDraft((prev) => ({
      ...prev,
      serviceType,
      unitPrice: service?.unitPrice || prev.unitPrice,
      estimatedTime: service?.estimatedTime || prev.estimatedTime,
    }));
  }

  function clearAllData() {
    if (!window.confirm("Excluir todos os dados salvos localmente?")) return;
    localStorage.removeItem("vistoria_seguranca_eletronica_store");
    window.location.reload();
  }

  function toggleMobileMenu() {
    setMobileMenuOpen((prev) => !prev);
  }

  function handlePrint() {
    window.print();
  }

  function exportInspectionsJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      clients,
      equipments,
      laborRates,
      inspections: reportInspections,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vistorias-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToastMessage(setToast, "Exportação concluída", "Os dados filtrados foram baixados em JSON.");
  }

  function downloadTextFile(filename, content) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportInspectionsTxt() {
    const lines = ["RELATORIO DE VISTORIAS", `Gerado em: ${new Date().toLocaleString("pt-BR")}`, ""];
    reportInspections.forEach((inspection, index) => {
      lines.push(`${index + 1}. ${inspection.clientName || "Cliente não informado"}`);
      lines.push(`Data: ${inspection.date} | Tipo: ${inspection.type} | Status: ${inspection.status}`);
      lines.push(`Itens: ${(inspection.items || []).length} | Custo estimado: ${money(inspection.totalCost)} | Tempo: ${inspection.totalTime || "0h"}`);
      if (inspection.summary) lines.push(`Resumo: ${inspection.summary}`);
      (inspection.items || []).forEach((item, itemIndex) => {
        lines.push(`  ${itemIndex + 1}) ${item.equipmentName} | ${item.type} | ${item.status} | Qtd.: ${item.quantity} | Subtotal: ${money(Number(item.quantity || 1) * Number(item.unitPrice || 0))}`);
        if (item.observations) lines.push(`     Observações: ${item.observations}`);
      });
      lines.push("");
    });
    downloadTextFile(`relatorio-vistorias-${new Date().toISOString().slice(0, 10)}.txt`, lines.join("\n"));
    showToastMessage(setToast, "Exportação concluída", "O relatório TXT foi baixado.");
  }

  async function handleImportJson(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const imported = {
        clients: Array.isArray(payload.clients) ? payload.clients : [],
        equipments: Array.isArray(payload.equipments) ? payload.equipments : [],
        laborRates: Array.isArray(payload.laborRates) ? payload.laborRates : [],
        inspections: Array.isArray(payload.inspections) ? payload.inspections : [],
      };
      const total = Object.values(imported).reduce((sum, items) => sum + items.length, 0);
      if (!total) throw new Error("O arquivo não contém registros reconhecíveis.");
      if (!window.confirm(`Importar ${total} registros do backup? Registros com o mesmo ID serão atualizados.`)) return;
      const [savedClients, savedEquipments, savedLabor, savedInspections] = await Promise.all([
        Promise.all(imported.clients.map((item) => api.saveClient(item))),
        Promise.all(imported.equipments.map((item) => api.saveEquipment(item))),
        Promise.all(imported.laborRates.map((item) => api.saveLaborRate(item))),
        Promise.all(imported.inspections.map((item) => api.saveInspection(item))),
      ]);
      setClients((previous) => [...savedClients, ...previous.filter((item) => !savedClients.some((saved) => saved.id === item.id))]);
      setEquipments((previous) => [...savedEquipments, ...previous.filter((item) => !savedEquipments.some((saved) => saved.id === item.id))]);
      setLaborRates((previous) => [...savedLabor, ...previous.filter((item) => !savedLabor.some((saved) => saved.id === item.id))]);
      setInspections((previous) => [...savedInspections, ...previous.filter((item) => !savedInspections.some((saved) => saved.id === item.id))]);
      showToastMessage(setToast, "Importação concluída", `${total} registros foram restaurados.`);
    } catch (error) {
      console.error("handleImportJson error", error);
      showToastMessage(setToast, "Arquivo inválido", "Selecione um backup JSON gerado pelo aplicativo.", "error");
    }
  }

  const canManageSettings = currentUser?.role === "admin" && currentUser?.permissions?.settings !== "none";
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "clients", label: "Clientes", icon: Users },
    { id: "appointments", label: "Agendamentos", icon: CalendarDays },
    { id: "inspections", label: "Vistorias", icon: ListChecks },
    { id: "equipments", label: "Equipamentos", icon: Camera },
    { id: "labor", label: "Mão de obra", icon: DollarSign },
    { id: "reports", label: "Relatórios", icon: FileText },
    ...(canManageSettings ? [{ id: "settings", label: "Configurações", icon: Settings }] : []),
  ];

  const mobileNav = (
    <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 w-full border-t border-slate-200 bg-white/95 px-3 py-2 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 print:hidden md:hidden">
      <div className="mx-auto grid max-w-4xl grid-cols-4 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <button key={item.id} onClick={() => { setActivePage(item.id); setMobileMenuOpen(false); }} className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-semibold leading-tight transition ${active ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"}`}>
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );

  const mobileMenuOverlay = mobileMenuOpen ? (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/95 p-5 text-white md:hidden">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Menu rápido</p>
          <h2 className="text-2xl font-bold">Navegação</h2>
        </div>
        <button onClick={toggleMobileMenu} className="rounded-2xl bg-slate-800 p-3 text-slate-200 transition hover:bg-slate-700">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-8 space-y-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={() => { setActivePage(item.id); toggleMobileMenu(); }} className="flex w-full items-center gap-3 rounded-3xl border border-slate-700 bg-slate-900/80 px-5 py-4 text-left text-base font-semibold text-white transition hover:border-slate-500 hover:bg-slate-800">
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-3xl border border-red-900/80 bg-red-950/80 px-5 py-4 text-left text-base font-semibold text-red-100 transition hover:bg-red-900">
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </div>
  ) : null;

  if (!isAuthenticated) {
    return (
      <div className={`${darkMode ? "dark" : ""} min-h-screen bg-slate-50 text-slate-900 transition duration-300 dark:bg-slate-950 dark:text-slate-100`}>
        <div className="flex min-h-screen items-center justify-center px-4 py-8">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/95">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold">Acesso ao sistema</h1>
              <p className="mt-2 text-slate-500 dark:text-slate-400">Faça login para continuar no painel de vistorias.</p>
            </div>
            <form onSubmit={handleLoginSubmit} className="space-y-5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Usuário
                  <input
                    type="text"
                    value={loginForm.username}
                    onChange={(event) => setLoginForm((prev) => ({ ...prev, username: event.target.value }))}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Senha
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>
                {loginError && <p className="text-sm text-red-600 dark:text-red-400">{loginError}</p>}
                <div className="flex flex-col gap-3">
                  <Button type="submit" className="w-full">Entrar</Button>
                </div>
            </form>
            <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">A criação de usuários é realizada pelo administrador em Configurações.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? "dark" : ""} min-h-screen bg-slate-50 text-slate-900 transition duration-300 dark:bg-slate-950 dark:text-slate-100`}>
      {mobileMenuOverlay}
      <div className="grid min-h-screen gap-6 px-4 py-4 md:grid-cols-[320px_1fr] xl:px-8">
        <Sidebar
          active={activePage}
          onChange={setActivePage}
          darkMode={darkMode}
          onToggleDark={toggleDarkMode}
          onLogout={logout}
          userName={userName || "Técnico"}
          isAdmin={canManageSettings}
        />
        <main className="mobile-content space-y-6 md:pb-10">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-lg shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/90 md:hidden">
              <button onClick={toggleMobileMenu} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                <Menu className="h-4 w-4" /> Menu
              </button>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="inline-flex items-center rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white">PDF</button>
                <button onClick={toggleDarkMode} aria-label={darkMode ? "Ativar modo claro" : "Ativar modo escuro"} aria-pressed={darkMode} title={darkMode ? "Ativar modo claro" : "Ativar modo escuro"} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span>{darkMode ? "Claro" : "Escuro"}</span>
                </button>
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-lg shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Gestão de Vistorias</p>
                  <h1 className="text-3xl font-bold">Sistema de Vistoria para Condomínios</h1>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-2xl px-3 py-2 text-sm font-semibold ${darkMode ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-slate-700"}`}>{darkMode ? "Modo escuro" : "Modo claro"}</span>
                  <Button variant="outline" onClick={clearAllData}>Limpar dados</Button>
                  {isPwaInstallAvailable && (
                    <Button variant="default" onClick={promptPwaInstall}>Instalar app</Button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="rounded-[1.75rem] border-0 !bg-blue-600 !text-white shadow-2xl shadow-blue-500/10">
                <CardContent className="text-white">
                  <p className="text-sm uppercase tracking-[0.3em] opacity-80">Clientes</p>
                  <p className="mt-4 text-3xl font-semibold">{clients.length}</p>
                  <p className="mt-2 text-sm opacity-80">Condomínios cadastrados</p>
                </CardContent>
              </Card>
              <Card className="rounded-[1.75rem] border-0 !bg-slate-900 !text-white shadow-2xl shadow-slate-900/10">
                <CardContent className="text-white">
                  <p className="text-sm uppercase tracking-[0.3em] opacity-80">Equipamentos</p>
                  <p className="mt-4 text-3xl font-semibold">{equipments.length}</p>
                  <p className="mt-2 text-sm opacity-80">Modelos e registros ativos</p>
                </CardContent>
              </Card>
              <Card className="rounded-[1.75rem] border-0 !bg-emerald-600 !text-white shadow-2xl shadow-emerald-500/10">
                <CardContent className="text-white">
                  <p className="text-sm uppercase tracking-[0.3em] opacity-80">Mão de obra</p>
                  <p className="mt-4 text-3xl font-semibold">{laborRates.length}</p>
                  <p className="mt-2 text-sm opacity-80">Serviços configurados</p>
                </CardContent>
              </Card>
              <Card className="rounded-[1.75rem] border-0 !bg-amber-500 !text-slate-950 shadow-2xl shadow-amber-500/20">
                <CardContent className="text-slate-950">
                  <p className="text-sm uppercase tracking-[0.3em] opacity-80">Vistorias</p>
                  <p className="mt-4 text-3xl font-semibold">{inspections.length}</p>
                  <p className="mt-2 text-sm opacity-80">Registros técnicos</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {activePage === "dashboard" && (
            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <Card className="rounded-[2rem] border-0 p-6 shadow-xl shadow-slate-200/40 dark:bg-slate-900/95 dark:shadow-black/10">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Bem-vindo à central</h2>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">Use os módulos à esquerda para acessar clientes, equipamentos, mão de obra, vistorias e relatórios.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="default" onClick={() => openInspectionModal()}>Nova vistoria</Button>
                    <Button variant="outline" onClick={() => openAppointmentModal()}>Agendar vistoria</Button>
                    <Button variant="outline" onClick={() => setActivePage("reports")}>Ir para relatórios</Button>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.75rem] bg-slate-100 p-5 dark:bg-slate-950/80">
                    <p className="font-semibold">Últimas vistorias</p>
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{inspections.slice(0, 3).map((item) => item.clientName).join(" • ") || "Nenhuma vistoria registrada ainda."}</p>
                  </div>
                  <div className="rounded-[1.75rem] bg-slate-100 p-5 dark:bg-slate-950/80">
                    <p className="font-semibold">Clientes recentes</p>
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{clients.slice(0, 3).map((item) => item.name).join(" • ") || "Nenhum cliente cadastrado ainda."}</p>
                  </div>
                  <div className="rounded-[1.75rem] bg-blue-50 p-5 dark:bg-blue-950/30 sm:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">Próximas vistorias agendadas</p>
                      <button onClick={() => setActivePage("appointments")} className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300">Ver agenda</button>
                    </div>
                    {upcomingAppointments.length ? (
                      <div className="mt-3 grid gap-2 md:grid-cols-3">
                        {upcomingAppointments.slice(0, 3).map((appointment) => (
                          <div key={appointment.id} className="rounded-2xl bg-white/80 p-3 dark:bg-slate-900/80">
                            <p className="font-semibold">{appointment.clientName}</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{appointment.date} às {appointment.time}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{appointment.type} • {appointment.status}</p>
                          </div>
                        ))}
                      </div>
                    ) : <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Nenhuma vistoria agendada.</p>}
                  </div>
                </div>
              </Card>
              <Card className="rounded-[2rem] border-0 p-6 shadow-xl shadow-slate-200/40 dark:bg-slate-900/95 dark:shadow-black/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Status da plataforma</h2>
                  <span className={`rounded-2xl px-3 py-2 text-sm font-semibold ${navigator.onLine ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{navigator.onLine ? "Online" : "Offline"}</span>
                </div>
                <div className="mt-5 grid gap-4">
                  <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-950/90">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Total de itens vistoriados</p>
                    <p className="mt-2 text-3xl font-semibold">{inspections.reduce((sum, item) => sum + (item.items || []).length, 0)}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-950/90">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Valor estimado geral</p>
                    <p className="mt-2 text-3xl font-semibold">{money(inspections.reduce((sum, item) => sum + Number(item.totalCost || 0), 0))}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-3xl bg-amber-50 p-4 dark:bg-amber-950/30"><p className="text-xs text-amber-800 dark:text-amber-200">Atenção</p><p className="mt-1 text-2xl font-semibold">{inspectionStats.attentionItems}</p></div>
                    <div className="rounded-3xl bg-red-50 p-4 dark:bg-red-950/30"><p className="text-xs text-red-800 dark:text-red-200">Substituição</p><p className="mt-1 text-2xl font-semibold">{inspectionStats.replacementItems}</p></div>
                    <div className="rounded-3xl bg-blue-50 p-4 dark:bg-blue-950/30"><p className="text-xs text-blue-800 dark:text-blue-200">Fotos</p><p className="mt-1 text-2xl font-semibold">{inspectionStats.totalPhotos}</p></div>
                  </div>
                </div>
              </Card>
            </section>
          )}

          {activePage === "clients" && (
            <section className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Clientes</h2>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">Gestão completa de clientes e condomínios.</p>
                </div>
                <Button onClick={() => openClientModal()}>Novo cliente</Button>
              </div>
              <Card className="rounded-[2rem] border-0 p-5 shadow-xl shadow-slate-200/30 dark:bg-slate-900/95 dark:shadow-black/10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full max-w-md">
                    <Search className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-slate-400" />
                    <input
                      className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100"
                      placeholder="Buscar cliente"
                      value={clientFilter}
                      onChange={(event) => setClientFilter(event.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-slate-200 dark:border-slate-800">
                  <div className="grid grid-cols-1 gap-px bg-slate-200 text-left text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400 sm:grid-cols-5">
                    <div className="bg-white px-4 py-3 dark:bg-slate-950">Condomínio</div>
                    <div className="hidden bg-white px-4 py-3 dark:bg-slate-950 sm:block">CNPJ/CPF</div>
                    <div className="bg-white px-4 py-3 dark:bg-slate-950">Responsável</div>
                    <div className="hidden bg-white px-4 py-3 dark:bg-slate-950 md:block">Telefone</div>
                    <div className="bg-white px-4 py-3 dark:bg-slate-950">Ações</div>
                  </div>
                  {filteredClients.length ? (
                    filteredClients.map((item) => (
                      <div key={item.id} className="grid grid-cols-1 gap-px bg-slate-200 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-5">
                        <div className="bg-white px-4 py-4 dark:bg-slate-950">{item.name}</div>
                        <div className="hidden bg-white px-4 py-4 dark:bg-slate-950 sm:block">{item.document}</div>
                        <div className="bg-white px-4 py-4 dark:bg-slate-950">{item.manager}</div>
                        <div className="hidden bg-white px-4 py-4 dark:bg-slate-950 md:block">{item.phone}</div>
                        <div className="bg-white px-4 py-4 dark:bg-slate-950">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => openClientModal(item)}>Editar</Button>
                            <Button variant="ghost" onClick={() => removeClient(item.id)}>Excluir</Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white p-6 text-center text-slate-500 dark:bg-slate-950 dark:text-slate-400">Nenhum cliente encontrado.</div>
                  )}
                </div>
              </Card>
            </section>
          )}

          {activePage === "equipments" && (
            <section className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Equipamentos</h2>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">Cadastro de equipamentos e locais de instalação.</p>
                </div>
                <Button onClick={() => openEquipmentModal()}>Novo equipamento</Button>
              </div>
              <Card className="rounded-[2rem] border-0 p-5 shadow-xl shadow-slate-200/30 dark:bg-slate-900/95 dark:shadow-black/10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full max-w-md">
                    <Search className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-slate-400" />
                    <input
                      className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100"
                      placeholder="Buscar equipamento"
                      value={equipmentFilter}
                      onChange={(event) => setEquipmentFilter(event.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-slate-200 dark:border-slate-800">
                  <div className="grid grid-cols-1 gap-px bg-slate-200 text-left text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400 sm:grid-cols-5">
                    <div className="bg-white px-4 py-3 dark:bg-slate-950">Nome</div>
                    <div className="hidden bg-white px-4 py-3 dark:bg-slate-950 sm:block">Tipo</div>
                    <div className="bg-white px-4 py-3 dark:bg-slate-950">Marca</div>
                    <div className="hidden bg-white px-4 py-3 dark:bg-slate-950 md:block">Local</div>
                    <div className="bg-white px-4 py-3 dark:bg-slate-950">Ações</div>
                  </div>
                  {filteredEquipments.length ? (
                    filteredEquipments.map((item) => (
                      <div key={item.id} className="grid grid-cols-1 gap-px bg-slate-200 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-5">
                        <div className="bg-white px-4 py-4 dark:bg-slate-950">{item.name}</div>
                        <div className="hidden bg-white px-4 py-4 dark:bg-slate-950 sm:block">{item.type}</div>
                        <div className="bg-white px-4 py-4 dark:bg-slate-950">{item.brand}</div>
                        <div className="hidden bg-white px-4 py-4 dark:bg-slate-950 md:block">{item.location}</div>
                        <div className="bg-white px-4 py-4 dark:bg-slate-950">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => openEquipmentModal(item)}>Editar</Button>
                            <Button variant="ghost" onClick={() => removeEquipment(item.id)}>Excluir</Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white p-6 text-center text-slate-500 dark:bg-slate-950 dark:text-slate-400">Nenhum equipamento encontrado.</div>
                  )}
                </div>
              </Card>
            </section>
          )}

          {activePage === "labor" && (
            <section className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Mão de obra</h2>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">Valores e tempos estimados para cada serviço técnico.</p>
                </div>
                <Button onClick={() => openLaborModal()}>Novo valor</Button>
              </div>
              <Card className="rounded-[2rem] border-0 p-5 shadow-xl shadow-slate-200/30 dark:bg-slate-900/95 dark:shadow-black/10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full max-w-md">
                    <Search className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-slate-400" />
                    <input
                      className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100"
                      placeholder="Buscar serviço"
                      value={laborFilter}
                      onChange={(event) => setLaborFilter(event.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-slate-200 dark:border-slate-800">
                  <div className="grid grid-cols-1 gap-px bg-slate-200 text-left text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400 sm:grid-cols-5">
                    <div className="bg-white px-4 py-3 dark:bg-slate-950">Serviço</div>
                    <div className="hidden bg-white px-4 py-3 dark:bg-slate-950 sm:block">Valor</div>
                    <div className="hidden bg-white px-4 py-3 dark:bg-slate-950 md:block">Tempo</div>
                    <div className="col-span-2 bg-white px-4 py-3 dark:bg-slate-950">Descrição</div>
                  </div>
                  {filteredLabor.length ? (
                    filteredLabor.map((item) => (
                      <div key={item.id} className="grid grid-cols-1 gap-px bg-slate-200 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-5">
                        <div className="bg-white px-4 py-4 dark:bg-slate-950">{item.serviceType}</div>
                        <div className="hidden bg-white px-4 py-4 dark:bg-slate-950 sm:block">{money(item.unitPrice)}</div>
                        <div className="hidden bg-white px-4 py-4 dark:bg-slate-950 md:block">{item.estimatedTime}</div>
                        <div className="col-span-2 bg-white px-4 py-4 dark:bg-slate-950">{item.description}</div>
                        <div className="bg-white px-4 py-4 dark:bg-slate-950">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => openLaborModal(item)}>Editar</Button>
                            <Button variant="ghost" onClick={() => removeLabor(item.id)}>Excluir</Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white p-6 text-center text-slate-500 dark:bg-slate-950 dark:text-slate-400">Nenhum serviço encontrado.</div>
                  )}
                </div>
              </Card>
            </section>
          )}

          {activePage === "inspection-client" && (
            <section className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-300">Preparação da vistoria</p>
                  <h2 className="mt-2 text-2xl font-bold">Dados do cliente</h2>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">Confira e atualize todas as informações antes de iniciar a vistoria.</p>
                </div>
                <Button variant="outline" onClick={() => { setInspectionClientAppointment(null); setActivePage("inspections"); }}>Voltar para vistorias</Button>
              </div>
              <Card className="rounded-[2rem] border-0 p-5 shadow-xl shadow-slate-200/30 dark:bg-slate-900/95 dark:shadow-black/10 md:p-7">
                <div className="mb-6 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
                  <p className="font-semibold">Vistoria agendada para {inspectionClientAppointment?.date} às {inspectionClientAppointment?.time}</p>
                  <p className="mt-1">Tipo: {inspectionClientAppointment?.type}</p>
                </div>
                <ClientFormFields clientForm={clientForm} setClientForm={setClientForm} />
                <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                  <Button variant="outline" onClick={() => { setInspectionClientAppointment(null); setActivePage("inspections"); }}>Cancelar</Button>
                  <Button onClick={continueToInspection}>Salvar dados e realizar vistoria</Button>
                </div>
              </Card>
            </section>
          )}

          {activePage === "inspections" && (
            <section className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Vistorias</h2>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">Cadastre vistoria técnica e associe equipamentos com serviços necessários.</p>
                </div>
                <Button onClick={() => openInspectionModal()}>Nova vistoria</Button>
              </div>
              {pendingAppointments.length > 0 && (
                <Card className="rounded-[2rem] border-0 bg-blue-50 p-5 shadow-xl shadow-slate-200/30 dark:bg-blue-950/30 dark:shadow-black/10">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold">Vistorias agendadas</h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Inicie uma vistoria a partir de um agendamento pendente.</p>
                    </div>
                    <CalendarDays className="h-6 w-6 text-blue-700 dark:text-blue-300" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {pendingAppointments.map((appointment) => (
                      <div key={appointment.id} className="flex flex-col gap-3 rounded-2xl bg-white p-4 dark:bg-slate-900/80 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="min-w-[92px] rounded-xl bg-amber-100 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">Pendente</div>
                          <div>
                            <p className="font-semibold">{appointment.clientName}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{appointment.date} às {appointment.time} · {appointment.type}</p>
                            {appointment.technician && <p className="text-sm text-slate-500 dark:text-slate-400">Técnico: {appointment.technician}</p>}
                          </div>
                        </div>
                        <Button onClick={() => openInspectionClientPage(appointment)} className="min-h-12 min-w-[190px] rounded-2xl bg-blue-600 px-5 py-3 text-base font-bold shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30">
                          <ClipboardCheck className="h-5 w-5" />
                          Realizar vistoria
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              <Card className="rounded-[2rem] border-0 p-5 shadow-xl shadow-slate-200/30 dark:bg-slate-900/95 dark:shadow-black/10">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="relative w-full max-w-lg">
                    <Search className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-slate-400" />
                    <input
                      className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100"
                      placeholder="Buscar vistárias"
                      value={inspectionFilter}
                      onChange={(event) => setInspectionFilter(event.target.value)}
                    />
                  </div>
                  <select value={inspectionStatusFilter} onChange={(event) => setInspectionStatusFilter(event.target.value)} className="w-full rounded-3xl border border-slate-200 bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100 xl:max-w-xs">
                    <option value="">Todos os status</option>
                    <option value="Em análise">Em análise</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Concluída">Concluída</option>
                  </select>
                </div>
                <div className="mt-5 space-y-4">
                  {filteredInspections.length ? (
                    filteredInspections.map((inspection) => (
                      <Card key={inspection.id} className="rounded-[1.75rem] border border-slate-200 p-5 dark:border-slate-800 dark:bg-slate-950/95">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm uppercase tracking-[0.3em] text-blue-600 dark:text-blue-300">{inspection.status}</p>
                            <h3 className="mt-2 text-xl font-semibold">{inspection.clientName}</h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{inspection.date} • {inspection.type}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => openInspectionModal(inspection)}>Editar</Button>
                            <Button variant="ghost" onClick={() => removeInspection(inspection.id)}>Excluir</Button>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-900/80">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Itens vistoriados</p>
                            <p className="mt-2 text-xl font-semibold">{(inspection.items || []).length}</p>
                          </div>
                          <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-900/80">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Custo estimado</p>
                            <p className="mt-2 text-xl font-semibold">{money(inspection.totalCost)}</p>
                          </div>
                          <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-900/80">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Tempo</p>
                            <p className="mt-2 text-xl font-semibold">{inspection.totalTime}</p>
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="rounded-[1.75rem] bg-white p-10 text-center text-slate-500 shadow-sm dark:bg-slate-950 dark:text-slate-400">Nenhuma vistoria encontrada.</div>
                  )}
                </div>
              </Card>
            </section>
          )}

          {activePage === "appointments" && (
            <section className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Agendamento de vistoria</h2>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">Organize os próximos atendimentos técnicos por cliente, data e horário.</p>
                </div>
                <Button onClick={() => openAppointmentModal()}>Agendar vistoria</Button>
              </div>
              <div className="space-y-4">
                {upcomingAppointments.length ? upcomingAppointments.map((appointment) => (
                  <Card key={appointment.id} className="rounded-[1.75rem] border border-slate-200 p-5 dark:border-slate-800 dark:bg-slate-950/95">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-blue-600 dark:text-blue-300">{appointment.status}</p>
                        <h3 className="mt-2 text-xl font-semibold">{appointment.clientName}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{appointment.date} às {appointment.time} • {appointment.type}</p>
                        {appointment.technician && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Técnico: {appointment.technician}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => openAppointmentModal(appointment)}>Editar</Button>
                        <Button variant="ghost" onClick={() => removeAppointment(appointment.id)}>Excluir</Button>
                      </div>
                    </div>
                    {appointment.notes && <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">{appointment.notes}</p>}
                  </Card>
                )) : (
                  <div className="rounded-[1.75rem] bg-white p-10 text-center text-slate-500 shadow-sm dark:bg-slate-950 dark:text-slate-400">Nenhuma vistoria agendada.</div>
                )}
              </div>
            </section>
          )}

          {activePage === "settings" && canManageSettings && (
            <UserSettings
              users={managedUsers}
              currentUser={currentUser}
              onSave={saveManagedUser}
              onDelete={deleteManagedUser}
            />
          )}

          {activePage === "reports" && (
            <section className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Relatórios</h2>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">Filtre vistorias por cliente e data para gerar relatórios técnicos.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input ref={importInputRef} type="file" accept="application/json,.json" onChange={handleImportJson} className="hidden" />
                  <Button variant="outline" onClick={() => importInputRef.current?.click()}>Importar JSON</Button>
                  <Button variant="outline" onClick={exportInspectionsJson}>Exportar JSON</Button>
                  <Button variant="outline" onClick={exportInspectionsTxt}>Exportar TXT</Button>
                  <Button onClick={() => window.print()}>Exportar PDF</Button>
                </div>
              </div>
              <Card className="rounded-[2rem] border-0 p-5 shadow-xl shadow-slate-200/30 dark:bg-slate-900/95 dark:shadow-black/10">
                <div className="grid gap-4 lg:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Cliente</span>
                    <select className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" value={reportClientFilter} onChange={(event) => setReportClientFilter(event.target.value)}>
                      <option value="">Todos os clientes</option>
                      {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">De</span>
                    <input type="date" value={reportDateFrom} onChange={(event) => setReportDateFrom(event.target.value)} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Até</span>
                    <input type="date" value={reportDateTo} onChange={(event) => setReportDateTo(event.target.value)} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" />
                  </label>
                </div>
              </Card>
              <div className="space-y-4">
                {reportInspections.length ? reportInspections.map((inspection) => (
                  <Card key={inspection.id} className="rounded-[1.75rem] border border-slate-200 p-5 dark:border-slate-800 dark:bg-slate-950/95">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-xl font-semibold">{inspection.clientName}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{inspection.date} • {inspection.type} • {inspection.status}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" onClick={() => openInspectionModal(inspection)}>Visualizar</Button>
                        <Button variant="ghost" onClick={() => window.print()}>Imprimir</Button>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-900/80">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Itens vistoriados</p>
                        <p className="mt-2 text-lg font-semibold">{(inspection.items || []).length}</p>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-900/80">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Valor previsto</p>
                        <p className="mt-2 text-lg font-semibold">{money(inspection.totalCost)}</p>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-900/80">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Tempo previsto</p>
                        <p className="mt-2 text-lg font-semibold">{inspection.totalTime}</p>
                      </div>
                    </div>
                  </Card>
                )) : (
                  <div className="rounded-[1.75rem] bg-white p-10 text-center text-slate-500 shadow-sm dark:bg-slate-950 dark:text-slate-400">Nenhum relatório disponível com os filtros atuais.</div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      <footer className="px-4 pb-24 pt-2 text-center text-xs text-slate-500 dark:text-slate-400 md:pb-4 print:hidden">
        Desenvolvido por: Deilson Rodrigues
      </footer>

      {mobileNav}
      <Toast toast={toast} onClose={() => setToast(null)} />

      <Modal open={clientModalOpen} title={editingClient ? "Editar cliente" : "Novo cliente"} onClose={closeModal} actions={<>
        <Button variant="outline" onClick={closeModal}>Cancelar</Button>
        <Button onClick={saveClient}>{editingClient ? "Salvar" : "Criar"}</Button>
      </>}>
        <div className="grid gap-4 md:grid-cols-2">
          <ClientTextField label="Nome do condomínio" value={clientForm.name} onChange={(event) => setClientForm({ ...clientForm, name: event.target.value })} />
          <ClientTextField label="CNPJ / CPF" value={clientForm.document} onChange={(event) => setClientForm({ ...clientForm, document: event.target.value })} />
          <ClientTextField label="Endereço completo" value={clientForm.address} onChange={(event) => setClientForm({ ...clientForm, address: event.target.value })} className="md:col-span-2" />
          <ClientTextField label="Responsável" value={clientForm.manager} onChange={(event) => setClientForm({ ...clientForm, manager: event.target.value })} />
          <ClientTextField label="Telefone" value={clientForm.phone} onChange={(event) => setClientForm({ ...clientForm, phone: event.target.value })} />
          <ClientTextField label="E-mail" type="email" value={clientForm.email} onChange={(event) => setClientForm({ ...clientForm, email: event.target.value })} />
          <ClientTextField label="Administradora" value={clientForm.administrator} onChange={(event) => setClientForm({ ...clientForm, administrator: event.target.value })} />
          <ClientSelectField label="Tipo de portaria" value={clientForm.gateType} onChange={(event) => setClientForm({ ...clientForm, gateType: event.target.value })} options={["Portaria Remota", "Portaria Orgânica", "Portaria Terceirizada"]} />
          {clientForm.gateType === "Portaria Terceirizada" && <ClientTextField label="Empresa terceirizada" value={clientForm.outsourcedGateCompany} onChange={(event) => setClientForm({ ...clientForm, outsourcedGateCompany: event.target.value })} />}
          <ClientSelectField label="Perfil do condomínio" value={clientForm.condominiumProfile} onChange={(event) => setClientForm({ ...clientForm, condominiumProfile: event.target.value })} options={["Residencial", "Comercial", "Residencial e Comercial", "Industrial", "Residência Casas"]} />
          <ClientTextField label="Número de torres" type="number" min="0" value={clientForm.towerCount} onChange={(event) => setClientForm({ ...clientForm, towerCount: event.target.value })} />
          <ClientTextField label="Quantidade de apartamentos ou casas" type="number" min="0" value={clientForm.unitCount} onChange={(event) => setClientForm({ ...clientForm, unitCount: event.target.value })} />
          <ClientTextField label="Quantidade de portarias" type="number" min="0" value={clientForm.gateCount} onChange={(event) => setClientForm({ ...clientForm, gateCount: event.target.value })} />
          <ClientSelectField label="Possui gerador?" value={clientForm.hasGenerator} onChange={(event) => setClientForm({ ...clientForm, hasGenerator: event.target.value })} options={["Sim", "Não"]} />
          <ClientSelectField label="Possui elevador?" value={clientForm.hasElevator} onChange={(event) => setClientForm({ ...clientForm, hasElevator: event.target.value })} options={["Sim", "Não"]} />
          {clientForm.hasElevator === "Sim" && <ClientTextField label="Quantidade de elevadores" type="number" min="1" value={clientForm.elevatorCount} onChange={(event) => setClientForm({ ...clientForm, elevatorCount: event.target.value })} />}
          <ClientTextField label="Metragem da frente (m)" type="number" min="0" step="0.01" value={clientForm.frontageMeters} onChange={(event) => setClientForm({ ...clientForm, frontageMeters: event.target.value })} />
          <ClientTextField label="Metragem de comprimento (m)" type="number" min="0" step="0.01" value={clientForm.lengthMeters} onChange={(event) => setClientForm({ ...clientForm, lengthMeters: event.target.value })} />
          <ClientTextField label="Quantidade de entradas de veículos" type="number" min="0" value={clientForm.vehicleEntryCount} onChange={(event) => setClientForm({ ...clientForm, vehicleEntryCount: event.target.value })} />
          <ClientSelectField label="Possui eclusa de veículos?" value={clientForm.hasVehicleEclusa} onChange={(event) => setClientForm({ ...clientForm, hasVehicleEclusa: event.target.value })} options={["Sim", "Não"]} />
          <ClientSelectField label="Possui subsolo?" value={clientForm.hasBasement} onChange={(event) => setClientForm({ ...clientForm, hasBasement: event.target.value })} options={["Sim", "Não"]} />
          {clientForm.hasBasement === "Sim" && <ClientTextField label="Quantidade de subsolos" type="number" min="1" value={clientForm.basementCount} onChange={(event) => setClientForm({ ...clientForm, basementCount: event.target.value })} />}
          <ClientSelectField label="Formato entrada pedestre" value={clientForm.pedestrianEntryFormat} onChange={(event) => setClientForm({ ...clientForm, pedestrianEntryFormat: event.target.value })} options={["Social e Serviço Separadas", "Social e Serviço juntas"]} />
          <ClientSelectField label="Possui eclusa entrada pedestre?" value={clientForm.hasPedestrianEclusa} onChange={(event) => setClientForm({ ...clientForm, hasPedestrianEclusa: event.target.value })} options={["Sim", "Não"]} />
          <ClientTextField label="Acessos à torre (porta madeira)" type="number" min="0" value={clientForm.towerWoodDoorAccessCount} onChange={(event) => setClientForm({ ...clientForm, towerWoodDoorAccessCount: event.target.value })} />
          <ClientTextField label="Acessos à torre (porta vidro)" type="number" min="0" value={clientForm.towerGlassDoorAccessCount} onChange={(event) => setClientForm({ ...clientForm, towerGlassDoorAccessCount: event.target.value })} />
          <ClientSelectField label="Possui cerca elétrica?" value={clientForm.electricFenceStatus} onChange={(event) => setClientForm({ ...clientForm, electricFenceStatus: event.target.value })} options={["Não precisa de Cerca", "Sim", "Não"]} />
          {clientForm.electricFenceStatus === "Não" && <ClientTextField label="Metragem da cerca elétrica (m)" type="number" min="0" step="0.01" value={clientForm.electricFenceMeters} onChange={(event) => setClientForm({ ...clientForm, electricFenceMeters: event.target.value })} />}
          <ClientSelectField label="Possui sensores IVA?" value={clientForm.ivaSensorStatus} onChange={(event) => setClientForm({ ...clientForm, ivaSensorStatus: event.target.value })} options={["Não precisa Sensores", "Sim", "Não"]} />
          {clientForm.ivaSensorStatus === "Não" && <ClientTextField label="Quantidade de sensores IVA" type="number" min="1" value={clientForm.ivaSensorCount} onChange={(event) => setClientForm({ ...clientForm, ivaSensorCount: event.target.value })} />}
          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Observações</span><textarea value={clientForm.notes} onChange={(event) => setClientForm({ ...clientForm, notes: event.target.value })} rows={4} className={clientControlClass} /></label>
        </div>
      </Modal>

      <Modal open={equipmentModalOpen} title={editingEquipment ? "Editar equipamento" : "Novo equipamento"} onClose={closeModal} actions={<>
        <Button variant="outline" onClick={closeModal}>Cancelar</Button>
        <Button onClick={saveEquipment}>{editingEquipment ? "Salvar" : "Criar"}</Button>
      </>}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nome do equipamento</span><input value={equipmentForm.name} onChange={(event) => setEquipmentForm({ ...equipmentForm, name: event.target.value })} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
          <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tipo</span><select value={equipmentForm.type} onChange={(event) => setEquipmentForm({ ...equipmentForm, type: event.target.value })} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100">
            {equipmentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select></label>
          <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Marca</span><input value={equipmentForm.brand} onChange={(event) => setEquipmentForm({ ...equipmentForm, brand: event.target.value })} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
          <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Modelo</span><input value={equipmentForm.model} onChange={(event) => setEquipmentForm({ ...equipmentForm, model: event.target.value })} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
          <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Quantidade</span><input type="number" min="1" value={equipmentForm.quantity} onChange={(event) => setEquipmentForm({ ...equipmentForm, quantity: Number(event.target.value) })} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Local de instalação</span><input value={equipmentForm.location} onChange={(event) => setEquipmentForm({ ...equipmentForm, location: event.target.value })} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Descrição técnica</span><textarea value={equipmentForm.technicalDescription} onChange={(event) => setEquipmentForm({ ...equipmentForm, technicalDescription: event.target.value })} rows={4} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
        </div>
      </Modal>

      <Modal open={laborModalOpen} title={editingLabor ? "Editar serviço" : "Novo serviço"} onClose={closeModal} actions={<>
        <Button variant="outline" onClick={closeModal}>Cancelar</Button>
        <Button onClick={saveLabor}>{editingLabor ? "Salvar" : "Criar"}</Button>
      </>}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tipo de serviço</span><input value={laborForm.serviceType} onChange={(event) => setLaborForm({ ...laborForm, serviceType: event.target.value })} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
          <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Valor unitário</span><input type="number" min="0" step="0.01" value={laborForm.unitPrice} onChange={(event) => setLaborForm({ ...laborForm, unitPrice: event.target.value })} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
          <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tempo estimado</span><input value={laborForm.estimatedTime} onChange={(event) => setLaborForm({ ...laborForm, estimatedTime: event.target.value })} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Descrição</span><textarea value={laborForm.description} onChange={(event) => setLaborForm({ ...laborForm, description: event.target.value })} rows={4} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
        </div>
      </Modal>

      <Modal open={inspectionModalOpen} title={editingInspection ? "Editar vistoria" : "Nova vistoria"} onClose={closeModal} actions={<>
        <Button variant="outline" onClick={closeModal}>Cancelar</Button>
        <Button onClick={saveInspection}>{editingInspection ? "Salvar vistoria" : "Registrar vistoria"}</Button>
      </>}>
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Cliente</span><select value={inspectionDraft.clientId} onChange={(event) => onClientChange(event.target.value)} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100">
                <option value="">Selecione um cliente</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select></label>
            <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Data da vistoria</span><input type="date" value={inspectionDraft.date} onChange={(event) => setInspectionDraft((prev) => ({ ...prev, date: event.target.value }))} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
            <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tipo de vistoria</span><select value={inspectionDraft.type} onChange={(event) => setInspectionDraft((prev) => ({ ...prev, type: event.target.value }))} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100">
                {inspectionTypes.map((item) => <option key={item} value={item}>{item}</option>)}
              </select></label>
            <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Status</span><input value={inspectionDraft.status} onChange={(event) => setInspectionDraft((prev) => ({ ...prev, status: event.target.value }))} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
          </div>
          <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Resumo técnico</span><textarea value={inspectionDraft.summary} onChange={(event) => setInspectionDraft((prev) => ({ ...prev, summary: event.target.value }))} rows={4} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/90">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Itens vistoriados</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Adicione equipamentos, status e fotos para cada item.</p>
              </div>
              <Button variant="outline" onClick={addInspectionItem}>Adicionar item</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Equipamento</span><input value={itemDraft.equipmentName} onChange={(event) => setItemDraft({ ...itemDraft, equipmentName: event.target.value })} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
              <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tipo</span><select value={itemDraft.type} onChange={(event) => setItemDraft({ ...itemDraft, type: event.target.value })} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100">
                {equipmentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select></label>
              <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Status</span><select value={itemDraft.status} onChange={(event) => setItemDraft({ ...itemDraft, status: event.target.value })} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100">
                {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select></label>
              <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Serviço</span><select value={itemDraft.serviceType} onChange={(event) => onItemServiceChange(event.target.value)} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100">
                {laborRates.map((rate) => <option key={rate.id} value={rate.serviceType}>{rate.serviceType}</option>)}
              </select></label>
              <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Quantidade</span><input type="number" min="1" value={itemDraft.quantity} onChange={(event) => setItemDraft({ ...itemDraft, quantity: Number(event.target.value) })} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
              <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Valor unitário</span><input type="number" min="0" step="0.01" value={itemDraft.unitPrice} onChange={(event) => setItemDraft({ ...itemDraft, unitPrice: Number(event.target.value) })} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
              <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Observações do item</span><textarea value={itemDraft.observations} onChange={(event) => setItemDraft({ ...itemDraft, observations: event.target.value })} rows={3} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
            </div>
            {inspectionDraft.items.length > 0 && (
              <div className="space-y-4">
                {inspectionDraft.items.map((item) => (
                  <div key={item.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/90">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{item.type}</p>
                        <h4 className="mt-2 text-lg font-semibold">{item.equipmentName}</h4>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Status: {statusOptions.find((status) => status.value === item.status)?.label}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => removeInspectionItem(item.id)}>Remover item</Button>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-900/80">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Quantidade</p>
                        <p className="mt-2 text-lg font-semibold">{item.quantity}</p>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-900/80">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Subtotal</p>
                        <p className="mt-2 text-lg font-semibold">{money(item.quantity * item.unitPrice)}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-200">Fotos</p>
                        <label className="cursor-pointer rounded-3xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                          Adicionar
                          <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => handleItemPhotos(item.id, event.target.files)} />
                        </label>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {item.photos.map((photo) => (
                          <div key={photo.id} className="relative w-24 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                            <img src={photo.url} alt={photo.name} className="h-24 w-24 object-cover" />
                            <button onClick={() => removeInspectionPhoto(item.id, photo.id)} className="absolute right-2 top-2 rounded-full bg-slate-900/80 p-1 text-white">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-900/80">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total de itens</p>
                <p className="mt-2 text-2xl font-semibold">{inspectionDraft.items.length}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-900/80">
                <p className="text-sm text-slate-500 dark:text-slate-400">Custo total</p>
                <p className="mt-2 text-2xl font-semibold">{money(inspectionTotals.totalCost)}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-900/80">
                <p className="text-sm text-slate-500 dark:text-slate-400">Tempo total</p>
                <p className="mt-2 text-2xl font-semibold">{inspectionTotals.totalTime.toFixed(1)}h</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={appointmentModalOpen} title={editingAppointment ? "Editar agendamento" : "Agendar vistoria"} onClose={closeModal} actions={<>
        <Button variant="outline" onClick={closeModal}>Cancelar</Button>
        <Button onClick={saveAppointment}>{editingAppointment ? "Salvar agendamento" : "Agendar vistoria"}</Button>
      </>}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Cliente</span><select value={appointmentDraft.clientId} onChange={(event) => { const client = clients.find((item) => item.id === event.target.value); setAppointmentDraft((prev) => ({ ...prev, clientId: event.target.value, clientName: client?.name || "" })); }} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100">
            <option value="">Selecione um cliente</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select></label>
          <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Data</span><input type="date" value={appointmentDraft.date} onChange={(event) => setAppointmentDraft((prev) => ({ ...prev, date: event.target.value }))} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
          <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Horário</span><input type="time" value={appointmentDraft.time} onChange={(event) => setAppointmentDraft((prev) => ({ ...prev, time: event.target.value }))} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
          <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tipo de vistoria</span><select value={appointmentDraft.type} onChange={(event) => setAppointmentDraft((prev) => ({ ...prev, type: event.target.value }))} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100">{inspectionTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
          <label className="space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Status</span><select value={appointmentDraft.status} onChange={(event) => setAppointmentDraft((prev) => ({ ...prev, status: event.target.value }))} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100"><option>Pendente</option><option>Realizada</option><option>Cancelada</option></select></label>
          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Técnico responsável</span><input value={appointmentDraft.technician} onChange={(event) => setAppointmentDraft((prev) => ({ ...prev, technician: event.target.value }))} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Observações</span><textarea value={appointmentDraft.notes} onChange={(event) => setAppointmentDraft((prev) => ({ ...prev, notes: event.target.value }))} rows={4} className="w-full rounded-3xl border border-slate-200 bg-white/90 py-3 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100" /></label>
        </div>
      </Modal>
    </div>
  );
}
