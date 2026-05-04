// Schema de la encuesta de satisfacción SFyC IGSS.
// Los nombres de campo coinciden EXACTO con las columnas del backend
// (ver doc 01 §2.3 EncuestaCreate y §3.2).

export const ITEMS_18 = [
  { field: 'item_01_tiempo_espera', text: 'El tiempo de espera fue adecuado' },
  { field: 'item_02_personal_amable', text: 'El personal es amable y respetuoso' },
  { field: 'item_03_respeto_privacidad', text: 'Respetaron mi privacidad' },
  { field: 'item_04_interes_problema', text: 'Demostraron interés por mi problema' },
  {
    field: 'item_05_examen_interrogatorio',
    text: 'Me examinaron e interrogaron para conocer más sobre mi situación de salud',
  },
  { field: 'item_06_explicacion_problema', text: 'Me explicaron el problema de salud que presento' },
  {
    field: 'item_07_info_tratamiento',
    text: 'Me brindaron información comprensible sobre cómo tratar mi problema de salud',
  },
  { field: 'item_08_escuchar_dudas', text: 'Escucharon y aclararon mis dudas' },
  {
    field: 'item_09_indicaciones_no_mejora',
    text: 'Me dieron indicaciones claras sobre qué hacer si no mejoro',
  },
  { field: 'item_10_limpieza_clinica', text: 'La clínica es limpia y cómoda' },
  { field: 'item_11_entrega_medicamentos', text: 'Me entregaron todos los medicamentos necesarios' },
  {
    field: 'item_12_explicacion_medicamentos',
    text: 'Me explicaron adecuadamente cómo tomar los medicamentos',
  },
  {
    field: 'item_13_otros_problemas_salud',
    text: 'Se exploraron otros problemas de salud además del motivo de consulta',
  },
  { field: 'item_14_explica_sfyc', text: 'Me explicaron la estrategia de salud familiar y comunitaria' },
  { field: 'item_15_regresar_control', text: 'Me indicaron cuándo debo regresar a control' },
  { field: 'item_16_conoce_medico_asignado', text: 'Conozco quién es mi médico asignado' },
  { field: 'item_17_satisfaccion_general', text: 'Estoy satisfecho con la atención recibida' },
  { field: 'item_18_recomendaria', text: 'Recomendaría esta clínica' },
];

export const PROFESIONALES_6 = [
  { field: 'prof_seguridad', label: 'Seguridad' },
  { field: 'prof_admision', label: 'Admisión' },
  { field: 'prof_enfermeria', label: 'Enfermería' },
  { field: 'prof_medico', label: 'Médico' },
  { field: 'prof_farmacia', label: 'Farmacia' },
  { field: 'prof_trabajo_social', label: 'Trabajo social' },
];

// Escala 1-4 para profesionales (4 = No aplica).
export const ESCALA_PROFESIONAL = [
  { value: 1, label: 'Debe mejorar', color: 'bg-red-500', textColor: 'text-white' },
  { value: 2, label: 'Aceptable', color: 'bg-yellow-500', textColor: 'text-white' },
  { value: 3, label: 'Buena', color: 'bg-green-600', textColor: 'text-white' },
  { value: 4, label: 'No aplica', color: 'bg-gray-400', textColor: 'text-white' },
];

// Escala 1-5 para los 18 items (likert).
export const ESCALA_LIKERT_5 = [
  { value: 1, label: 'Necesita mejorar', color: 'bg-red-500', ring: 'ring-red-700' },
  { value: 2, label: 'Aceptable', color: 'bg-orange-500', ring: 'ring-orange-700' },
  { value: 3, label: 'Bueno', color: 'bg-yellow-500', ring: 'ring-yellow-700' },
  { value: 4, label: 'Muy bueno', color: 'bg-blue-500', ring: 'ring-blue-700' },
  { value: 5, label: 'Excelente', color: 'bg-green-600', ring: 'ring-green-800' },
];
