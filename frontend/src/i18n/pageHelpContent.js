const PAGE_HELP = {
  home: {
    en: {
      title: 'Home dashboard',
      overview: 'The home page shows news, upcoming birthdays, and club events for the church you are working in. It is the starting point after you sign in.',
      steps: [
        'Select your church if prompted (superadmins and users with access to multiple churches).',
        'Review news published for your church.',
        'Check upcoming member birthdays and scheduled events.',
        'Use the sidebar to open members, clubs, events, and other modules.',
      ],
      tips: [
        'If panels are empty, confirm the correct church is selected in the top bar.',
        'Club leaders see content scoped to their assigned church.',
      ],
    },
    es: {
      title: 'Inicio',
      overview: 'La página de inicio muestra noticias, próximos cumpleaños y eventos del club de la iglesia con la que está trabajando. Es el punto de partida después de iniciar sesión.',
      steps: [
        'Seleccione su iglesia si se le solicita (superadministradores y usuarios con acceso a varias iglesias).',
        'Revise las noticias publicadas para su iglesia.',
        'Consulte cumpleaños próximos y eventos programados.',
        'Use el menú lateral para abrir miembros, clubes, eventos y otros módulos.',
      ],
      tips: [
        'Si los paneles están vacíos, confirme que la iglesia correcta está seleccionada en la barra superior.',
        'Los líderes de club ven contenido limitado a su iglesia asignada.',
      ],
    },
  },

  members: {
    en: {
      title: 'Members',
      overview: 'Manage club members for the active church. Search, create records, assign members to clubs, and import many members from a spreadsheet.',
      steps: [
        'Confirm the church (and optional club filter) shown under the page title.',
        'Use search to find members by name.',
        'Click a row to open the member profile with tabs for personal data, medical info, contacts, classes, and more.',
        'Use “New member” to create a record, or “Bulk upload” to import from the Excel template.',
      ],
      fields: [
        { name: 'Search', description: 'Filters the list by first or last name.' },
        { name: 'Show inactive', description: 'Includes members marked inactive in the list.' },
        { name: 'Club assignment', description: 'Assign or remove the member from a club using the club buttons on each row.' },
        { name: 'Bulk upload file', description: 'Excel (.xlsx) with columns matching the downloadable template. Select the target club, validate, then import.' },
      ],
      tips: [
        'Complete personal data and a photo before printing the member ID card.',
        'Inactive members are hidden from most lists unless you enable “Show inactive”.',
      ],
    },
    es: {
      title: 'Miembros',
      overview: 'Administre los miembros del club de la iglesia activa. Busque, cree registros, asigne miembros a clubes e importe muchos miembros desde una hoja de cálculo.',
      steps: [
        'Confirme la iglesia (y el filtro de club opcional) que aparece bajo el título.',
        'Use la búsqueda para encontrar miembros por nombre.',
        'Haga clic en una fila para abrir el perfil con pestañas de datos personales, médicos, contactos, clases, etc.',
        'Use “Nuevo miembro” para crear un registro o “Carga masiva” para importar desde la plantilla Excel.',
      ],
      fields: [
        { name: 'Búsqueda', description: 'Filtra la lista por nombre o apellido.' },
        { name: 'Mostrar inactivos', description: 'Incluye miembros marcados como inactivos en la lista.' },
        { name: 'Asignación a club', description: 'Asigne o retire al miembro de un club con los botones de club en cada fila.' },
        { name: 'Archivo de carga masiva', description: 'Excel (.xlsx) con columnas según la plantilla descargable. Seleccione el club destino, valide e importe.' },
      ],
      tips: [
        'Complete los datos personales y una foto antes de imprimir el carnet.',
        'Los miembros inactivos se ocultan en la mayoría de listas salvo que active “Mostrar inactivos”.',
      ],
    },
  },

  churches: {
    en: {
      title: 'Churches',
      overview: 'Register churches and link each one to the organizational structure (division, union, field, zone). Church records scope members, clubs, and news.',
      steps: [
        'Use filters (superadmin) to narrow by division, union, field, or zone.',
        'Click “New church” to create a record, or edit an existing row.',
        'Select the zone so the church appears correctly in the hierarchy.',
        'Save to make the church available for club and member assignment.',
      ],
      fields: [
        { name: 'Name', description: 'Official church name as it should appear in reports and lists.' },
        { name: 'Zone', description: 'Required when organizational structure is configured. Places the church under Division → Union → Field → Zone.' },
        { name: 'City / address', description: 'Optional location details for reference.' },
        { name: 'Status', description: 'Inactive churches are hidden from normal selection lists.' },
      ],
      tips: [
        'Configure divisions, unions, fields, and zones first under “Unions, missions and zones”.',
        'Churches without a zone show a warning badge until assigned.',
      ],
    },
    es: {
      title: 'Iglesias',
      overview: 'Registre iglesias y vincúlelas a la estructura organizacional (división, unión, campo, zona). Las iglesias delimitan miembros, clubes y noticias.',
      steps: [
        'Use filtros (superadmin) para acotar por división, unión, campo o zona.',
        'Haga clic en “Nueva iglesia” para crear un registro o edite una fila existente.',
        'Seleccione la zona para que la iglesia aparezca correctamente en la jerarquía.',
        'Guarde para que la iglesia esté disponible para clubes y miembros.',
      ],
      fields: [
        { name: 'Nombre', description: 'Nombre oficial de la iglesia tal como debe aparecer en listas e informes.' },
        { name: 'Zona', description: 'Obligatoria cuando la estructura organizacional está configurada. Ubica la iglesia en División → Unión → Campo → Zona.' },
        { name: 'Ciudad / dirección', description: 'Datos de ubicación opcionales.' },
        { name: 'Estado', description: 'Las iglesias inactivas no aparecen en listas de selección normales.' },
      ],
      tips: [
        'Configure divisiones, uniones, campos y zonas primero en “Uniones, misiones y zonas”.',
        'Las iglesias sin zona muestran una advertencia hasta ser asignadas.',
      ],
    },
  },

  orgStructure: {
    en: {
      title: 'Organizational structure',
      overview: 'Maintain the SDA hierarchy: Division → Union → Field (mission/association) → Zone. Churches are assigned to zones.',
      steps: [
        'Expand each level and use “Add” to create divisions, unions, fields, or zones.',
        'Edit names or deactivate entries that are no longer used.',
        'After zones exist, assign churches to zones on the Churches page.',
      ],
      fields: [
        { name: 'Division', description: 'Top regional level (e.g. Inter-American Division).' },
        { name: 'Union', description: 'Subdivision under a division.' },
        { name: 'Field', description: 'Mission or association under a union.' },
        { name: 'Zone', description: 'Pastoral or administrative zone where local churches belong.' },
      ],
      tips: [
        'Only superadmins can change this structure.',
        'Deactivating a level hides it from new assignments but keeps historical links.',
      ],
    },
    es: {
      title: 'Estructura organizacional',
      overview: 'Mantenga la jerarquía adventista: División → Unión → Campo (misión/asociación) → Zona. Las iglesias se asignan a zonas.',
      steps: [
        'Expanda cada nivel y use “Agregar” para crear divisiones, uniones, campos o zonas.',
        'Edite nombres o desactive entradas que ya no se usen.',
        'Cuando existan zonas, asigne iglesias a zonas en la página de Iglesias.',
      ],
      fields: [
        { name: 'División', description: 'Nivel regional superior (p. ej. División Interamericana).' },
        { name: 'Unión', description: 'Subdivisión bajo una división.' },
        { name: 'Campo', description: 'Misión o asociación bajo una unión.' },
        { name: 'Zona', description: 'Zona pastoral o administrativa donde pertenecen las iglesias locales.' },
      ],
      tips: [
        'Solo los superadministradores pueden modificar esta estructura.',
        'Desactivar un nivel lo oculta de nuevas asignaciones pero conserva vínculos históricos.',
      ],
    },
  },

  clubs: {
    en: {
      title: 'Clubs',
      overview: 'Create and manage Adventurer, Pathfinder, and other youth clubs for the church. Each club has a type, logo, and members.',
      steps: [
        'Select the church if you manage multiple locations.',
        'Click “New club” and fill in name, type, and optional logo.',
        'Open a club to see assigned members and details.',
        'Use the active club selector in the top bar to scope other pages (members, calendar, planning).',
      ],
      fields: [
        { name: 'Name', description: 'Club name shown across the app (e.g. “Pathfinder Club Alpha”).' },
        { name: 'Type', description: 'Club category (Adventurer, Pathfinder, etc.) used to filter progressive classes.' },
        { name: 'Logo', description: 'Optional image for reports and club header. PNG or JPG recommended.' },
        { name: 'Church', description: 'The church this club belongs to.' },
      ],
      tips: [
        'Members must be assigned to a club before they appear in club-scoped events and planning.',
        'The organizational path of the church is shown in the club header when configured.',
      ],
    },
    es: {
      title: 'Clubes',
      overview: 'Cree y administre clubes de Aventureros, Conquistadores y otras categorías juveniles de la iglesia. Cada club tiene tipo, logo y miembros.',
      steps: [
        'Seleccione la iglesia si administra varias ubicaciones.',
        'Haga clic en “Nuevo club” y complete nombre, tipo y logo opcional.',
        'Abra un club para ver miembros asignados y detalles.',
        'Use el selector de club activo en la barra superior para acotar otras páginas (miembros, calendario, planificación).',
      ],
      fields: [
        { name: 'Nombre', description: 'Nombre del club visible en la aplicación.' },
        { name: 'Tipo', description: 'Categoría del club (Aventureros, Conquistadores, etc.) usada para filtrar clases progresivas.' },
        { name: 'Logo', description: 'Imagen opcional para informes y encabezado. Se recomienda PNG o JPG.' },
        { name: 'Iglesia', description: 'Iglesia a la que pertenece el club.' },
      ],
      tips: [
        'Los miembros deben estar asignados a un club para aparecer en eventos y planificación del club.',
        'La ruta organizacional de la iglesia se muestra en el encabezado del club cuando está configurada.',
      ],
    },
  },

  events: {
    en: {
      title: 'Events',
      overview: 'Schedule club events, manage attendance, send confirmations, and scan member QR codes for check-in.',
      steps: [
        'Select the active club to filter events.',
        'Create an event with date, time, place, and event type.',
        'Add members to the event roster or open check-in during the meeting.',
        'Record attendance as on time, late, or absent.',
      ],
      fields: [
        { name: 'Name', description: 'Short title for the event listing and calendar.' },
        { name: 'Date / time', description: 'When the event takes place. Used on the club calendar.' },
        { name: 'Place', description: 'Location or venue description.' },
        { name: 'Event type', description: 'Category from Event types (campout, club meeting, etc.).' },
        { name: 'Requires confirmation', description: 'Members or parents must confirm participation before the event.' },
        { name: 'Attendance', description: 'On time, late, or absent — updated manually or via QR check-in.' },
      ],
      tips: [
        'Link plan meetings to the calendar from Period planning to auto-create agenda events.',
        'Use the QR scanner during the event for fast check-in.',
      ],
    },
    es: {
      title: 'Eventos',
      overview: 'Programe eventos del club, administre asistencia, envíe confirmaciones y escanee códigos QR para el registro de entrada.',
      steps: [
        'Seleccione el club activo para filtrar eventos.',
        'Cree un evento con fecha, hora, lugar y tipo de evento.',
        'Agregue miembros al listado o abra el check-in durante la reunión.',
        'Registre asistencia como a tiempo, tarde o ausente.',
      ],
      fields: [
        { name: 'Nombre', description: 'Título breve para listados y calendario.' },
        { name: 'Fecha / hora', description: 'Cuándo ocurre el evento. Se usa en el calendario del club.' },
        { name: 'Lugar', description: 'Ubicación o descripción del sitio.' },
        { name: 'Tipo de evento', description: 'Categoría definida en Tipos de evento.' },
        { name: 'Requiere confirmación', description: 'Los miembros o padres deben confirmar participación antes del evento.' },
        { name: 'Asistencia', description: 'A tiempo, tarde o ausente — manual o mediante check-in QR.' },
      ],
      tips: [
        'Vincule reuniones del plan de trabajo al calendario desde Planificación de periodo.',
        'Use el escáner QR durante el evento para un registro rápido.',
      ],
    },
  },

  calendar: {
    en: {
      title: 'Club calendar',
      overview: 'View all scheduled events for the active club in month or list form. Events come from the Events module and from linked plan meetings.',
      steps: [
        'Select the club in the top bar if not already active.',
        'Browse months with the navigation controls.',
        'Click an event to see details or jump to the Events page to edit.',
      ],
      tips: [
        'Only dated events appear on the calendar.',
        'Plan meetings with a date and time sync as club agenda events when saved.',
      ],
    },
    es: {
      title: 'Calendario del club',
      overview: 'Vea todos los eventos programados del club activo en vista mensual o de lista. Los eventos provienen del módulo Eventos y de reuniones del plan vinculadas.',
      steps: [
        'Seleccione el club en la barra superior si no está activo.',
        'Navegue entre meses con los controles.',
        'Haga clic en un evento para ver detalles o ir a Eventos para editar.',
      ],
      tips: [
        'Solo aparecen eventos con fecha.',
        'Las reuniones del plan con fecha y hora se sincronizan como eventos al guardar.',
      ],
    },
  },

  periodPlanning: {
    en: {
      title: 'Period planning',
      overview: 'Build a work-period plan for a club: choose progressive classes, create numbered meetings, and drag requirements onto each meeting with session counts.',
      steps: [
        'Select a club, then create or open a plan with start/end dates and number of meetings.',
        'Choose which progressive classes apply to this plan.',
        'Drag requirements from the pool onto meeting columns.',
        'When dropping a requirement, specify how many working sessions it will use in that meeting.',
        'Set meeting date, time, and place to sync the meeting to the club calendar.',
        'Review the sessions summary at the bottom and print the plan when ready.',
      ],
      fields: [
        { name: 'Plan name', description: 'Label for this planning period (e.g. “2025–2026 Pathfinder year”).' },
        { name: 'Start / end dates', description: 'Boundaries of the planning period.' },
        { name: 'Number of meetings', description: 'How many meeting slots to generate in the agenda board.' },
        { name: 'Classes', description: 'Progressive classes whose requirements appear in the pool.' },
        { name: 'Sessions per assignment', description: 'Working sessions (0–10) allocated to a requirement in a specific meeting.' },
      ],
      tips: [
        'Expected sessions on each requirement (in Progressive classes) default the value when you assign it.',
        'Click the session badge on an assigned chip to adjust without re-dragging.',
      ],
    },
    es: {
      title: 'Planificación de periodo',
      overview: 'Elabore un plan de trabajo del club: elija clases progresivas, cree reuniones numeradas y arrastre requisitos a cada reunión con cantidad de sesiones.',
      steps: [
        'Seleccione un club y cree o abra un plan con fechas de inicio/fin y número de reuniones.',
        'Elija qué clases progresivas aplican a este plan.',
        'Arrastre requisitos desde el pool hacia las columnas de reunión.',
        'Al soltar un requisito, indique cuántas sesiones de trabajo usará en esa reunión.',
        'Configure fecha, hora y lugar de la reunión para sincronizarla al calendario del club.',
        'Revise el resumen de sesiones al final e imprima el plan cuando esté listo.',
      ],
      fields: [
        { name: 'Nombre del plan', description: 'Etiqueta del periodo (p. ej. “Año Conquistador 2025–2026”).' },
        { name: 'Fechas inicio / fin', description: 'Límites del periodo de planificación.' },
        { name: 'Número de reuniones', description: 'Cuántas columnas de reunión generar en el tablero.' },
        { name: 'Clases', description: 'Clases progresivas cuyos requisitos aparecen en el pool.' },
        { name: 'Sesiones por asignación', description: 'Sesiones de trabajo (0–10) asignadas a un requisito en una reunión específica.' },
      ],
      tips: [
        'Las sesiones esperadas de cada requisito (en Clases progresivas) son el valor predeterminado al asignarlo.',
        'Haga clic en la insignia de sesiones en un chip asignado para ajustar sin volver a arrastrar.',
      ],
    },
  },

  eventTypes: {
    en: {
      title: 'Event types',
      overview: 'Define categories for club events (regular meeting, campout, investiture, etc.). Types appear when creating events and plan meetings.',
      steps: [
        'Click “New type” and enter a name.',
        'Use types consistently so reports and calendars are easy to read.',
        'Deactivate types that are no longer used instead of deleting historical references.',
      ],
      fields: [
        { name: 'Name', description: 'Short label shown in event forms and calendars.' },
        { name: 'Status', description: 'Inactive types are hidden from new events.' },
      ],
    },
    es: {
      title: 'Tipos de evento',
      overview: 'Defina categorías para eventos del club (reunión regular, acampada, investidura, etc.). Los tipos aparecen al crear eventos y reuniones del plan.',
      steps: [
        'Haga clic en “Nuevo tipo” e ingrese un nombre.',
        'Use tipos de forma consistente para facilitar calendarios e informes.',
        'Desactive tipos que ya no se usen en lugar de borrar referencias históricas.',
      ],
      fields: [
        { name: 'Nombre', description: 'Etiqueta breve en formularios y calendarios.' },
        { name: 'Estado', description: 'Los tipos inactivos no aparecen en eventos nuevos.' },
      ],
    },
  },

  checkin: {
    en: {
      title: 'Member check-in',
      overview: 'This page processes QR-based event check-in. Members scan a code linked to an event, or staff open a check-in URL with event and token parameters.',
      steps: [
        'From an event, generate or share the check-in link or QR code.',
        'When a member scans, this page records attendance automatically.',
        'A success message confirms check-in; errors explain invalid or expired tokens.',
      ],
      tips: [
        'Check-in requires a valid member carnet token and event ID in the URL.',
        'For manual attendance, use the Events page instead.',
      ],
    },
    es: {
      title: 'Check-in de miembros',
      overview: 'Esta página procesa el registro por código QR. Los miembros escanean un código vinculado a un evento, o el personal abre una URL con evento y token.',
      steps: [
        'Desde un evento, genere o comparta el enlace o código QR de check-in.',
        'Cuando un miembro escanea, esta página registra la asistencia automáticamente.',
        'Un mensaje de éxito confirma el registro; los errores indican token inválido o expirado.',
      ],
      tips: [
        'El check-in requiere un token válido del carnet y el ID del evento en la URL.',
        'Para asistencia manual, use la página de Eventos.',
      ],
    },
  },

  specialties: {
    en: {
      title: 'Honors catalog',
      overview: 'Superadmins maintain the honors (specialties) catalog and their requirements. Clubs assign honors to members from the member profile.',
      steps: [
        'Browse honors grouped by category.',
        'Create or edit an honor and its requirement list.',
        'Requirements can include optional text and ordering.',
        'Members receive honors from their profile → Specialties tab.',
      ],
      fields: [
        { name: 'Honor name', description: 'Official honor title.' },
        { name: 'Category / section', description: 'Groups related honors in the catalog.' },
        { name: 'Requirements', description: 'Steps a member must complete to earn the honor.' },
      ],
      tips: [
        'Keep requirement descriptions clear — leaders validate them per member.',
      ],
    },
    es: {
      title: 'Catálogo de especialidades',
      overview: 'Los superadministradores mantienen el catálogo de especialidades y sus requisitos. Los clubes las asignan desde el perfil del miembro.',
      steps: [
        'Explore especialidades agrupadas por categoría.',
        'Cree o edite una especialidad y su lista de requisitos.',
        'Los requisitos pueden incluir texto opcional y orden.',
        'Los miembros reciben especialidades desde su perfil → pestaña Especialidades.',
      ],
      fields: [
        { name: 'Nombre de la especialidad', description: 'Título oficial de la especialidad.' },
        { name: 'Categoría / sección', description: 'Agrupa especialidades relacionadas en el catálogo.' },
        { name: 'Requisitos', description: 'Pasos que el miembro debe completar para obtener la especialidad.' },
      ],
      tips: [
        'Redacte requisitos claros — los líderes los validan por miembro.',
      ],
    },
  },

  progressiveClasses: {
    en: {
      title: 'Progressive classes',
      overview: 'Define class curricula (Friend, Companion, etc.) with sections and numbered requirements. Used in period planning and member class progress.',
      steps: [
        'Select or create a progressive class for a club type.',
        'Add sections (basic and advanced parts) with Roman numerals if needed.',
        'Add requirements with number, description, optional text, and expected sessions (0–10, default 3).',
        'Assign the class to members from their profile → Classes tab.',
      ],
      fields: [
        { name: 'Class name', description: 'Name of the progressive class level.' },
        { name: 'Club type', description: 'Which club types can use this class.' },
        { name: 'Section', description: 'Groups requirements (basic vs advanced).' },
        { name: 'Requirement number', description: 'Order within the section for manuals and planning.' },
        { name: 'Expected sessions', description: 'Typical working sessions needed to complete the requirement (default 3).' },
      ],
      tips: [
        'Expected sessions pre-fill the value when dragging requirements onto plan meetings.',
      ],
    },
    es: {
      title: 'Clases progresivas',
      overview: 'Defina currículos de clase (Amigo, Compañero, etc.) con secciones y requisitos numerados. Se usan en planificación de periodo y progreso del miembro.',
      steps: [
        'Seleccione o cree una clase progresiva para un tipo de club.',
        'Agregue secciones (partes básica y avanzada) con numerales romanos si aplica.',
        'Agregue requisitos con número, descripción, texto opcional y sesiones esperadas (0–10, predeterminado 3).',
        'Asigne la clase a miembros desde su perfil → pestaña Clases.',
      ],
      fields: [
        { name: 'Nombre de la clase', description: 'Nombre del nivel de clase progresiva.' },
        { name: 'Tipo de club', description: 'Qué tipos de club pueden usar esta clase.' },
        { name: 'Sección', description: 'Agrupa requisitos (básico vs avanzado).' },
        { name: 'Número de requisito', description: 'Orden dentro de la sección para manuales y planificación.' },
        { name: 'Sesiones esperadas', description: 'Sesiones de trabajo típicas para completar el requisito (predeterminado 3).' },
      ],
      tips: [
        'Las sesiones esperadas prellenan el valor al arrastrar requisitos a reuniones del plan.',
      ],
    },
  },

  users: {
    en: {
      title: 'User management',
      overview: 'Superadmins create login accounts, assign roles, and link users to churches. Roles control which pages and actions are available.',
      steps: [
        'Search for an existing user or click “New user”.',
        'Set email, name, role, and church assignment as needed.',
        'Send or reset password using the actions on each row.',
        'Deactivate users who should no longer access the system.',
      ],
      fields: [
        { name: 'Email', description: 'Login identifier. Must be unique.' },
        { name: 'Role', description: 'Superadmin, admin, leader, or member — determines permissions.' },
        { name: 'Church', description: 'Scopes the user to one church (required for most non-superadmin roles).' },
        { name: 'Password', description: 'Set on create or via reset link; never shown after saving.' },
      ],
      tips: [
        'Leaders typically need a church assignment matching their club.',
        'Users can update their own profile from the Profile page.',
      ],
    },
    es: {
      title: 'Gestión de usuarios',
      overview: 'Los superadministradores crean cuentas, asignan roles y vinculan usuarios a iglesias. Los roles controlan páginas y acciones disponibles.',
      steps: [
        'Busque un usuario existente o haga clic en “Nuevo usuario”.',
        'Configure correo, nombre, rol y asignación de iglesia según corresponda.',
        'Envíe o restablezca contraseña con las acciones de cada fila.',
        'Desactive usuarios que ya no deban acceder al sistema.',
      ],
      fields: [
        { name: 'Correo', description: 'Identificador de acceso. Debe ser único.' },
        { name: 'Rol', description: 'Superadmin, admin, líder o miembro — define permisos.' },
        { name: 'Iglesia', description: 'Limita al usuario a una iglesia (requerido para la mayoría de roles no superadmin).' },
        { name: 'Contraseña', description: 'Se define al crear o con enlace de restablecimiento; no se muestra después de guardar.' },
      ],
      tips: [
        'Los líderes suelen necesitar una iglesia asignada acorde a su club.',
        'Los usuarios pueden actualizar su perfil en la página Perfil.',
      ],
    },
  },

  news: {
    en: {
      title: 'News',
      overview: 'Publish announcements for a church. Active news appears on the home dashboard for users scoped to that church.',
      steps: [
        'Select the target church (admins with multiple churches).',
        'Create a news item with title, summary, and full content.',
        'Set publish date and status to active when ready.',
        'Edit or deactivate outdated announcements.',
      ],
      fields: [
        { name: 'Title', description: 'Headline shown on the home page and news list.' },
        { name: 'Summary', description: 'Short preview before “Read more”.' },
        { name: 'Content', description: 'Full HTML body of the announcement.' },
        { name: 'Publish date', description: 'Controls ordering; future dates can schedule visibility.' },
        { name: 'Status', description: 'Only active news is shown on the home dashboard.' },
      ],
    },
    es: {
      title: 'Noticias',
      overview: 'Publique anuncios para una iglesia. Las noticias activas aparecen en el inicio para usuarios de esa iglesia.',
      steps: [
        'Seleccione la iglesia destino (administradores con varias iglesias).',
        'Cree una noticia con título, resumen y contenido completo.',
        'Configure fecha de publicación y estado activo cuando esté lista.',
        'Edite o desactive anuncios obsoletos.',
      ],
      fields: [
        { name: 'Título', description: 'Encabezado en inicio y listado de noticias.' },
        { name: 'Resumen', description: 'Vista previa breve antes de “Leer más”.' },
        { name: 'Contenido', description: 'Cuerpo HTML completo del anuncio.' },
        { name: 'Fecha de publicación', description: 'Controla el orden; fechas futuras pueden programar visibilidad.' },
        { name: 'Estado', description: 'Solo las noticias activas se muestran en el inicio.' },
      ],
    },
  },

  profile: {
    en: {
      title: 'User profile',
      overview: 'View and update your own account details: name, contact info, and password.',
      steps: [
        'Review your assigned role and church (read-only for most users).',
        'Update name or phone fields and save.',
        'Change password by entering current and new passwords.',
      ],
      fields: [
        { name: 'Email', description: 'Your login email (usually read-only).' },
        { name: 'Name', description: 'Display name in the system.' },
        { name: 'Password', description: 'Must meet minimum length; confirm the new password twice.' },
      ],
    },
    es: {
      title: 'Perfil de usuario',
      overview: 'Consulte y actualice los datos de su cuenta: nombre, contacto y contraseña.',
      steps: [
        'Revise su rol e iglesia asignados (solo lectura para la mayoría).',
        'Actualice nombre o teléfono y guarde.',
        'Cambie la contraseña ingresando la actual y la nueva.',
      ],
      fields: [
        { name: 'Correo', description: 'Correo de acceso (generalmente solo lectura).' },
        { name: 'Nombre', description: 'Nombre mostrado en el sistema.' },
        { name: 'Contraseña', description: 'Debe cumplir la longitud mínima; confirme la nueva contraseña dos veces.' },
      ],
    },
  },

  labelSettings: {
    en: {
      title: 'Label settings',
      overview: 'Customize UI text labels without changing code. Overrides are stored in your browser and apply to your session.',
      steps: [
        'Search for a translation key or browse the list.',
        'Enter custom text for any label you want to rename.',
        'Save changes; reset all to restore defaults.',
      ],
      tips: [
        'Useful for adapting terminology to your union or language preference.',
        'Custom labels are per-browser, not shared with other users.',
      ],
    },
    es: {
      title: 'Configuración de etiquetas',
      overview: 'Personalice textos de la interfaz sin modificar código. Los cambios se guardan en su navegador y aplican a su sesión.',
      steps: [
        'Busque una clave de traducción o explore la lista.',
        'Ingrese texto personalizado para renombrar cualquier etiqueta.',
        'Guarde cambios; restablezca todo para volver a los valores predeterminados.',
      ],
      tips: [
        'Útil para adaptar terminología a su unión o preferencia de idioma.',
        'Las etiquetas personalizadas son por navegador, no se comparten con otros usuarios.',
      ],
    },
  },

  advancedSettings: {
    en: {
      title: 'Advanced settings',
      overview: 'Superadmin tools for language defaults, label export/import, and other system-level options.',
      steps: [
        'Switch default language for your browser session.',
        'Export or import custom label sets for backup or sharing.',
        'Review options carefully — changes affect how the UI behaves locally.',
      ],
      tips: [
        'Export labels before major customizations so you can restore them.',
      ],
    },
    es: {
      title: 'Configuración avanzada',
      overview: 'Herramientas de superadministrador para idioma predeterminado, exportar/importar etiquetas y otras opciones del sistema.',
      steps: [
        'Cambie el idioma predeterminado de su sesión en el navegador.',
        'Exporte o importe conjuntos de etiquetas para respaldo o compartir.',
        'Revise las opciones con cuidado — los cambios afectan el comportamiento local de la interfaz.',
      ],
      tips: [
        'Exporte etiquetas antes de personalizaciones grandes para poder restaurarlas.',
      ],
    },
  },

  landingCms: {
    en: {
      title: 'Landing page CMS',
      overview: 'Edit public marketing content on the login landing page: hero text, program cards, and footer sections.',
      steps: [
        'Select a section to edit (hero, programs, footer, etc.).',
        'Update titles, descriptions, and icons as needed.',
        'Save and open the public landing page in a new tab to preview.',
      ],
      fields: [
        { name: 'Section key', description: 'Identifies which block of content you are editing.' },
        { name: 'Title / text', description: 'Visible copy on the public page.' },
        { name: 'Icon', description: 'Visual identifier for program cards (Pathfinder, Adventurer, Master Guide).' },
      ],
      tips: [
        'Changes are visible to all visitors of the public site.',
      ],
    },
    es: {
      title: 'CMS de página de inicio',
      overview: 'Edite el contenido público de la página de bienvenida: texto principal, tarjetas de programas y pie de página.',
      steps: [
        'Seleccione una sección (hero, programas, pie, etc.).',
        'Actualice títulos, descripciones e iconos según necesite.',
        'Guarde y abra la página pública en otra pestaña para previsualizar.',
      ],
      fields: [
        { name: 'Clave de sección', description: 'Identifica qué bloque de contenido está editando.' },
        { name: 'Título / texto', description: 'Texto visible en la página pública.' },
        { name: 'Icono', description: 'Identificador visual para tarjetas (Conquistadores, Aventureros, Master Guide).' },
      ],
      tips: [
        'Los cambios son visibles para todos los visitantes del sitio público.',
      ],
    },
  },

  login: {
    en: {
      title: 'Sign in',
      overview: 'Enter your email and password to access the club management dashboard.',
      steps: [
        'Use the email address provided by your administrator.',
        'If you forgot your password, contact your church or union admin for a reset.',
        'After login, select your church if the system asks you to.',
      ],
      tips: [
        'The landing page describes JA Total features for visitors who are not yet logged in.',
      ],
    },
    es: {
      title: 'Iniciar sesión',
      overview: 'Ingrese su correo y contraseña para acceder al panel de gestión de clubes.',
      steps: [
        'Use el correo proporcionado por su administrador.',
        'Si olvidó su contraseña, contacte al administrador de su iglesia o unión para restablecerla.',
        'Después de iniciar sesión, seleccione su iglesia si el sistema se lo solicita.',
      ],
      tips: [
        'La página de bienvenida describe las funciones de JA Total para visitantes sin sesión.',
      ],
    },
  },

  memberPersonal: {
    en: {
      title: 'Personal data',
      overview: 'Core member information: name, birth date, contact details, address, and photo used on the ID card.',
      steps: [
        'Click Edit, fill required fields, and save.',
        'Upload a portrait photo for the carnet (recommended: face centered, good lighting).',
        'For new members, saving creates the record so other tabs become available.',
      ],
      fields: [
        { name: 'First / last names', description: 'Legal or preferred name as it should print on documents.' },
        { name: 'Birth date', description: 'Used for birthday lists on the home page.' },
        { name: 'Document ID', description: 'National ID or member number if applicable.' },
        { name: 'Phone / cell', description: 'Contact numbers for leaders and emergencies.' },
        { name: 'Photo', description: 'Displayed on the member carnet and roster exports.' },
      ],
    },
    es: {
      title: 'Datos personales',
      overview: 'Información básica del miembro: nombre, fecha de nacimiento, contacto, dirección y foto para el carnet.',
      steps: [
        'Haga clic en Editar, complete los campos requeridos y guarde.',
        'Suba una foto tipo retrato para el carnet (rostro centrado, buena luz).',
        'En miembros nuevos, al guardar se crea el registro y se habilitan otras pestañas.',
      ],
      fields: [
        { name: 'Nombres / apellidos', description: 'Nombre legal o preferido para documentos.' },
        { name: 'Fecha de nacimiento', description: 'Usada en cumpleaños del inicio.' },
        { name: 'Documento', description: 'Identificación nacional o número de miembro si aplica.' },
        { name: 'Teléfono / celular', description: 'Contacto para líderes y emergencias.' },
        { name: 'Foto', description: 'Se muestra en el carnet y exportaciones.' },
      ],
    },
  },

  memberMedical: {
    en: {
      title: 'Medical data',
      overview: 'Store health information, allergies, medications, and insurance details for club activities and trips.',
      steps: [
        'Edit the form and enter known conditions and allergies clearly.',
        'Update insurance expiry dates when renewed.',
        'Print the medical record for campouts when required by your union policy.',
      ],
      fields: [
        { name: 'Blood type', description: 'Optional but useful in emergencies.' },
        { name: 'Allergies / conditions', description: 'List anything leaders must know during activities.' },
        { name: 'Medications', description: 'Current medications and special instructions.' },
        { name: 'Insurance', description: 'Policy number and expiration for denominational or private coverage.' },
      ],
      tips: [
        'Keep this information current before each major outing.',
      ],
    },
    es: {
      title: 'Datos médicos',
      overview: 'Almacene información de salud, alergias, medicamentos y seguro para actividades y campamentos del club.',
      steps: [
        'Edite el formulario e indique claramente condiciones y alergias conocidas.',
        'Actualice fechas de vencimiento del seguro al renovar.',
        'Imprima la ficha médica para campamentos cuando lo exija su unión.',
      ],
      fields: [
        { name: 'Tipo de sangre', description: 'Opcional pero útil en emergencias.' },
        { name: 'Alergias / condiciones', description: 'Todo lo que los líderes deben conocer en actividades.' },
        { name: 'Medicamentos', description: 'Medicación actual e instrucciones especiales.' },
        { name: 'Seguro', description: 'Número de póliza y vencimiento (denominacional o privado).' },
      ],
      tips: [
        'Mantenga esta información actualizada antes de cada salida importante.',
      ],
    },
  },

  memberContacts: {
    en: {
      title: 'Emergency contacts',
      overview: 'List parents, guardians, or other contacts for the member. Used for authorization and emergencies.',
      steps: [
        'Click “Add contact” and enter name, relationship, and phone numbers.',
        'Mark primary contacts first in the list.',
        'Deactivate contacts that are no longer valid instead of deleting history.',
      ],
      fields: [
        { name: 'Name', description: 'Full name of the parent or guardian.' },
        { name: 'Relationship', description: 'Mother, father, guardian, etc.' },
        { name: 'Phone / email', description: 'Best ways to reach this contact quickly.' },
      ],
    },
    es: {
      title: 'Contactos de emergencia',
      overview: 'Liste padres, tutores u otros contactos del miembro. Se usan para autorizaciones y emergencias.',
      steps: [
        'Haga clic en “Agregar contacto” e ingrese nombre, parentesco y teléfonos.',
        'Marque primero los contactos principales en la lista.',
        'Desactive contactos que ya no sean válidos en lugar de borrar historial.',
      ],
      fields: [
        { name: 'Nombre', description: 'Nombre completo del padre, madre o tutor.' },
        { name: 'Parentesco', description: 'Madre, padre, tutor, etc.' },
        { name: 'Teléfono / correo', description: 'Medios para contactar rápidamente.' },
      ],
    },
  },

  memberSpecialties: {
    en: {
      title: 'Member honors',
      overview: 'Assign honors from the catalog and track requirement completion for this member.',
      steps: [
        'Assign an honor from the available list for the member’s clubs.',
        'Open each requirement to mark complete and record who validated it.',
        'Add comments when a requirement needs clarification.',
      ],
      fields: [
        { name: 'Honor', description: 'Selected from the global honors catalog.' },
        { name: 'Requirement status', description: 'Complete / incomplete with validation date and leader name.' },
      ],
      tips: [
        'The member must belong to a club before honors can be assigned.',
      ],
    },
    es: {
      title: 'Especialidades del miembro',
      overview: 'Asigne especialidades del catálogo y registre el cumplimiento de requisitos para este miembro.',
      steps: [
        'Asigne una especialidad de la lista disponible según los clubes del miembro.',
        'Abra cada requisito para marcarlo completo y registrar quién lo validó.',
        'Agregue comentarios cuando un requisito necesite aclaración.',
      ],
      fields: [
        { name: 'Especialidad', description: 'Seleccionada del catálogo global.' },
        { name: 'Estado del requisito', description: 'Completo / incompleto con fecha y nombre del validador.' },
      ],
      tips: [
        'El miembro debe pertenecer a un club antes de asignar especialidades.',
      ],
    },
  },

  memberClasses: {
    en: {
      title: 'Member classes',
      overview: 'Assign progressive classes and track each requirement’s completion for this member.',
      steps: [
        'Assign a class level appropriate for the member’s club type.',
        'Expand requirements and mark them complete as the member finishes activities.',
        'Use optional replacement text when a requirement is fulfilled differently.',
      ],
      fields: [
        { name: 'Class', description: 'Progressive class level (Friend, Companion, etc.).' },
        { name: 'Requirement', description: 'Individual activity from the class curriculum.' },
        { name: 'Validated by', description: 'Leader who confirmed completion.' },
      ],
    },
    es: {
      title: 'Clases del miembro',
      overview: 'Asigne clases progresivas y registre el cumplimiento de cada requisito para este miembro.',
      steps: [
        'Asigne un nivel de clase acorde al tipo de club del miembro.',
        'Expanda requisitos y márquelos completos conforme avance el miembro.',
        'Use texto alternativo cuando un requisito se cumpla de otra forma.',
      ],
      fields: [
        { name: 'Clase', description: 'Nivel progresivo (Amigo, Compañero, etc.).' },
        { name: 'Requisito', description: 'Actividad individual del currículo.' },
        { name: 'Validado por', description: 'Líder que confirmó el cumplimiento.' },
      ],
    },
  },

  memberEvents: {
    en: {
      title: 'Member events',
      overview: 'View events this member is invited to, confirmation status, and attendance history.',
      steps: [
        'Review upcoming events and confirmation state.',
        'Confirm or decline participation when required by the event.',
        'Check past attendance records for reporting.',
      ],
      fields: [
        { name: 'Confirmation', description: 'Whether the member (or parent) accepted the invitation.' },
        { name: 'Attendance', description: 'On time, late, or absent after the event date.' },
      ],
    },
    es: {
      title: 'Eventos del miembro',
      overview: 'Vea eventos a los que está invitado el miembro, estado de confirmación e historial de asistencia.',
      steps: [
        'Revise eventos próximos y estado de confirmación.',
        'Confirme o decline participación cuando el evento lo requiera.',
        'Consulte registros de asistencia pasados para informes.',
      ],
      fields: [
        { name: 'Confirmación', description: 'Si el miembro (o padre) aceptó la invitación.' },
        { name: 'Asistencia', description: 'A tiempo, tarde o ausente después de la fecha del evento.' },
      ],
    },
  },

  memberAttendance: {
    en: {
      title: 'Attendance summary',
      overview: 'Statistics and history of this member’s event attendance: totals, percentages, and recent records.',
      steps: [
        'Review summary cards for on-time, late, and absent counts.',
        'Scroll the list for event-by-event detail.',
        'Use Events page to correct a record if needed.',
      ],
      tips: [
        'QR check-in and manual roster updates both feed this summary.',
      ],
    },
    es: {
      title: 'Resumen de asistencia',
      overview: 'Estadísticas e historial de asistencia del miembro a eventos: totales, porcentajes y registros recientes.',
      steps: [
        'Revise tarjetas resumen de a tiempo, tarde y ausente.',
        'Desplácese por la lista para detalle por evento.',
        'Use la página Eventos para corregir un registro si es necesario.',
      ],
      tips: [
        'El check-in QR y la lista manual alimentan este resumen.',
      ],
    },
  },

  memberCarnet: {
    en: {
      title: 'Member ID card',
      overview: 'Preview and print the member carnet with photo, club info, and QR code for event check-in.',
      steps: [
        'Ensure personal data and photo are saved on the Personal data tab.',
        'Review the carnet preview on this tab.',
        'Use Print to generate a PDF or paper card.',
      ],
      tips: [
        'The QR code encodes a secure token linked to this member for check-in.',
        'Re-print after club changes or photo updates.',
      ],
    },
    es: {
      title: 'Carnet del miembro',
      overview: 'Previsualice e imprima el carnet con foto, datos del club y código QR para check-in en eventos.',
      steps: [
        'Asegúrese de tener datos personales y foto guardados en Datos personales.',
        'Revise la vista previa del carnet en esta pestaña.',
        'Use Imprimir para generar PDF o carnet en papel.',
      ],
      tips: [
        'El código QR contiene un token seguro vinculado al miembro para check-in.',
        'Vuelva a imprimir tras cambios de club o de foto.',
      ],
    },
  },
};

export function getPageHelpContent(pageId, language = 'es') {
  const entry = PAGE_HELP[pageId];
  if (!entry) return null;
  return entry[language] || entry.es || null;
}

export function getDefaultPageHelpContent(pageId, language = 'es') {
  return getPageHelpContent(pageId, language);
}

export function listPageHelpPages() {
  return Object.keys(PAGE_HELP).map(pageId => ({
    id: pageId,
    labelEn: PAGE_HELP[pageId]?.en?.title || pageId,
    labelEs: PAGE_HELP[pageId]?.es?.title || pageId,
  }));
}

export { PAGE_HELP };
