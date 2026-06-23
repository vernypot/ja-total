import { getPasswordValidationError } from './passwordValidation';
import { isBlank, isValidDate, validators } from './validation';

const v = validators;

export const FORM_SCHEMAS = {
  login: {
    id: 'login',
    label: 'Login',
    submitAction: 'handleLogin',
    fields: {
      email: [v.required(), v.email()],
      password: [v.required()],
    },
  },

  event: {
    id: 'event',
    label: 'Event',
    submitAction: 'saveEvent',
    fields: {
      fecha: [v.required(), v.date()],
      hora: [v.required()],
      lugar: [v.required()],
    },
    formRules: [
      values => {
        if (!values.requiere_confirmacion) return null;
        if (values.memberAssignmentMode !== 'specific') return null;
        if ((values.selectedMemberIds || []).length > 0) return null;
        return { formError: 'validationEventMembersRequired' };
      },
    ],
  },

  planPeriod: {
    id: 'planPeriod',
    label: 'Period plan',
    submitAction: 'savePlan',
    fields: {
      nombre: [v.required()],
      fecha_inicio: [v.required(), v.date()],
      fecha_fin: [v.required(), v.date()],
      num_reuniones: [v.required(), v.minNumber(1)],
    },
    formRules: [
      values => (
        values.fecha_inicio && values.fecha_fin && values.fecha_fin < values.fecha_inicio
          ? { field: 'fecha_fin', message: 'validationDateRange' }
          : null
      ),
    ],
  },

  iglesia: {
    id: 'iglesia',
    label: 'Church',
    submitAction: 'saveIglesia',
    fields: {
      nombre: [v.required()],
    },
    formRules: [
      values => {
        if (!values.requireZona) return null;
        if (!isBlank(values.zona_id)) return null;
        return { field: 'zona_id', message: 'validationZonaRequired' };
      },
    ],
  },

  division: {
    id: 'division',
    label: 'Division',
    submitAction: 'saveDivision',
    fields: {
      nombre: [v.required()],
    },
  },

  union: {
    id: 'union',
    label: 'Union',
    submitAction: 'saveUnion',
    fields: {
      nombre: [v.required()],
    },
  },

  campo: {
    id: 'campo',
    label: 'Local field',
    submitAction: 'saveCampo',
    fields: {
      nombre: [v.required()],
      tipo_campo: [v.required(), v.oneOf(['mision', 'asociacion'])],
    },
  },

  zona: {
    id: 'zona',
    label: 'Zone',
    submitAction: 'saveZona',
    fields: {
      nombre: [v.required()],
    },
  },

  club: {
    id: 'club',
    label: 'Club',
    submitAction: 'addClub',
    fields: {
      nombre: [v.required()],
      iglesia_id: [v.required()],
    },
  },

  tipoEvento: {
    id: 'tipoEvento',
    label: 'Event type',
    submitAction: 'saveTipo',
    fields: {
      nombre: [v.required()],
    },
  },

  contacto: {
    id: 'contacto',
    label: 'Emergency contact',
    submitAction: 'saveContacto',
    fields: {
      nombre: [v.required()],
      telefono: [v.required()],
    },
  },

  noticia: {
    id: 'noticia',
    label: 'News',
    submitAction: 'saveNoticia',
    fields: {
      titulo: [v.htmlRequired()],
      contenido: [v.htmlRequired()],
      publicado_en: [v.required(), v.date()],
    },
  },

  usuario: {
    id: 'usuario',
    label: 'User',
    submitAction: 'saveUsuario',
    fields: {
      nombre: [v.required()],
      apellido1: [v.required()],
      email: [v.required(), v.email()],
      rol: [v.required()],
      iglesia_id: [v.required('iglesiaRequired')],
    },
    formRules: [
      values => {
        if (values.editingId) return null;
        if (values.sendSetupEmail) return null;
        const pwdKey = getPasswordValidationError(values.password);
        if (pwdKey) return { field: 'password', message: pwdKey };
        if (values.password !== values.confirmPassword) {
          return { field: 'confirmPassword', message: 'validationPasswordMismatch' };
        }
        return null;
      },
    ],
  },

  claseProgresiva: {
    id: 'claseProgresiva',
    label: 'Progressive class',
    submitAction: 'saveClase',
    fields: {
      nombre: [v.required()],
      tipo_id: [v.required()],
    },
  },

  especialidad: {
    id: 'especialidad',
    label: 'Specialty',
    submitAction: 'saveEspecialidad',
    fields: {
      nombre: [v.required()],
      tipo_id: [v.required()],
    },
  },

  cargo: {
    id: 'cargo',
    label: 'Cargo',
    submitAction: 'saveCargo',
    fields: {
      nombre: [v.required()],
    },
  },

  miembroCargo: {
    id: 'miembroCargo',
    label: 'Member cargo assignment',
    submitAction: 'saveCargoAssignment',
    fields: {
      cargo_id: [v.required()],
    },
    formRules: [
      values => {
        if (!values.inicioDesconocido && isBlank(values.fecha_inicio)) {
          return { field: 'fecha_inicio', message: 'validationRequired' };
        }
        if (!values.en_curso && isBlank(values.fecha_fin)) {
          return { field: 'fecha_fin', message: 'validationRequired' };
        }
        if (
          !values.inicioDesconocido
          && isValidDate(values.fecha_inicio)
          && isValidDate(values.fecha_fin)
          && values.fecha_fin < values.fecha_inicio
        ) {
          return { field: 'fecha_fin', message: 'validationDateRange' };
        }
        return null;
      },
    ],
  },

  userProfile: {
    id: 'userProfile',
    label: 'User profile',
    submitAction: 'saveProfile',
    fields: {
      nombre: [v.required()],
      apellido1: [v.required()],
      email: [v.required(), v.email()],
    },
  },

  memberPersonal: {
    id: 'memberPersonal',
    label: 'Member personal data',
    submitAction: 'saveMemberPersonal',
    fields: {
      nombre: [v.required()],
    },
  },
};

export const FORM_CTA_REGISTRY = Object.values(FORM_SCHEMAS).map(schema => ({
  formId: schema.id,
  label: schema.label,
  submitAction: schema.submitAction,
  requiredFields: Object.keys(schema.fields),
}));
