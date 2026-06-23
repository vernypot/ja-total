// MVC Architecture entry point
// Models: data access (Supabase)
// Controllers: business logic hooks (use*Controller)
// Views: presentational components (*View)
// Pages: thin route wrappers connecting controllers + views

export * from './models/auth.model';
export * from './models/iglesias.model';
export * from './models/clubes.model';
export * from './models/miembros.model';
export * from './models/contactos.model';
export * from './models/especialidades.model';
export * from './models/clases.model';
export * from './models/usuarios.model';
export * from './models/labels.model';

export { useLoginController } from './controllers/useLoginController';
export { useIglesiasController } from './controllers/useIglesiasController';
export { useClubesController } from './controllers/useClubesController';
export { useMiembrosController } from './controllers/useMiembrosController';
export { useClasesProgresivasController } from './controllers/useClasesProgresivasController';
export { useUsuariosController } from './controllers/useUsuariosController';
export { useUserProfileController } from './controllers/useUserProfileController';
export { useAdvancedSettingsController } from './controllers/useAdvancedSettingsController';
export { useLabelSettingsController } from './controllers/useLabelSettingsController';
export { useContactosController } from './controllers/useContactosController';
export { useEspecialidadesController } from './controllers/useEspecialidadesController';
export { useDatosPersonalesController } from './controllers/useDatosPersonalesController';

export { default as LoginView } from './views/LoginView';
export { default as IglesiasView } from './views/IglesiasView';
export { default as ClubesView } from './views/ClubesView';
export { default as MiembrosView } from './views/MiembrosView';
export { default as ClasesProgresivasView } from './views/ClasesProgresivasView';
export { default as UsuariosView } from './views/UsuariosView';
export { default as UserProfileView } from './views/UserProfileView';
export { default as AdvancedSettingsView } from './views/AdvancedSettingsView';
export { default as LabelSettingsView } from './views/LabelSettingsView';
export { default as ContactosView } from './views/ContactosView';
export { default as EspecialidadesView } from './views/EspecialidadesView';
export { default as DatosPersonalesView } from './views/DatosPersonalesView';
