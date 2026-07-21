// Strings ES centralizados — facilita futuro i18n.
// El usuario final solo ve castellano por ahora.

export const M = {
  common: {
    loading: 'Cargando...',
    save: 'Guardar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    back: 'Volver',
    next: 'Siguiente',
    prev: 'Anterior',
    submit: 'Enviar',
    close: 'Cerrar',
    yes: 'Sí',
    no: 'No',
    error: 'Ha ocurrido un error',
    retry: 'Reintentar',
    required: 'Obligatorio',
  },
  auth: {
    login: 'Iniciar sesión',
    logout: 'Cerrar sesión',
    username: 'Usuario',
    password: 'Contraseña', // pragma: allowlist secret — etiqueta de interfaz
    invalidCredentials: 'Credenciales inválidas',
    sessionExpired: 'Su sesión ha expirado, vuelva a iniciar sesión',
  },
  encuesta: {
    title: 'Encuesta de Satisfacción',
    subtitle: 'Clínicas de Salud Familiar y Comunitaria',
    intro:
      'Su opinión nos ayuda a mejorar la atención. La encuesta es anónima y toma alrededor de 3 minutos.',
    selectUnidad: 'Seleccione la unidad o clínica',
    numeroClinica: 'Número de clínica',
    nombreMedico: 'Nombre del médico',
    instrucciones: 'Marque la opción que mejor refleje su experiencia.',
    escala: '1=Necesita mejorar · 2=Aceptable · 3=Bueno · 4=Muy bueno · 5=Excelente',
    seccionAtencion: 'Sobre la atención que recibió',
    seccionProfesionales: '¿Cómo fue la atención de los profesionales?',
    seccionMejoras: '¿Cómo podemos mejorar?',
    placeholderMejoras: '(Opcional) Sus sugerencias nos ayudan a mejorar...',
    btnEnviar: 'Enviar respuestas',
    btnEnviando: 'Enviando...',
    offlineWarning:
      'Sin conexión a internet. Su encuesta se guardará localmente y se enviará al reconectar.',
    grxTitle: 'Gracias por su tiempo',
    grxSubtitle: 'Su respuesta ha sido registrada.',
    grxOffline: 'Su respuesta se guardó localmente y se enviará cuando vuelva la conexión.',
    grxNueva: 'Llenar otra encuesta',
    grxVolver: 'Volver al inicio',
  },
  validation: {
    fieldRequired: 'Este campo es obligatorio',
    selectUnit: 'Seleccione una unidad',
    invalidEmail: 'Correo electrónico inválido',
    invalidPhone: 'Teléfono inválido',
    invalidCui: 'CUI guatemalteco inválido (debe ser 13 dígitos)',
  },
};

export default M;
