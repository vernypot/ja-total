import { createContext, useState, useEffect } from 'react';

export const LanguageContext = createContext();

const defaultTranslations = {
  en: {
    // Navigation
    members: 'Members',
    churches: 'Churches',
    clubs: 'Clubs',
    contacts: 'Contacts',
    specialties: 'Specialties',
    progressiveClasses: 'Progressive Classes',
    userManagement: 'User Management',
    labelSettings: 'Label Settings',
    
    // Common actions
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    logout: 'Logout',
    details: 'Details',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Member pages
    memberDetail: 'Member Details',
    personalData: 'Personal Data',
    membersInactive: 'Show inactive',
    noMembers: 'No members registered',
    
    // Churches
    churchList: 'Churches',
    addChurch: 'Add Church',
    churchName: 'Church Name',
    createChurch: 'Create Church',
    noChurches: 'No churches registered',
    deactivate: 'Deactivate',
    activate: 'Activate',
    
    // Clubs
    noClubs: 'No clubs registered',
    
    // User Management
    users: 'Users',
    email: 'Email',
    name: 'Name',
    role: 'Role',
    status: 'Status',
    
    // Fields
    firstName: 'First Name',
    lastName1: 'Last Name 1',
    lastName2: 'Last Name 2',
    birthDate: 'Birth Date',
    phone: 'Phone',
    cellphone: 'Cellphone',
    address: 'Address',
    city: 'City',
    document: 'Document',
    gender: 'Gender',
    photo: 'Photo',
    
    // Status
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
    
    // Messages
    errorLoadingData: 'Error loading data',
    noDataFound: 'No data found',
  },
  es: {
    // Navegación
    members: 'Miembros',
    churches: 'Iglesias',
    clubs: 'Clubes',
    contacts: 'Contactos',
    specialties: 'Especialidades',
    progressiveClasses: 'Clases Progresivas',
    userManagement: 'Gestión de Usuarios',
    labelSettings: 'Configurar Etiquetas',
    
    // Acciones comunes
    add: 'Agregar',
    edit: 'Editar',
    delete: 'Eliminar',
    save: 'Guardar',
    cancel: 'Cancelar',
    logout: 'Cerrar Sesión',
    details: 'Detalles',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    
    // Páginas de miembros
    memberDetail: 'Detalle del Miembro',
    personalData: 'Datos Personales',
    membersInactive: 'Mostrar inactivos',
    noMembers: 'No hay miembros registrados',
    
    // Iglesias
    churchList: 'Iglesias',
    addChurch: 'Agregar Iglesia',
    churchName: 'Nombre de Iglesia',
    createChurch: 'Crear Iglesia',
    noChurches: 'No hay iglesias registradas',
    deactivate: 'Desactivar',
    activate: 'Activar',
    
    // Clubes
    noClubs: 'No hay clubes registrados',
    
    // Gestión de usuarios
    users: 'Usuarios',
    email: 'Correo',
    name: 'Nombre',
    role: 'Rol',
    status: 'Estado',
    
    // Campos
    firstName: 'Nombre',
    lastName1: 'Apellido 1',
    lastName2: 'Apellido 2',
    birthDate: 'Fecha de Nacimiento',
    phone: 'Teléfono',
    cellphone: 'Celular',
    address: 'Dirección',
    city: 'Ciudad',
    document: 'Documento',
    gender: 'Género',
    photo: 'Foto',
    
    // Estados
    active: 'Activo',
    inactive: 'Inactivo',
    suspended: 'Suspendido',
    
    // Mensajes
    errorLoadingData: 'Error cargando datos',
    noDataFound: 'No se encontraron datos',
  }
};

export default function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'es';
  });
  const [customLabels, setCustomLabels] = useState(() => {
    const saved = localStorage.getItem('customLabels');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('customLabels', JSON.stringify(customLabels));
  }, [customLabels]);

  const t = (key) => {
    if (customLabels[key]) return customLabels[key];
    return defaultTranslations[language]?.[key] || defaultTranslations.es[key] || key;
  };

  const updateLabel = (key, value) => {
    setCustomLabels(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetLabels = () => {
    setCustomLabels({});
  };

  const value = {
    language,
    setLanguage,
    t,
    customLabels,
    updateLabel,
    resetLabels,
    allKeys: Object.keys(defaultTranslations.es),
    translations: defaultTranslations
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
