import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { STORAGE_KEYS } from '../config/constants';
import { getJSON, setJSON } from '../lib/storage';

const CACHE_KEY = STORAGE_KEYS.UNIDADES_CACHE;
const CACHE_TTL_MS = 24 * 3600 * 1000;

// Snapshot del catálogo completo de unidades IGSS. Se usa como fallback si el
// backend no responde. Última actualización: 2026-04-28 (114 unidades).
// Para regenerar: curl https://igss.mediclic.org/sfyc/api/unidades/public.
const FALLBACK_UNIDADES = [
  { id: 1, codigo: 'CONSUL_COBAN', nombre: 'CONSULTORIO COBÁN, ALTA VERAPAZ', departamento: 'ALTA VERAPAZ', tipo: 'consultorio' },
  { id: 2, codigo: 'H_COBAN', nombre: 'HOSPITAL IGSS COBÁN, ALTA VERAPAZ', departamento: 'ALTA VERAPAZ', tipo: 'hospital' },
  { id: 3, codigo: 'CON_SALAMA', nombre: 'CONSULTORIO IGSS, SALAMÁ, BAJA VERAPAZ', departamento: 'BAJA VERAPAZ', tipo: 'consultorio' },
  { id: 4, codigo: 'H_POCHUTA', nombre: 'HOSPITAL POCHUTA, CHIMALTENANGO', departamento: 'CHIMALTENANGO', tipo: 'hospital' },
  { id: 5, codigo: 'H_CHIMALT', nombre: 'Hospital Chimaltenango IGSS', departamento: 'CHIMALTENANGO', tipo: 'hospital' },
  { id: 6, codigo: 'PS_YEPOCAPA', nombre: 'PUESTO DE SALUD DE SAN PEDRO YEPOCAPA, CHIMALTENANGO', departamento: 'CHIMALTENANGO', tipo: 'puesto_salud' },
  { id: 7, codigo: 'CONSUL_CHIQ', nombre: 'Consultorio Chiquimula', departamento: 'CHIQUIMULA', tipo: 'consultorio' },
  { id: 8, codigo: 'CON_SANARATE', nombre: 'ANEXO DEL IGSS CONSULTORIO GUASTATOYA, EN SANARATE, EL PROGRESO', departamento: 'EL PROGRESO', tipo: 'consultorio' },
  { id: 9, codigo: 'CON_GUASTATOY', nombre: 'CONSULTORIO GUASTATOYA, EL PROGRESO', departamento: 'EL PROGRESO', tipo: 'consultorio' },
  { id: 10, codigo: 'CON_DEMOCRACI', nombre: 'CONSULTORIO LA DEMOCRACIA, ESCUINTLA', departamento: 'ESCUINTLA', tipo: 'consultorio' },
  { id: 11, codigo: 'CON_MASAGUA', nombre: 'CONSULTORIO MASAGUA, ESCUINTLA', departamento: 'ESCUINTLA', tipo: 'consultorio' },
  { id: 12, codigo: 'CON_PTO_SAN_JOSE', nombre: 'CONSULTORIO PUERTO DE SAN JOSÉ, ESCUINTLA', departamento: 'ESCUINTLA', tipo: 'consultorio' },
  { id: 13, codigo: 'CON_SIQUINALA', nombre: 'CONSULTORIO SIQUINALÁ, ESCUINTLA', departamento: 'ESCUINTLA', tipo: 'consultorio' },
  { id: 14, codigo: 'CONSUL_SLCOT', nombre: 'HOSPITAL DE SANTA LUCÍA COTZUMALGUAPA, ESCUINTLA', departamento: 'ESCUINTLA', tipo: 'consultorio' },
  { id: 15, codigo: 'PERIF_TIQUI', nombre: 'HOSPITAL DE TIQUISATE, ESCUINTLA', departamento: 'ESCUINTLA', tipo: 'periferia' },
  { id: 16, codigo: 'H_ESCUINTLA', nombre: 'Hospital Escuintla IGSS', departamento: 'ESCUINTLA', tipo: 'hospital' },
  { id: 17, codigo: 'PERIF_GOMER', nombre: 'Periferia La Gomera', departamento: 'ESCUINTLA', tipo: 'periferia' },
  { id: 18, codigo: 'PERIF_PALIN', nombre: 'Periferia Palin', departamento: 'ESCUINTLA', tipo: 'periferia' },
  { id: 19, codigo: 'CAMIP_PAMPLONA', nombre: 'CAMIP - CENTRO DE ATENCIÓN MÉDICA INTEGRAL PARA PENSIONADOS', departamento: 'GUATEMALA', tipo: 'camip' },
  { id: 20, codigo: 'CAMIP_2_BARRANQ', nombre: 'CAMIP 2 BARRANQUILLA', departamento: 'GUATEMALA', tipo: 'camip' },
  { id: 21, codigo: 'CEN_SALUD_MENTAL', nombre: 'CENTRO DE ATENCIÓN INTEGRAL DE SALUD MENTAL', departamento: 'GUATEMALA', tipo: 'centro' },
  { id: 22, codigo: 'CLI_PERSONAL', nombre: 'CLÍNICA DE PERSONAL', departamento: 'GUATEMALA', tipo: 'clinica' },
  { id: 23, codigo: 'CON_STA_LEONARDA', nombre: 'CONSULTORIO FINCA SANTA LEONARDA, VILLA CANALES', departamento: 'GUATEMALA', tipo: 'consultorio' },
  { id: 24, codigo: 'CON_FRAIJANES', nombre: 'CONSULTORIO FRAIJANES, GUATEMALA', departamento: 'GUATEMALA', tipo: 'consultorio' },
  { id: 25, codigo: 'CONSUL_MIXCO', nombre: 'CONSULTORIO MIXCO, GUATEMALA', departamento: 'GUATEMALA', tipo: 'consultorio' },
  { id: 26, codigo: 'CON_PALENCIA', nombre: 'CONSULTORIO PALENCIA, GUATEMALA', departamento: 'GUATEMALA', tipo: 'consultorio' },
  { id: 27, codigo: 'CONSUL_PETAPA', nombre: 'CONSULTORIO PETAPA, GUATEMALA', departamento: 'GUATEMALA', tipo: 'consultorio' },
  { id: 28, codigo: 'CONSUL_ROOSE', nombre: 'CONSULTORIO ROOSEVELT, GUATEMALA', departamento: 'GUATEMALA', tipo: 'consultorio' },
  { id: 29, codigo: 'CON_SAN_JOSE_PIN', nombre: 'CONSULTORIO SAN JOSÉ PINULA, GUATEMALA', departamento: 'GUATEMALA', tipo: 'consultorio' },
  { id: 30, codigo: 'CON_VILLA_CANALES', nombre: 'CONSULTORIO VILLA CANALES, GUATEMALA', departamento: 'GUATEMALA', tipo: 'consultorio' },
  { id: 31, codigo: 'CONSUL_Z1', nombre: 'Consultorio Central Zona 1', departamento: 'GUATEMALA', tipo: 'consultorio' },
  { id: 32, codigo: 'CONSUL_SJSAC', nombre: 'Consultorio San Juan Sacatepequez', departamento: 'GUATEMALA', tipo: 'consultorio' },
  { id: 33, codigo: 'CONSUL_VILLAN', nombre: 'Consultorio Villa Nueva', departamento: 'GUATEMALA', tipo: 'consultorio' },
  { id: 34, codigo: 'CONSUL_Z11', nombre: 'Consultorio Zona 11', departamento: 'GUATEMALA', tipo: 'consultorio' },
  { id: 35, codigo: 'CONSUL_Z5', nombre: 'Consultorio Zona 5', departamento: 'GUATEMALA', tipo: 'consultorio' },
  { id: 36, codigo: 'H_AREVALO_BERMEJO', nombre: 'HOSPITAL GENERAL DOCTOR JUAN JOSÉ ARÉVALO BERMEJO', departamento: 'GUATEMALA', tipo: 'hospital' },
  { id: 37, codigo: 'HGE', nombre: 'Hospital General de Enfermedades IGSS', departamento: 'GUATEMALA', tipo: 'hospital' },
  { id: 38, codigo: 'GINECO', nombre: 'Hospital de Gineco-Obstetricia IGSS', departamento: 'GUATEMALA', tipo: 'hospital' },
  { id: 39, codigo: 'REHAB', nombre: 'Hospital de Rehabilitacion IGSS', departamento: 'GUATEMALA', tipo: 'hospital' },
  { id: 40, codigo: 'TRAUMA', nombre: 'Hospital de Traumatologia y Ortopedia IGSS', departamento: 'GUATEMALA', tipo: 'hospital' },
  { id: 41, codigo: 'PERIF_Z12', nombre: 'Periferia Zona 12', departamento: 'GUATEMALA', tipo: 'periferia' },
  { id: 42, codigo: 'H_AMATITLAN', nombre: 'UNIDAD ASISTENCIAL AMATITLÁN', departamento: 'GUATEMALA', tipo: 'hospital' },
  { id: 43, codigo: 'UA_AUTONOMIA', nombre: 'UNIDAD DE CONSULTA EXTERNA DE ENFERMEDADES - AUTONOMÍA', departamento: 'GUATEMALA', tipo: 'unidad_asistencial' },
  { id: 44, codigo: 'UA_GERONA_ONCO', nombre: 'UNIDAD DE CONSULTA EXTERNA DE ESPECIALIDADES - GERONA/ONCOLOGÍA', departamento: 'GUATEMALA', tipo: 'unidad_asistencial' },
  { id: 45, codigo: 'PERIF_CHINA', nombre: 'UNIDAD PERIFÉRICA CHINAUTLA', departamento: 'GUATEMALA', tipo: 'periferia' },
  { id: 46, codigo: 'PERIF_MILAG', nombre: 'UNIDAD PERIFÉRICA EL MILAGRO', departamento: 'GUATEMALA', tipo: 'periferia' },
  { id: 47, codigo: 'PERIF_PETAP', nombre: 'UNIDAD PERIFÉRICA SAN MIGUEL PETAPA', departamento: 'GUATEMALA', tipo: 'periferia' },
  { id: 48, codigo: 'PERIF_Z18', nombre: 'UNIDAD PERIFÉRICA ZONA 18', departamento: 'GUATEMALA', tipo: 'periferia' },
  { id: 49, codigo: 'PERIF_Z21', nombre: 'UNIDAD PERIFÉRICA ZONA 21 (LAS ILUSIONES)', departamento: 'GUATEMALA', tipo: 'periferia' },
  { id: 50, codigo: 'PERIF_Z7', nombre: 'UNIDAD PERIFÉRICA ZONA 7', departamento: 'GUATEMALA', tipo: 'periferia' },
  { id: 51, codigo: 'CONSUL_HUEHU', nombre: 'HOSPITAL DE HUEHUETENANGO', departamento: 'HUEHUETENANGO', tipo: 'consultorio' },
  { id: 52, codigo: 'UI_DEMOCRACI', nombre: 'UNIDAD INTEGRAL DE LA DEMOCRACIA, HUEHUETENANGO', departamento: 'HUEHUETENANGO', tipo: 'unidad_integral' },
  { id: 53, codigo: 'UI_SAN_ANT_HUISTA', nombre: 'UNIDAD INTEGRAL DE SAN ANTONIO HUISTA, HUEHUETENANGO', departamento: 'HUEHUETENANGO', tipo: 'unidad_integral' },
  { id: 54, codigo: 'UI_IXTAHUACAN', nombre: 'UNIDAD INTEGRAL DE SAN ILDEFONSO IXTAHUACÁN, HUEHUETENANGO', departamento: 'HUEHUETENANGO', tipo: 'unidad_integral' },
  { id: 55, codigo: 'UI_SAN_PEDRO_NECTA', nombre: 'UNIDAD INTEGRAL DE SAN PEDRO NECTÁ, HUEHUETENANGO', departamento: 'HUEHUETENANGO', tipo: 'unidad_integral' },
  { id: 56, codigo: 'UI_SANTA_CRUZ_BARILL', nombre: 'UNIDAD INTEGRAL DE SANTA CRUZ BARILLAS, HUEHUETENANGO', departamento: 'HUEHUETENANGO', tipo: 'unidad_integral' },
  { id: 57, codigo: 'CON_ESTOR', nombre: 'CONSULTORIO EL ESTOR, IZABAL', departamento: 'IZABAL', tipo: 'consultorio' },
  { id: 58, codigo: 'CON_AMATES', nombre: 'CONSULTORIO LOS AMATES, IZABAL', departamento: 'IZABAL', tipo: 'consultorio' },
  { id: 59, codigo: 'CON_MORALES', nombre: 'CONSULTORIO MORALES, IZABAL', departamento: 'IZABAL', tipo: 'consultorio' },
  { id: 60, codigo: 'CONSUL_PBARR', nombre: 'HOSPITAL PUERTO BARRIOS, IZABAL', departamento: 'IZABAL', tipo: 'consultorio' },
  { id: 61, codigo: 'CONSUL_JALAP', nombre: 'Consultorio Jalapa', departamento: 'JALAPA', tipo: 'consultorio' },
  { id: 62, codigo: 'H_JALAPA', nombre: 'HOSPITAL IGSS JALAPA', departamento: 'JALAPA', tipo: 'hospital' },
  { id: 63, codigo: 'CONSUL_JUTIA', nombre: 'Consultorio Jutiapa', departamento: 'JUTIAPA', tipo: 'consultorio' },
  { id: 64, codigo: 'UI_ASUNCION_MITA', nombre: 'UNIDAD INTEGRAL DE ASUNCIÓN MITA, JUTIAPA', departamento: 'JUTIAPA', tipo: 'unidad_integral' },
  { id: 65, codigo: 'UIA_MOYUTA', nombre: 'UNIDAD INTEGRAL DE MOYUTA, JUTIAPA', departamento: 'JUTIAPA', tipo: 'uia' },
  { id: 66, codigo: 'CEN_SAYAXCHE', nombre: 'CENTRO DE ATENCIÓN MÉDICA SAYAXCHÉ', departamento: 'PETEN', tipo: 'centro' },
  { id: 67, codigo: 'CON_LIBERTAD', nombre: 'CONSULTORIO LA LIBERTAD, PETÉN', departamento: 'PETEN', tipo: 'consultorio' },
  { id: 68, codigo: 'CON_POPTUN', nombre: 'CONSULTORIO POPTÚN, PETÉN', departamento: 'PETEN', tipo: 'consultorio' },
  { id: 69, codigo: 'H_POPTUN', nombre: 'CONSULTORIO POPTÚN, PETÉN', departamento: 'PETEN', tipo: 'consultorio' },
  { id: 70, codigo: 'CON_SAYAXCHE', nombre: 'CONSULTORIO SAYAXCHÉ, PETÉN', departamento: 'PETEN', tipo: 'consultorio' },
  { id: 71, codigo: 'H_SANBENITO', nombre: 'SALA ANEXA HOSPITAL NACIONAL SAN BENITO, PETÉN', departamento: 'PETEN', tipo: 'hospital' },
  { id: 72, codigo: 'CAMIP_3_ZUNIL', nombre: 'CAMIP 3 ZUNIL', departamento: 'QUETZALTENANGO', tipo: 'camip' },
  { id: 73, codigo: 'CONSUL_QUETZ', nombre: 'CONSULTORIO QUETZALTENANGO, QUETZALTENANGO', departamento: 'QUETZALTENANGO', tipo: 'consultorio' },
  { id: 74, codigo: 'H_COLOMBA_COSTA_CUC', nombre: 'HOSPITAL COLOMBA COSTA CUCA, QUETZALTENANGO', departamento: 'QUETZALTENANGO', tipo: 'hospital' },
  { id: 75, codigo: 'H_QUETZALTE', nombre: 'HOSPITAL GENERAL DE QUETZALTENANGO', departamento: 'QUETZALTENANGO', tipo: 'hospital' },
  { id: 76, codigo: 'CONSUL_COATE', nombre: 'HOSPITAL IGSS COATEPEQUE, QUETZALTENANGO', departamento: 'QUETZALTENANGO', tipo: 'consultorio' },
  { id: 77, codigo: 'CON_NEBAJ', nombre: 'CONSULTORIO NEBAJ, QUICHÉ', departamento: 'QUICHE', tipo: 'consultorio' },
  { id: 78, codigo: 'CON_SAN_JUAN_COTZAL', nombre: 'CONSULTORIO SAN JUAN COTZAL, QUICHÉ', departamento: 'QUICHE', tipo: 'consultorio' },
  { id: 79, codigo: 'CON_SANTA_CRUZ', nombre: 'CONSULTORIO SANTA CRUZ DEL QUICHÉ, QUICHÉ', departamento: 'QUICHE', tipo: 'consultorio' },
  { id: 80, codigo: 'PS_COTZAL', nombre: 'PUESTO DE SALUD DE SAN FRANCISCO COTZAL, QUICHÉ', departamento: 'QUICHE', tipo: 'puesto_salud' },
  { id: 81, codigo: 'CON_SAN_FELIPE', nombre: 'CONSULTORIO SAN FELIPE, RETALHULEU', departamento: 'RETALHULEU', tipo: 'consultorio' },
  { id: 82, codigo: 'CONSUL_RETAL', nombre: 'HOSPITAL RETALHULEU, RETALHULEU', departamento: 'RETALHULEU', tipo: 'consultorio' },
  { id: 83, codigo: 'PERIF_CHAMP', nombre: 'Periferia Champerico', departamento: 'RETALHULEU', tipo: 'periferia' },
  { id: 84, codigo: 'CONSUL_ANTIG', nombre: 'Consultorio Antigua Guatemala', departamento: 'SACATEPEQUEZ', tipo: 'consultorio' },
  { id: 85, codigo: 'H_ANTIGUA_GUATEMALA', nombre: 'HOSPITAL DE ANTIGUA GUATEMALA, SACATEPÉQUEZ', departamento: 'SACATEPEQUEZ', tipo: 'hospital' },
  { id: 86, codigo: 'CON_TECUN_UMAN', nombre: 'CONSULTORIO DE TECÚN UMÁN, SAN MARCOS', departamento: 'SAN MARCOS', tipo: 'consultorio' },
  { id: 87, codigo: 'CONSUL_SMARC', nombre: 'Consultorio San Marcos', departamento: 'SAN MARCOS', tipo: 'consultorio' },
  { id: 88, codigo: 'H_TUMBADOR', nombre: 'HOSPITAL EL TUMBADOR, SAN MARCOS', departamento: 'SAN MARCOS', tipo: 'hospital' },
  { id: 89, codigo: 'H_MALACATAN', nombre: 'HOSPITAL MALACATÁN, SAN MARCOS', departamento: 'SAN MARCOS', tipo: 'hospital' },
  { id: 90, codigo: 'UI_QUETZAL', nombre: 'UNIDAD INTEGRAL DE EL QUETZAL, SAN MARCOS', departamento: 'SAN MARCOS', tipo: 'unidad_integral' },
  { id: 91, codigo: 'UI_IXCHIGUAN', nombre: 'UNIDAD INTEGRAL DE IXCHIGUÁN, SAN MARCOS', departamento: 'SAN MARCOS', tipo: 'unidad_integral' },
  { id: 92, codigo: 'UI_REFORMA', nombre: 'UNIDAD INTEGRAL DE LA REFORMA, SAN MARCOS', departamento: 'SAN MARCOS', tipo: 'unidad_integral' },
  { id: 93, codigo: 'UI_NUEVO_PROGRESO', nombre: 'UNIDAD INTEGRAL DE NUEVO PROGRESO, SAN MARCOS', departamento: 'SAN MARCOS', tipo: 'unidad_integral' },
  { id: 94, codigo: 'UI_SPS_SMARCOS', nombre: 'UNIDAD INTEGRAL DE SAN PEDRO SACATEPÉQUEZ, SAN MARCOS', departamento: 'SAN MARCOS', tipo: 'unidad_integral' },
  { id: 95, codigo: 'UI_SAN_RAFAEL', nombre: 'UNIDAD INTEGRAL DE SAN RAFAEL PIE DE LA CUESTA, SAN MARCOS', departamento: 'SAN MARCOS', tipo: 'unidad_integral' },
  { id: 96, codigo: 'UI_TEJUTLA', nombre: 'UNIDAD INTEGRAL DE TEJUTLA, SAN MARCOS', departamento: 'SAN MARCOS', tipo: 'unidad_integral' },
  { id: 97, codigo: 'CON_GUAZACAPA', nombre: 'CONSULTORIO GUAZACAPÁN, SANTA ROSA', departamento: 'SANTA ROSA', tipo: 'consultorio' },
  { id: 98, codigo: 'CONSUL_CUILA', nombre: 'HOSPITAL DE CUILAPA, SANTA ROSA', departamento: 'SANTA ROSA', tipo: 'consultorio' },
  { id: 99, codigo: 'PS_PUEBLO_NUEVO_VINA', nombre: 'PUESTO DE SALUD PUEBLO NUEVO VIÑAS, SANTA ROSA', departamento: 'SANTA ROSA', tipo: 'puesto_salud' },
  { id: 100, codigo: 'CON_SAN_LUCAS_TOLIMAN', nombre: 'CONSULTORIO SAN LUCAS TOLIMÁN, SOLOLÁ', departamento: 'SOLOLA', tipo: 'consultorio' },
  { id: 101, codigo: 'CON_SOLOLA', nombre: 'CONSULTORIO Y SALA ANEXA DEL HOSPITAL NACIONAL DE SOLOLÁ', departamento: 'SOLOLA', tipo: 'consultorio' },
  { id: 102, codigo: 'H_CHICACAO', nombre: 'HOSPITAL CHICACAO, SUCHITEPÉQUEZ', departamento: 'SUCHITEPEQUEZ', tipo: 'hospital' },
  { id: 103, codigo: 'H_PATULUL', nombre: 'HOSPITAL PATULUL, SUCHITEPÉQUEZ', departamento: 'SUCHITEPEQUEZ', tipo: 'hospital' },
  { id: 104, codigo: 'UI_CUYOTENAN', nombre: 'UNIDAD INTEGRAL DE CUYOTENANGO, SUCHITEPÉQUEZ', departamento: 'SUCHITEPEQUEZ', tipo: 'unidad_integral' },
  { id: 105, codigo: 'UI_RIO_BRAVO', nombre: 'UNIDAD INTEGRAL DE RÍO BRAVO, SUCHITEPÉQUEZ', departamento: 'SUCHITEPEQUEZ', tipo: 'unidad_integral' },
  { id: 106, codigo: 'UI_SAN_ANTONIO', nombre: 'UNIDAD INTEGRAL DE SAN ANTONIO, SUCHITEPÉQUEZ', departamento: 'SUCHITEPEQUEZ', tipo: 'unidad_integral' },
  { id: 107, codigo: 'UI_ZAPOTITLAN', nombre: 'UNIDAD INTEGRAL DE SAN FRANCISCO ZAPOTITLÁN, SUCHITEPÉQUEZ', departamento: 'SUCHITEPEQUEZ', tipo: 'unidad_integral' },
  { id: 108, codigo: 'UI_SAN_JOSE_IDOLO', nombre: 'UNIDAD INTEGRAL DE SAN JOSÉ EL ÍDOLO, SUCHITEPÉQUEZ', departamento: 'SUCHITEPEQUEZ', tipo: 'unidad_integral' },
  { id: 109, codigo: 'UI_SANTA_BARBARA', nombre: 'UNIDAD INTEGRAL DE SANTA BÁRBARA, SUCHITEPÉQUEZ', departamento: 'SUCHITEPEQUEZ', tipo: 'unidad_integral' },
  { id: 110, codigo: 'UI_SANTO_DOMINGO', nombre: 'UNIDAD INTEGRAL DE SANTO DOMINGO, SUCHITEPÉQUEZ', departamento: 'SUCHITEPEQUEZ', tipo: 'unidad_integral' },
  { id: 111, codigo: 'CONSUL_MAZAT', nombre: 'HOSPITAL DE MAZATENANGO, SUCHITEPÉQUEZ', departamento: 'SUCHITEPÉQUEZ', tipo: 'consultorio' },
  { id: 112, codigo: 'CON_TOTONICAP', nombre: 'CONSULTORIO TOTONICAPÁN, TOTONICAPÁN', departamento: 'TOTONICAPAN', tipo: 'consultorio' },
  { id: 113, codigo: 'CON_GUALAN', nombre: 'CONSULTORIO GUALÁN, ZACAPA', departamento: 'ZACAPA', tipo: 'consultorio' },
  { id: 114, codigo: 'CONSUL_ZACAP', nombre: 'Consultorio Zacapa', departamento: 'ZACAPA', tipo: 'consultorio' },
];

export function useUnidadesPublic() {
  const [unidades, setUnidades] = useState(() => {
    const cached = getJSON(CACHE_KEY, null);
    if (cached && cached.ts && Date.now() - cached.ts < CACHE_TTL_MS && Array.isArray(cached.data)) {
      return cached.data;
    }
    return null;
  });
  const [loading, setLoading] = useState(unidades === null);
  const [error, setError] = useState(null);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    let alive = true;

    // Si ya tenemos cache fresco, no refetch.
    const cached = getJSON(CACHE_KEY, null);
    if (cached && cached.ts && Date.now() - cached.ts < CACHE_TTL_MS) {
      setUnidades(cached.data);
      setLoading(false);
      return () => {
        alive = false;
      };
    }

    (async () => {
      try {
        const res = await api.get('/api/unidades/public', { auth: false });
        const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (!alive) return;
        if (data.length === 0) {
          throw new Error('Catalogo vacio');
        }
        setUnidades(data);
        setJSON(CACHE_KEY, { ts: Date.now(), data });
        setError(null);
      } catch (err) {
        if (!alive) return;
        setError(err);
        setUnidades(FALLBACK_UNIDADES);
        setUsedFallback(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { unidades: unidades || [], loading, error, usedFallback };
}
