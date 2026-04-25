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
    yes: 'Si',
    no: 'No',
    error: 'Ha ocurrido un error',
    retry: 'Reintentar',
    required: 'Obligatorio',
  },
  auth: {
    login: 'Iniciar sesion',
    logout: 'Cerrar sesion',
    username: 'Usuario',
    password: 'Contrasena',
    invalidCredentials: 'Credenciales invalidas',
    sessionExpired: 'Su sesion ha expirado, vuelva a iniciar sesion',
  },
  encuesta: {
    title: 'Encuesta de Satisfaccion',
    subtitle: 'Clinicas de Salud Familiar y Comunitaria',
    intro:
      'Su opinion nos ayuda a mejorar la atencion. La encuesta es anonima y toma alrededor de 3 minutos.',
    selectUnidad: 'Seleccione la unidad o clinica',
    numeroClinica: 'Numero de clinica',
    nombreMedico: 'Nombre del medico',
    instrucciones: 'Marque la opcion que mejor refleje su experiencia.',
    escala: '1=Necesita mejorar · 2=Aceptable · 3=Bueno · 4=Muy bueno · 5=Excelente',
    seccionAtencion: 'Sobre la atencion que recibio',
    seccionProfesionales: 'Como fue la atencion de los profesionales?',
    seccionMejoras: 'Como podemos mejorar?',
    placeholderMejoras: '(Opcional) Sus sugerencias nos ayudan a mejorar...',
    btnEnviar: 'Enviar respuestas',
    btnEnviando: 'Enviando...',
    offlineWarning:
      'Sin conexion a internet. Su encuesta se guardara localmente y se enviara al reconectar.',
    grxTitle: 'Gracias por su tiempo',
    grxSubtitle: 'Su respuesta ha sido registrada.',
    grxOffline: 'Su respuesta se guardo localmente y se enviara cuando vuelva la conexion.',
    grxNueva: 'Llenar otra encuesta',
    grxVolver: 'Volver al inicio',
  },
  validation: {
    fieldRequired: 'Este campo es obligatorio',
    selectUnit: 'Seleccione una unidad',
    invalidEmail: 'Email invalido',
    invalidPhone: 'Telefono invalido',
    invalidCui: 'CUI guatemalteco invalido (debe ser 13 digitos)',
  },
};

export default M;
