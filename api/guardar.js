const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ exito: false, mensaje: 'Método no permitido.' });
  }

  try {
    const datos = req.body;
    const idPartido = (datos.idPartido || '').toString().trim();
    const numero = (datos.numeroSocio || '').toString().trim();
    const dni = (datos.dni || '').toString().trim();

    if (!idPartido) {
      return res.status(200).json({ exito: false, mensaje: 'Falta el identificador del partido.' });
    }
    if (!/^\d+$/.test(numero)) {
      return res.status(200).json({ exito: false, mensaje: 'El número de socio debe ser un número entero, sin puntos ni comas.' });
    }
    if (!/^\d+$/.test(dni)) {
      return res.status(200).json({ exito: false, mensaje: 'El DNI debe ser un número entero, sin puntos ni comas.' });
    }

    // 1. Verificar que el partido siga abierto (estado manual + hora de cierre automática)
    const { data: partido, error: errPartido } = await supabase
      .from('partidos')
      .select('estado, cierra_en')
      .eq('id_partido', idPartido)
      .maybeSingle();

    if (errPartido) {
      return res.status(500).json({ exito: false, mensaje: 'Error interno: ' + errPartido.message });
    }
    if (!partido) {
      return res.status(200).json({ exito: false, mensaje: 'No encontramos ese partido.' });
    }

    const estadoManual = (partido.estado || '').trim().toLowerCase();
    const pasoLaHora = partido.cierra_en && new Date() >= new Date(partido.cierra_en);
    if (estadoManual !== 'abierto' || pasoLaHora) {
      return res.status(200).json({ exito: false, mensaje: 'La carga de asistencia para este partido ya está cerrada.' });
    }

    // 2. Verificar contra el padrón
    const { data: socio, error: errSocio } = await supabase
      .from('padron')
      .select('numero_socio')
      .eq('numero_socio', numero)
      .maybeSingle();

    if (errSocio) {
      return res.status(500).json({ exito: false, mensaje: 'Error interno: ' + errSocio.message });
    }
    if (!socio) {
      return res.status(200).json({ exito: false, mensaje: 'El número de socio no está en el padrón. Revisalo e intentá de nuevo.' });
    }

    // 3. Verificar si ya cargó antes para este partido
    const { data: existente, error: errExistente } = await supabase
      .from('respuestas')
      .select('id')
      .eq('id_partido', idPartido)
      .eq('numero_socio', numero)
      .maybeSingle();

    if (errExistente) {
      return res.status(500).json({ exito: false, mensaje: 'Error interno: ' + errExistente.message });
    }
    if (existente) {
      return res.status(200).json({ exito: false, mensaje: 'Ya registraste tu asistencia para este partido.' });
    }

    // 4. Guardar la respuesta
    const { error: errInsert } = await supabase.from('respuestas').insert({
      id_partido: idPartido,
      numero_socio: numero,
      categoria: datos.categoria || '',
      dni: dni,
      nombre_apellido: datos.nombreApellido || '',
      localidad: datos.localidad || '',
      referente: 'MARCELO FERNANDEZ',
      cumple_filtro: datos.cumpleFiltro || ''
    });

    if (errInsert) {
      return res.status(500).json({ exito: false, mensaje: 'Error interno: ' + errInsert.message });
    }

    return res.status(200).json({ exito: true, mensaje: 'Carga confirmada.' });
  } catch (err) {
    return res.status(500).json({ exito: false, mensaje: 'Error interno: ' + err.message });
  }
};
